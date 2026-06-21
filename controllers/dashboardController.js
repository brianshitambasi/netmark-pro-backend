const Followup = require('../models/Followup');
const Goal = require('../models/Goal');
const Gallery = require('../models/Gallery');
const Task = require('../models/Task');
const Event = require('../models/Event');
const moment = require('moment');
const Followup = require('../models/Followup');
const Prospect = require('../models/Prospect');

// @desc    Get complete dashboard data
// @route   GET /api/dashboard/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = moment().startOf('day');
    const tomorrow = moment().endOf('day');
    const startOfWeek = moment().startOf('week');
    const startOfMonth = moment().startOf('month');
    const endOfMonth = moment().endOf('month');
    
    // Today's data
    const todayFollowups = await Followup.find({
      createdBy: userId,
      nextCallDate: { $gte: today, $lte: tomorrow },
      status: { $ne: 'converted' }
    }).populate('createdBy', 'name');
    
    const todayFollowed = await Followup.countDocuments({
      createdBy: userId,
      followedAt: { $gte: today, $lte: tomorrow }
    });
    
    // Overdue followups (RED ALERTS)
    const overdueFollowups = await Followup.find({
      createdBy: userId,
      nextCallDate: { $lt: new Date() },
      status: { $in: ['pending', 'followed'] }
    }).sort({ nextCallDate: 1 });
    
    const missedCount = overdueFollowups.length;
    const criticalMissed = overdueFollowups.filter(f => 
      moment().diff(moment(f.nextCallDate), 'days') >= 3
    ).length;
    
    // Weekly stats
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
      })
    };
    
    // Monthly stats
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
      })
    };
    
    // Active goals
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
    
    // Recent activity
    const recentActivity = await Followup.find({ createdBy: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('name status updatedAt followupHistory');
    
    // Upcoming tasks
    const upcomingTasks = await Task.find({
      createdBy: userId,
      status: 'pending',
      dueDate: { $gte: today, $lte: moment().add(7, 'days').endOf('day') }
    }).sort({ dueDate: 1 }).limit(5);
    
    // Recent media
    const recentMedia = await Gallery.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(8);
    
    // Upcoming events
    const upcomingEvents = await Event.find({
      createdBy: userId,
      date: { $gte: new Date() }
    }).sort({ date: 1 }).limit(3);
    
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
        monthly: {
          conversions: monthlyStats.conversions,
          salesTotal: monthlyStats.salesTotal[0]?.total || 0,
          followupsCompleted: monthlyStats.followupsCompleted
        },
        overdueFollowups: overdueFollowups.map(f => ({
          id: f._id,
          name: f.name,
          phone: f.phone,
          dueDate: f.nextCallDate,
          missedDays: moment().diff(moment(f.nextCallDate), 'days'),
          severity: moment().diff(moment(f.nextCallDate), 'days') >= 3 ? 'critical' : 'warning',
          severityMessage: moment().diff(moment(f.nextCallDate), 'days') >= 3 
            ? '⚠️ CRITICAL - Over 3 days overdue!' 
            : '⚠️ Overdue - Needs attention'
        })),
        goals: goalSummary,
        recentActivity: recentActivity.map(a => ({
          id: a._id,
          name: a.name,
          status: a.status,
          lastAction: a.followupHistory[a.followupHistory.length - 1]?.action || 'created',
          updatedAt: a.updatedAt
        })),
        upcomingTasks,
        recentMedia,
        upcomingEvents,
        timestamp: new Date()
      }
    });
  } catch (error) {
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
    
    // Get followups for the month
    const followups = await Followup.find({
      createdBy: req.user.id,
      nextCallDate: { $gte: startDate, $lte: endDate }
    });
    
    // Get events for the month
    const events = await Event.find({
      createdBy: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Get tasks for the month
    const tasks = await Task.find({
      createdBy: req.user.id,
      dueDate: { $gte: startDate, $lte: endDate }
    });
    
    // Group by date
    const calendarData = {};
    
    followups.forEach(followup => {
      const date = moment(followup.nextCallDate).format('YYYY-MM-DD');
      if (!calendarData[date]) calendarData[date] = { followups: [], events: [], tasks: [] };
      calendarData[date].followups.push({
        id: followup._id,
        name: followup.name,
        status: followup.status,
        category: followup.category,
        type: 'followup'
      });
    });
    
    events.forEach(event => {
      const date = moment(event.date).format('YYYY-MM-DD');
      if (!calendarData[date]) calendarData[date] = { followups: [], events: [], tasks: [] };
      calendarData[date].events.push({
        id: event._id,
        title: event.title,
        type: event.type,
        time: event.time,
        location: event.location
      });
    });
    
    tasks.forEach(task => {
      const date = moment(task.dueDate).format('YYYY-MM-DD');
      if (!calendarData[date]) calendarData[date] = { followups: [], events: [], tasks: [] };
      calendarData[date].tasks.push({
        id: task._id,
        title: task.title,
        priority: task.priority,
        status: task.status
      });
    });
    
    res.json({
      success: true,
      data: calendarData,
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get performance analytics
// @route   GET /api/dashboard/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = moment().startOf(period);
    
    // Daily followups for the period
    const dailyFollowups = await Followup.aggregate([
      {
        $match: {
          createdBy: req.user.id,
          createdAt: { $gte: startDate.toDate() }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          conversions: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Conversion rate trend
    let cumulativeConversions = 0;
    let cumulativeFollowups = 0;
    const conversionTrend = dailyFollowups.map(day => {
      cumulativeFollowups += day.count;
      cumulativeConversions += day.conversions;
      return {
        date: day._id,
        conversionRate: cumulativeFollowups > 0 ? (cumulativeConversions / cumulativeFollowups) * 100 : 0
      };
    });
    
    // Category distribution
    const categoryDistribution = await Followup.aggregate([
      { $match: { createdBy: req.user.id } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Performance by day of week
    const performanceByDay = await Followup.aggregate([
      { $match: { createdBy: req.user.id } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          totalFollowups: { $sum: 1 },
          totalConversions: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayPerformance = performanceByDay.map(day => ({
      day: dayNames[day._id - 1],
      followups: day.totalFollowups,
      conversions: day.totalConversions,
      conversionRate: day.totalFollowups > 0 ? (day.totalConversions / day.totalFollowups) * 100 : 0
    }));
    
    res.json({
      success: true,
      data: {
        dailyFollowups,
        conversionTrend,
        categoryDistribution,
        dayPerformance,
        summary: {
          totalFollowups: dailyFollowups.reduce((sum, d) => sum + d.count, 0),
          totalConversions: dailyFollowups.reduce((sum, d) => sum + d.conversions, 0),
          averageDailyFollowups: dailyFollowups.length > 0 ? dailyFollowups.reduce((sum, d) => sum + d.count, 0) / dailyFollowups.length : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get daily activity (prospects created, follow-ups done)
// @route   GET /api/dashboard/activity
exports.getDailyActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = 7; // last 7 days
    const dates = [];
    const prospectCounts = [];
    const followupCounts = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const start = date.clone().startOf('day');
      const end = date.clone().endOf('day');
      const dateStr = date.format('YYYY-MM-DD');

      // Prospects created on that day
      const prospects = await Prospect.countDocuments({
        createdBy: userId,
        createdAt: { $gte: start.toDate(), $lte: end.toDate() }
      });

      // Follow-ups created/completed on that day (we'll count created)
      const followups = await Followup.countDocuments({
        createdBy: userId,
        createdAt: { $gte: start.toDate(), $lte: end.toDate() }
      });

      dates.push(dateStr);
      prospectCounts.push(prospects);
      followupCounts.push(followups);
    }

    res.json({
      success: true,
      data: {
        dates,
        prospectCounts,
        followupCounts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
