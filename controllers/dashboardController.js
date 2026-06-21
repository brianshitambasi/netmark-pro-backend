const Followup = require('../models/Followup');
const Goal = require('../models/Goal');
const Gallery = require('../models/Gallery');
const Prospect = require('../models/Prospect');
const moment = require('moment');

// @desc    Get complete dashboard data with real analytics
// @route   GET /api/dashboard/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = moment().startOf('day');
    const tomorrow = moment().endOf('day');
    const startOfWeek = moment().startOf('week');
    const startOfMonth = moment().startOf('month');
    const endOfMonth = moment().endOf('month');
    const last7Days = moment().subtract(7, 'days');

    // ===== TODAY'S DATA =====
    const todayFollowups = await Followup.find({
      createdBy: userId,
      nextCallDate: { $gte: today, $lte: tomorrow },
      status: { $ne: 'converted' }
    });

    const todayFollowed = await Followup.countDocuments({
      createdBy: userId,
      followedAt: { $gte: today, $lte: tomorrow }
    });

    // ===== OVERDUE FOLLOWUPS =====
    const overdueFollowups = await Followup.find({
      createdBy: userId,
      nextCallDate: { $lt: new Date() },
      status: { $in: ['pending', 'followed'] }
    }).sort({ nextCallDate: 1 });

    const missedCount = overdueFollowups.length;
    const criticalMissed = overdueFollowups.filter(f => 
      moment().diff(moment(f.nextCallDate), 'days') >= 3
    ).length;

    // ===== WEEKLY STATS =====
    const weeklyStats = {
      followupsCompleted: await Followup.countDocuments({
        createdBy: userId,
        status: 'followed',
        followedAt: { $gte: startOfWeek }
      }),
      conversions: await Followup.countDocuments({
        createdBy: userId,
        status: 'converted',
        convertedAt: { $gte: startOfWeek }
      }),
      whatsappClicks: await Followup.countDocuments({
        createdBy: userId,
        whatsappClicked: true,
        whatsappClickedAt: { $gte: startOfWeek }
      }),
      prospectsAdded: await Prospect.countDocuments({
        createdBy: userId,
        createdAt: { $gte: startOfWeek }
      })
    };

    // ===== MONTHLY STATS =====
    const monthlyStats = {
      conversions: await Followup.countDocuments({
        createdBy: userId,
        status: 'converted',
        convertedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      salesTotal: await Followup.aggregate([
        {
          $match: {
            createdBy: userId,
            status: 'converted',
            convertedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$salesAmount' } } }
      ]),
      followupsCompleted: await Followup.countDocuments({
        createdBy: userId,
        status: 'followed',
        followedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      whatsappClicks: await Followup.countDocuments({
        createdBy: userId,
        whatsappClicked: true,
        whatsappClickedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      prospectsAdded: await Prospect.countDocuments({
        createdBy: userId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      })
    };

    // ===== DAILY ACTIVITY FOR CHART (Last 7 days) =====
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, 'days');
      const dayStart = day.startOf('day');
      const dayEnd = day.endOf('day');
      
      const followups = await Followup.countDocuments({
        createdBy: userId,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      const followed = await Followup.countDocuments({
        createdBy: userId,
        followedAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      const whatsappClicks = await Followup.countDocuments({
        createdBy: userId,
        whatsappClickedAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      const prospects = await Prospect.countDocuments({
        createdBy: userId,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      dailyActivity.push({
        date: day.format('YYYY-MM-DD'),
        label: day.format('ddd'),
        followups,
        followed,
        whatsappClicks,
        prospects
      });
    }

    // ===== GOALS =====
    const activeGoals = await Goal.find({
      createdBy: userId,
      status: 'active'
    });

    const goalSummary = activeGoals.map(goal => {
      const progress = (goal.current / goal.target) * 100;
      const daysRemaining = moment(goal.endDate).diff(moment(), 'days');
      const totalDays = moment(goal.endDate).diff(moment(goal.startDate), 'days');
      const daysPassed = moment().diff(moment(goal.startDate), 'days');
      const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
      
      return {
        id: goal._id,
        title: goal.title,
        type: goal.type,
        target: goal.target,
        current: goal.current,
        progress: Math.min(100, progress),
        daysRemaining,
        isBehind: progress < expectedProgress,
        unit: goal.unit
      };
    });

    // ===== RECENT ACTIVITY =====
    const recentActivity = await Followup.find({ createdBy: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('name status updatedAt followupHistory category');

    // ===== RECENT MEDIA =====
    const recentMedia = await Gallery.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('title url type category createdAt');

    // ===== SUMMARY STATS =====
    const summary = {
      total: await Followup.countDocuments({ createdBy: userId }),
      pending: await Followup.countDocuments({ createdBy: userId, status: 'pending' }),
      followed: await Followup.countDocuments({ createdBy: userId, status: 'followed' }),
      converted: await Followup.countDocuments({ createdBy: userId, status: 'converted' }),
      missed: await Followup.countDocuments({ createdBy: userId, status: 'missed' }),
      totalWhatsAppClicks: await Followup.countDocuments({ createdBy: userId, whatsappClicked: true }),
      totalProspects: await Prospect.countDocuments({ createdBy: userId })
    };

    res.json({
      success: true,
      data: {
        today: {
          followupsDue: todayFollowups,
          followupsDueCount: todayFollowups.length,
          followedCompleted: todayFollowed,
          missed: missedCount,
          criticalMissed
        },
        weekly: weeklyStats,
        monthly: monthlyStats,
        dailyActivity,
        overdueFollowups: overdueFollowups.map(f => ({
          id: f._id,
          name: f.name,
          phone: f.phone,
          dueDate: f.nextCallDate,
          missedDays: moment().diff(moment(f.nextCallDate), 'days'),
          severity: moment().diff(moment(f.nextCallDate), 'days') >= 3 ? 'critical' : 'warning'
        })),
        goals: goalSummary,
        recentActivity: recentActivity.map(a => ({
          id: a._id,
          name: a.name,
          status: a.status,
          category: a.category,
          lastAction: a.followupHistory?.[a.followupHistory.length - 1]?.action || 'created',
          updatedAt: a.updatedAt
        })),
        recentMedia,
        summary,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get calendar data
// @route   GET /api/dashboard/calendar
exports.getCalendarData = async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = moment(`${year}-${month}-01`).startOf('month');
    const endDate = moment(startDate).endOf('month');
    
    const followups = await Followup.find({
      createdBy: req.user.id,
      nextCallDate: { $gte: startDate, $lte: endDate }
    });
    
    const calendarData = {};
    followups.forEach(followup => {
      const date = moment(followup.nextCallDate).format('YYYY-MM-DD');
      if (!calendarData[date]) calendarData[date] = [];
      calendarData[date].push({
        id: followup._id,
        name: followup.name,
        status: followup.status,
        category: followup.category
      });
    });
    
    res.json({
      success: true,
      data: calendarData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get analytics data
// @route   GET /api/dashboard/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const startOfMonth = moment().startOf('month');
    const startOfWeek = moment().startOf('week');

    // Conversion funnel data
    const funnelData = {
      leads: await Prospect.countDocuments({ createdBy: userId }),
      qualified: await Prospect.countDocuments({ createdBy: userId, pipelineStage: 'qualified' }),
      presented: await Prospect.countDocuments({ createdBy: userId, pipelineStage: 'presented' }),
      enrolled: await Prospect.countDocuments({ createdBy: userId, pipelineStage: 'enrolled' })
    };

    // WhatsApp click stats
    const whatsappStats = {
      totalClicks: await Followup.countDocuments({ createdBy: userId, whatsappClicked: true }),
      thisMonth: await Followup.countDocuments({
        createdBy: userId,
        whatsappClicked: true,
        whatsappClickedAt: { $gte: startOfMonth }
      }),
      thisWeek: await Followup.countDocuments({
        createdBy: userId,
        whatsappClicked: true,
        whatsappClickedAt: { $gte: startOfWeek }
      })
    };

    // Conversion rate
    const totalFollowups = await Followup.countDocuments({ createdBy: userId });
    const totalConversions = await Followup.countDocuments({ createdBy: userId, status: 'converted' });
    const conversionRate = totalFollowups > 0 ? (totalConversions / totalFollowups) * 100 : 0;

    res.json({
      success: true,
      data: {
        funnel: funnelData,
        whatsapp: whatsappStats,
        conversionRate: conversionRate.toFixed(2),
        totalFollowups,
        totalConversions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
