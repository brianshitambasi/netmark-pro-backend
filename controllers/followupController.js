const Followup = require('../models/Followup');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const moment = require('moment');

// @desc    Create new followup
exports.createFollowup = async (req, res) => {
  try {
    const {
      name, phone, email, category, nextCallDate,
      notes, source, interestLevel, preferredContactTime,
      totalAmount, packageName, packagePrice
    } = req.body;

    const followup = new Followup({
      name, phone, email, category: category || 'warm', nextCallDate, notes,
      source: source || 'other', interestLevel: interestLevel || 5,
      preferredContactTime: preferredContactTime || 'any',
      totalAmount: totalAmount || 0, packageName: packageName || '',
      packagePrice: packagePrice || 0, createdBy: req.user.id
    });

    await followup.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.totalFollowups': 1 } });

    const task = new Task({
      title: `Follow up with ${name}`, description: notes || `Call ${name} for follow-up`,
      type: 'followup', dueDate: nextCallDate,
      relatedTo: { model: 'followup', id: followup._id }, createdBy: req.user.id
    });
    await task.save();

    res.status(201).json({ success: true, data: followup, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all followups
exports.getFollowups = async (req, res) => {
  try {
    const { status, category, date, search, paymentStatus, accountStatus,
      page = 1, limit = 50, sortBy = 'nextCallDate', sortOrder = 'asc' } = req.query;

    let query = { createdBy: req.user.id };
    if (status) query.status = status;
    if (category) query.category = category;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (accountStatus) query.accountStatus = accountStatus;
    
    if (date === 'today') {
      const today = moment().startOf('day');
      const tomorrow = moment().endOf('day');
      query.nextCallDate = { $gte: today, $lte: tomorrow };
    }
    if (date === 'overdue') {
      query.nextCallDate = { $lt: new Date() };
      query.status = { $in: ['pending', 'followed'] };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const followups = await Followup.find(query).sort(sort).limit(limit * 1).skip((page - 1) * limit);
    const total = await Followup.countDocuments(query);

    const summary = {
      total: await Followup.countDocuments({ createdBy: req.user.id }),
      pending: await Followup.countDocuments({ createdBy: req.user.id, status: 'pending' }),
      followed: await Followup.countDocuments({ createdBy: req.user.id, status: 'followed' }),
      converted: await Followup.countDocuments({ createdBy: req.user.id, status: 'converted' }),
      missed: await Followup.countDocuments({ createdBy: req.user.id, status: 'missed' }),
      paid: await Followup.countDocuments({ createdBy: req.user.id, paymentStatus: 'paid' }),
      partial: await Followup.countDocuments({ createdBy: req.user.id, paymentStatus: 'partial' }),
      totalRevenue: await Followup.aggregate([
        { $match: { createdBy: req.user.id } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ])
    };

    res.json({ success: true, data: followups, summary, pagination: { page: parseInt(page), pages: Math.ceil(total / limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add payment to followup
exports.addPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, notes } = req.body;
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({ success: false, message: 'Followup not found' });
    }
    
    const paymentAmount = parseFloat(amount);
    followup.payments = followup.payments || [];
    followup.payments.push({
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'mpesa',
      transactionId: transactionId || '',
      notes: notes || ''
    });
    
    followup.amountPaid = (followup.amountPaid || 0) + paymentAmount;
    followup.remainingBalance = (followup.totalAmount || 0) - followup.amountPaid;
    
    if (followup.remainingBalance <= 0) {
      followup.paymentStatus = 'paid';
    } else if (followup.amountPaid > 0) {
      followup.paymentStatus = 'partial';
    }
    
    followup.followupHistory = followup.followupHistory || [];
    followup.followupHistory.push({
      action: 'payment_made',
      notes: `Payment of ${amount} received via ${paymentMethod}`,
      previousValue: followup.amountPaid - amount,
      newValue: followup.amountPaid
    });
    
    await followup.save();
    
    res.json({ success: true, data: followup, message: `Payment of ${amount} recorded successfully` });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Open account for prospect
exports.openAccount = async (req, res) => {
  try {
    const { accountNumber, packageName, totalAmount } = req.body;
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({ success: false, message: 'Followup not found' });
    }
    
    followup.accountOpened = true;
    followup.accountOpenedDate = new Date();
    followup.accountNumber = accountNumber || `NET-${Date.now()}`;
    followup.packageName = packageName || followup.packageName;
    if (totalAmount) followup.totalAmount = parseFloat(totalAmount);
    followup.accountStatus = 'in_progress';
    followup.status = 'converted';
    
    followup.followupHistory.push({
      action: 'account_opened',
      notes: `Account opened with number ${followup.accountNumber}`,
      previousValue: false,
      newValue: true
    });
    
    await followup.save();
    
    res.json({ success: true, data: followup, message: `Account opened for ${followup.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update payment details
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { totalAmount, paymentPlan } = req.body;
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({ success: false, message: 'Followup not found' });
    }
    
    if (totalAmount !== undefined) {
      followup.totalAmount = parseFloat(totalAmount);
      followup.remainingBalance = followup.totalAmount - (followup.amountPaid || 0);
    }
    if (paymentPlan) followup.paymentPlan = paymentPlan;
    
    if (followup.remainingBalance <= 0) {
      followup.paymentStatus = 'paid';
    } else if (followup.amountPaid > 0) {
      followup.paymentStatus = 'partial';
    }
    
    await followup.save();
    res.json({ success: true, data: followup, message: 'Payment details updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single followup
exports.getFollowupById = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, message: 'Followup not found' });
    res.json({ success: true, data: followup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reschedule follow-up date
exports.rescheduleFollowup = async (req, res) => {
  try {
    const { nextCallDate, reason, daysToAdd } = req.body;
    const followup = await Followup.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, message: 'Followup not found' });
    
    const oldDate = followup.nextCallDate;
    let newDate;
    if (daysToAdd) newDate = moment(followup.nextCallDate).add(daysToAdd, 'days').toDate();
    else if (nextCallDate) newDate = new Date(nextCallDate);
    else return res.status(400).json({ success: false, message: 'Please provide either nextCallDate or daysToAdd' });
    
    followup.nextCallDate = newDate;
    followup.followupHistory.push({
      action: 'rescheduled',
      notes: reason || `Follow-up rescheduled from ${moment(oldDate).format('YYYY-MM-DD')} to ${moment(newDate).format('YYYY-MM-DD')}`,
      previousValue: oldDate, newValue: newDate
    });
    
    await followup.save();
    res.json({ success: true, data: followup, message: `Follow-up rescheduled to ${moment(newDate).format('YYYY-MM-DD')}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick reschedule
exports.quickReschedule = async (req, res) => {
  try {
    const { option } = req.body;
    const followup = await Followup.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, message: 'Followup not found' });
    
    const daysMap = { 'tomorrow': 1, 'in_3_days': 3, 'in_1_week': 7, 'in_2_weeks': 14, 'in_1_month': 30 };
    const daysToAdd = daysMap[option];
    if (!daysToAdd) return res.status(400).json({ success: false, message: 'Invalid reschedule option' });
    
    const oldDate = followup.nextCallDate;
    const newDate = moment(followup.nextCallDate).add(daysToAdd, 'days').toDate();
    
    followup.nextCallDate = newDate;
    followup.followupHistory.push({
      action: 'rescheduled',
      notes: `Quick reschedule: ${option}`,
      previousValue: oldDate, newValue: newDate
    });
    
    await followup.save();
    res.json({ success: true, data: followup, message: `Follow-up rescheduled to ${moment(newDate).format('YYYY-MM-DD')}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    WhatsApp click
exports.whatsappClick = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, message: 'Followup not found' });
    
    followup.whatsappClicked = true;
    followup.whatsappClickedAt = new Date();
    followup.followupHistory.push({ action: 'whatsapp_click', notes: `WhatsApp button clicked at ${new Date().toLocaleString()}` });
    await followup.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.totalWhatsAppClicks': 1 } });
    
    res.json({ success: true, data: followup, whatsappLink: `https://wa.me/${followup.phone}`, message: `Click to message ${followup.name} on WhatsApp` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark as followed
exports.markFollowed = async (req, res) => {
  try {
    const { notes, autoReschedule, rescheduleDays } = req.body;
    const followup = await Followup.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, message: 'Followup not found' });
    
    const oldStatus = followup.status;
    followup.status = 'followed';
    followup.followedAt = new Date();
    followup.followupCount += 1;
    if (notes) followup.lastConversation = notes;
    
    followup.followupHistory.push({
      action: 'marked_followed',
      notes: `Follow-up #${followup.followupCount} completed`,
      previousValue: oldStatus, newValue: 'followed'
    });
    await followup.save();
    
    await Task.findOneAndUpdate({ 'relatedTo.id': followup._id, status: 'pending' }, { status: 'completed', completedAt: new Date() });
    
    let nextFollowup = null;
    if (autoReschedule && rescheduleDays) {
      const newDate = moment().add(rescheduleDays, 'days').toDate();
      nextFollowup = await Followup.findByIdAndUpdate(followup._id, { nextCallDate: newDate, status: 'pending' }, { new: true });
      const newTask = new Task({
        title: `Follow up with ${followup.name}`, description: `Next follow-up after ${rescheduleDays} days`,
        type: 'followup', dueDate: newDate, relatedTo: { model: 'followup', id: followup._id }, createdBy: req.user.id
      });
      await newTask.save();
    }
    
    res.json({ success: true, data: followup, nextFollowup, message: `Marked ${followup.name} as followed` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Convert to customer/team member
exports.convertFollowup = async (req, res) => {
  try {
    const { conversionType, conversionValue, salesAmount, products, notes } = req.body;
    const followup = await Followup.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, message: 'Followup not found' });
    
    const oldStatus = followup.status;
    followup.status = 'converted';
    followup.category = 'converted';
    followup.convertedAt = new Date();
    followup.conversionType = conversionType || 'customer';
    followup.conversionValue = conversionValue || 0;
    followup.salesAmount = salesAmount || 0;
    if (products) followup.products = products;
    
    followup.followupHistory.push({
      action: 'converted', notes: notes || `Lead converted to ${conversionType || 'customer'}`,
      previousValue: oldStatus, newValue: 'converted'
    });
    await followup.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.totalConversions': 1, 'stats.totalSales': salesAmount || 0 } });
    
    res.json({ success: true, data: followup, message: `í¾‰ ${followup.name} converted successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update followup
exports.updateFollowup = async (req, res) => {
  try {
    const updated = await Followup.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete followup
exports.deleteFollowup = async (req, res) => {
  try {
    await Followup.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = moment().startOf(period);
    
    const stats = await Followup.aggregate([
      { $match: { createdBy: req.user.id, createdAt: { $gte: startDate.toDate() } } },
      { $group: {
          _id: null,
          totalFollowups: { $sum: 1 },
          totalConversions: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
          totalRevenue: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: '$remainingBalance' },
          averageFollowupCount: { $avg: '$followupCount' }
        }
      }
    ]);
    
    const conversionRate = stats[0]?.totalFollowups > 0 ? (stats[0].totalConversions / stats[0].totalFollowups) * 100 : 0;
    
    res.json({ success: true, data: { period, ...stats[0], conversionRate: conversionRate.toFixed(2) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
