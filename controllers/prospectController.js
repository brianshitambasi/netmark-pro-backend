const Prospect = require('../models/Prospect');
const User = require('../models/User');
const moment = require('moment');

// @desc    Create new prospect
// @route   POST /api/prospects
exports.createProspect = async (req, res) => {
  try {
    const prospectData = {
      ...req.body,
      assignedTo: req.user.id,
      lastContactDate: new Date()
    };
    
    const prospect = new Prospect(prospectData);
    await prospect.save();
    
    res.status(201).json({
      success: true,
      data: prospect,
      message: `Prospect ${prospect.name} added successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all prospects with filters
// @route   GET /api/prospects
exports.getProspects = async (req, res) => {
  try {
    const {
      status, category, priority, source, search,
      city, assignedTo, minScore, maxScore,
      page = 1, limit = 50, sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { assignedTo: req.user.id };

    if (status) query.status = status;
    if (category) query.categories = category;
    if (priority) query.priority = priority;
    if (source) query.source = source;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (assignedTo) query.assignedTo = assignedTo;
    if (minScore || maxScore) {
      query.score = {};
      if (minScore) query.score.$gte = parseInt(minScore);
      if (maxScore) query.score.$lte = parseInt(maxScore);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const prospects = await Prospect.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name email');

    const total = await Prospect.countDocuments(query);

    // Summary statistics
    const summary = {
      total: await Prospect.countDocuments({ assignedTo: req.user.id }),
      new: await Prospect.countDocuments({ assignedTo: req.user.id, status: 'new' }),
      qualified: await Prospect.countDocuments({ assignedTo: req.user.id, status: 'qualified' }),
      invited: await Prospect.countDocuments({ assignedTo: req.user.id, status: 'invited' }),
      enrolled: await Prospect.countDocuments({ assignedTo: req.user.id, status: 'enrolled' }),
      hot: await Prospect.countDocuments({ assignedTo: req.user.id, categories: 'hot' }),
      averageScore: await Prospect.aggregate([
        { $match: { assignedTo: req.user.id } },
        { $group: { _id: null, avg: { $avg: '$score' } } }
      ])
    };

    res.json({
      success: true,
      data: prospects,
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

// @desc    Get single prospect
// @route   GET /api/prospects/:id
exports.getProspectById = async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id)
      .populate('assignedTo', 'name email whatsappNumber')
      .populate('referredBy', 'name phone');
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    res.json({
      success: true,
      data: prospect
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send invitation to prospect
// @route   POST /api/prospects/:id/invite
exports.sendInvitation = async (req, res) => {
  try {
    const { type, eventType, eventDate, eventLocation, eventLink, notes } = req.body;
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    const invitation = {
      type: type || 'whatsapp',
      eventType: eventType || 'presentation',
      eventDate,
      eventLocation,
      eventLink,
      notes,
      sentAt: new Date(),
      response: 'pending'
    };
    
    prospect.invitations.push(invitation);
    prospect.status = 'invited';
    prospect.lastActivity = `Invitation sent for ${eventType}`;
    prospect.lastContactDate = new Date();
    
    await prospect.save();
    
    // Generate WhatsApp link if needed
    let whatsappLink = null;
    if (type === 'whatsapp') {
      const message = encodeURIComponent(`Hello ${prospect.name}! I invite you to our ${eventType} on ${new Date(eventDate).toLocaleDateString()} at ${eventLocation || eventLink}. Please confirm your attendance.`);
      whatsappLink = `https://wa.me/${prospect.phone}?text=${message}`;
    }
    
    res.json({
      success: true,
      data: prospect,
      whatsappLink,
      message: `Invitation sent to ${prospect.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Record presentation attendance
// @route   POST /api/prospects/:id/presentation
exports.recordPresentation = async (req, res) => {
  try {
    const { type, attended, duration, notes, objections, interestLevel, nextSteps } = req.body;
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    const presentation = {
      date: new Date(),
      type: type || 'one_on_one',
      attended: attended || true,
      duration: duration || 0,
      presenter: req.user.id,
      notes,
      objections: objections || [],
      interestLevel: interestLevel || 5,
      nextSteps
    };
    
    prospect.presentations.push(presentation);
    
    if (attended) {
      prospect.status = 'presentation_done';
      prospect.interestLevel = interestLevel || prospect.interestLevel;
    }
    
    prospect.lastActivity = `Presentation ${attended ? 'attended' : 'scheduled'}`;
    prospect.lastContactDate = new Date();
    
    if (nextSteps) {
      prospect.nextAction = nextSteps;
      prospect.nextActionDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    }
    
    await prospect.save();
    
    res.json({
      success: true,
      data: prospect,
      message: `Presentation recorded for ${prospect.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add follow-up activity
// @route   POST /api/prospects/:id/followup
exports.addFollowUp = async (req, res) => {
  try {
    const { type, purpose, notes, outcome, nextFollowUpDate } = req.body;
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    const followUp = {
      date: new Date(),
      type: type || 'call',
      purpose,
      notes,
      outcome,
      nextFollowUpDate: nextFollowUpDate || null,
      completed: true
    };
    
    prospect.followUps.push(followUp);
    prospect.lastContactDate = new Date();
    prospect.lastActivity = `Follow-up: ${purpose || type}`;
    
    if (nextFollowUpDate) {
      prospect.nextAction = `Follow up on ${type}`;
      prospect.nextActionDate = new Date(nextFollowUpDate);
    }
    
    await prospect.save();
    
    res.json({
      success: true,
      data: prospect,
      message: `Follow-up added for ${prospect.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Enroll prospect as distributor
// @route   PUT /api/prospects/:id/enroll
exports.enrollProspect = async (req, res) => {
  try {
    const { package: pkg, sponsorId, amount, paymentStatus } = req.body;
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    prospect.status = 'enrolled';
    prospect.categories = ['distributor', 'hot'];
    prospect.enrollment = {
      date: new Date(),
      package: pkg,
      sponsor: sponsorId || req.user.id,
      sponsorName: req.body.sponsorName || '',
      enrollmentId: `NETMARK-${Date.now()}`,
      paymentStatus: paymentStatus || 'pending',
      amount: amount || 0
    };
    
    prospect.lastActivity = `Enrolled as distributor - ${pkg} package`;
    
    await prospect.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalConversions': 1 }
    });
    
    res.json({
      success: true,
      data: prospect,
      message: `${prospect.name} has been enrolled successfully!`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update prospect
// @route   PUT /api/prospects/:id
exports.updateProspect = async (req, res) => {
  try {
    const prospect = await Prospect.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete prospect
// @route   DELETE /api/prospects/:id
exports.deleteProspect = async (req, res) => {
  try {
    const prospect = await Prospect.findByIdAndDelete(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        message: 'Prospect not found'
      });
    }
    
    res.json({
      success: true,
      message: `Prospect ${prospect.name} deleted`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get prospect pipeline/funnel
// @route   GET /api/prospects/pipeline/stats
exports.getPipeline = async (req, res) => {
  try {
    const stages = [
      'new', 'contacted', 'qualified', 'invited',
      'presentation_scheduled', 'presentation_done',
      'follow_up', 'negotiation', 'enrolled'
    ];
    
    const pipeline = [];
    for (const stage of stages) {
      const count = await Prospect.countDocuments({
        assignedTo: req.user.id,
        status: stage
      });
      
      pipeline.push({
        stage: stage,
        label: stage.replace('_', ' ').toUpperCase(),
        count,
        prospects: await Prospect.find({
          assignedTo: req.user.id,
          status: stage
        }).select('name phone score interestLevel').limit(5)
      });
    }
    
    const conversionRate = await Prospect.aggregate([
      { $match: { assignedTo: req.user.id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          enrolled: {
            $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          rate: {
            $multiply: [{ $divide: ['$enrolled', '$total'] }, 100]
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        pipeline,
        conversionRate: conversionRate[0]?.rate || 0,
        totalInPipeline: pipeline.reduce((sum, s) => sum + s.count, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get prospects needing follow-up today
// @route   GET /api/prospects/today-followups
exports.getTodayFollowups = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const tomorrow = moment().endOf('day');
    
    const prospects = await Prospect.find({
      assignedTo: req.user.id,
      nextActionDate: { $gte: today, $lte: tomorrow },
      status: { $nin: ['enrolled', 'customer', 'not_interested', 'lost'] }
    }).sort({ nextActionDate: 1 });
    
    res.json({
      success: true,
      data: prospects,
      count: prospects.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
