const Followup = require('../models/Followup');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const moment = require('moment');

// @desc    Create new followup
// @route   POST /api/followups
exports.createFollowup = async (req, res) => {
  try {
    const {
      name, phone, email, category, nextCallDate,
      notes, source, interestLevel, preferredContactTime
    } = req.body;

    const followup = new Followup({
      name,
      phone,
      email,
      category: category || 'warm',
      nextCallDate,
      notes,
      source: source || 'other',
      interestLevel: interestLevel || 5,
      preferredContactTime: preferredContactTime || 'any',
      createdBy: req.user.id
    });

    await followup.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalFollowups': 1 }
    });

    // Create task for this followup
    const task = new Task({
      title: `Follow up with ${name}`,
      description: notes || `Call ${name} for follow-up`,
      type: 'followup',
      dueDate: nextCallDate,
      relatedTo: { model: 'followup', id: followup._id },
      createdBy: req.user.id
    });
    await task.save();

    res.status(201).json({
      success: true,
      data: followup,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all followups with filters
// @route   GET /api/followups
exports.getFollowups = async (req, res) => {
  try {
    const {
      status, category, date, search,
      page = 1, limit = 50, sortBy = 'nextCallDate',
      sortOrder = 'asc'
    } = req.query;

    let query = { createdBy: req.user.id };

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    
    if (date === 'today') {
      const today = moment().startOf('day');
      const tomorrow = moment().endOf('day');
      query.nextCallDate = { $gte: today, $lte: tomorrow };
    }
    
    if (date === 'tomorrow') {
      const tomorrow = moment().add(1, 'day').startOf('day');
      const dayAfter = moment().add(1, 'day').endOf('day');
      query.nextCallDate = { $gte: tomorrow, $lte: dayAfter };
    }
    
    if (date === 'this_week') {
      const startOfWeek = moment().startOf('week');
      const endOfWeek = moment().endOf('week');
      query.nextCallDate = { $gte: startOfWeek, $lte: endOfWeek };
    }
    
    if (date === 'overdue') {
      query.nextCallDate = { $lt: new Date() };
      query.status = { $in: ['pending', 'followed'] };
    }
    
    if (date === 'missed') {
      query.status = 'missed';
      query.nextCallDate = { $lt: new Date() };
    }
    
    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const followups = await Followup.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Followup.countDocuments(query);

    // Get summary stats
    const summary = {
      total: await Followup.countDocuments({ createdBy: req.user.id }),
      pending: await Followup.countDocuments({ createdBy: req.user.id, status: 'pending' }),
      followed: await Followup.countDocuments({ createdBy: req.user.id, status: 'followed' }),
      converted: await Followup.countDocuments({ createdBy: req.user.id, status: 'converted' }),
      missed: await Followup.countDocuments({ createdBy: req.user.id, status: 'missed' }),
      overdue: await Followup.countDocuments({
        createdBy: req.user.id,
        nextCallDate: { $lt: new Date() },
        status: { $in: ['pending', 'followed'] }
      })
    };

    res.json({
      success: true,
      data: followups,
      summary,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single followup
// @route   GET /api/followups/:id
exports.getFollowupById = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    if (followup.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    res.json({
      success: true,
      data: followup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reschedule follow-up date
// @route   PUT /api/followups/:id/reschedule
exports.rescheduleFollowup = async (req, res) => {
  try {
    const { nextCallDate, reason, daysToAdd } = req.body;
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    const oldDate = followup.nextCallDate;
    let newDate;
    
    if (daysToAdd) {
      // Add specified number of days
      newDate = moment(followup.nextCallDate).add(daysToAdd, 'days').toDate();
    } else if (nextCallDate) {
      // Set specific date
      newDate = new Date(nextCallDate);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either nextCallDate or daysToAdd'
      });
    }
    
    followup.nextCallDate = newDate;
    followup.followupHistory.push({
      action: 'rescheduled',
      notes: reason || `Follow-up rescheduled from ${moment(oldDate).format('YYYY-MM-DD')} to ${moment(newDate).format('YYYY-MM-DD')}`,
      previousValue: oldDate,
      newValue: newDate
    });
    
    await followup.save();
    
    // Update related task
    await Task.findOneAndUpdate(
      { 'relatedTo.id': followup._id, status: 'pending' },
      { dueDate: newDate }
    );
    
    res.json({
      success: true,
      data: followup,
      message: `Follow-up rescheduled to ${moment(newDate).format('YYYY-MM-DD')}`,
      oldDate: oldDate,
      newDate: newDate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Quick reschedule with common options
// @route   POST /api/followups/:id/quick-reschedule
exports.quickReschedule = async (req, res) => {
  try {
    const { option } = req.body;
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    const daysMap = {
      'tomorrow': 1,
      'in_3_days': 3,
      'in_1_week': 7,
      'in_2_weeks': 14,
      'in_1_month': 30
    };
    
    const daysToAdd = daysMap[option];
    if (!daysToAdd) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reschedule option'
      });
    }
    
    const oldDate = followup.nextCallDate;
    const newDate = moment(followup.nextCallDate).add(daysToAdd, 'days').toDate();
    
    followup.nextCallDate = newDate;
    followup.followupHistory.push({
      action: 'rescheduled',
      notes: `Quick reschedule: ${option}`,
      previousValue: oldDate,
      newValue: newDate
    });
    
    await followup.save();
    
    res.json({
      success: true,
      data: followup,
      message: `Follow-up rescheduled to ${moment(newDate).format('YYYY-MM-DD')}`,
      option: option
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    WhatsApp click tracking
// @route   PUT /api/followups/:id/whatsapp-click
exports.whatsappClick = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    followup.whatsappClicked = true;
    followup.whatsappClickedAt = new Date();
    followup.followupHistory.push({
      action: 'whatsapp_click',
      notes: `WhatsApp button clicked at ${new Date().toLocaleString()}`
    });
    
    await followup.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalWhatsAppClicks': 1 }
    });
    
    // Generate WhatsApp link with pre-filled message
    const whatsappLink = `https://wa.me/${followup.phone}`;
    
    res.json({
      success: true,
      data: followup,
      whatsappLink,
      message: `Click to message ${followup.name} on WhatsApp`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark as followed with optional auto-reschedule
// @route   PUT /api/followups/:id/mark-followed
exports.markFollowed = async (req, res) => {
  try {
    const { notes, conversationHighlights, autoReschedule, rescheduleDays } = req.body;
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    const oldStatus = followup.status;
    followup.status = 'followed';
    followup.followedAt = new Date();
    followup.followupCount += 1;
    
    if (notes) {
      followup.lastConversation = notes;
    }
    
    followup.followupHistory.push({
      action: 'marked_followed',
      notes: conversationHighlights || `Follow-up #${followup.followupCount + 1} completed`,
      previousValue: oldStatus,
      newValue: 'followed'
    });
    
    await followup.save();
    
    // Update related task
    await Task.findOneAndUpdate(
      { 'relatedTo.id': followup._id, status: 'pending' },
      { status: 'completed', completedAt: new Date() }
    );
    
    // Auto-reschedule next follow-up
    let nextFollowup = null;
    if (autoReschedule && rescheduleDays) {
      const newDate = moment().add(rescheduleDays, 'days').toDate();
      nextFollowup = await Followup.findByIdAndUpdate(
        followup._id,
        { 
          nextCallDate: newDate,
          status: 'pending'
        },
        { new: true }
      );
      
      // Create new task for next follow-up
      const newTask = new Task({
        title: `Follow up with ${followup.name}`,
        description: `Next follow-up after ${rescheduleDays} days`,
        type: 'followup',
        dueDate: newDate,
        relatedTo: { model: 'followup', id: followup._id },
        createdBy: req.user.id
      });
      await newTask.save();
    }
    
    res.json({
      success: true,
      data: followup,
      nextFollowup,
      message: `Marked ${followup.name} as followed${autoReschedule ? ' and rescheduled' : ''}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Convert to customer/team member
// @route   PUT /api/followups/:id/convert
exports.convertFollowup = async (req, res) => {
  try {
    const {
      conversionType,
      conversionValue,
      salesAmount,
      products,
      notes
    } = req.body;
    
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    const oldStatus = followup.status;
    followup.status = 'converted';
    followup.category = 'converted';
    followup.convertedAt = new Date();
    followup.conversionType = conversionType || 'customer';
    followup.conversionValue = conversionValue || 0;
    followup.salesAmount = salesAmount || 0;
    if (products) followup.products = products;
    
    followup.followupHistory.push({
      action: 'converted',
      notes: notes || `Lead converted to ${conversionType || 'customer'}`,
      previousValue: oldStatus,
      newValue: 'converted'
    });
    
    await followup.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        'stats.totalConversions': 1,
        'stats.totalSales': salesAmount || 0
      }
    });
    
    res.json({
      success: true,
      data: followup,
      message: `í¾‰ ${followup.name} converted successfully!`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update followup
// @route   PUT /api/followups/:id
exports.updateFollowup = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    // Track changes
    const changes = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (followup[key] !== value && key !== 'followupHistory') {
        changes.push({
          field: key,
          from: followup[key],
          to: value
        });
      }
    }
    
    const updated = await Followup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (changes.length > 0) {
      updated.followupHistory.push({
        action: 'updated',
        notes: `Updated fields: ${changes.map(c => c.field).join(', ')}`,
        previousValue: changes
      });
      await updated.save();
    }
    
    res.json({
      success: true,
      data: updated,
      changes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete followup
// @route   DELETE /api/followups/:id
exports.deleteFollowup = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id);
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    // Delete related tasks
    await Task.deleteMany({ 'relatedTo.id': followup._id });
    
    await followup.deleteOne();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalFollowups': -1 }
    });
    
    res.json({
      success: true,
      message: `Deleted followup for ${followup.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get follow-up history for a lead
// @route   GET /api/followups/:id/history
exports.getFollowupHistory = async (req, res) => {
  try {
    const followup = await Followup.findById(req.params.id)
      .select('name followupHistory followupCount missedCount rescheduleCount');
    
    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Followup not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        name: followup.name,
        totalFollowups: followup.followupCount,
        missedCount: followup.missedCount,
        history: followup.followupHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get analytics
// @route   GET /api/followups/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = moment().startOf(period);
    
    const stats = await Followup.aggregate([
      {
        $match: {
          createdBy: req.user.id,
          createdAt: { $gte: startDate.toDate() }
        }
      },
      {
        $group: {
          _id: null,
          totalFollowups: { $sum: 1 },
          totalConversions: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
          },
          totalWhatsAppClicks: { $sum: { $cond: ['$whatsappClicked', 1, 0] } },
          totalSales: { $sum: '$salesAmount' },
          averageFollowupCount: { $avg: '$followupCount' },
          rescheduleCount: { $sum: { $size: '$followupHistory' } }
        }
      }
    ]);
    
    const conversionRate = stats[0]?.totalFollowups > 0
      ? (stats[0].totalConversions / stats[0].totalFollowups) * 100
      : 0;
    
    res.json({
      success: true,
      data: {
        period,
        ...stats[0],
        conversionRate: conversionRate.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
