const Followup = require('../models/Followup');
const moment = require('moment');

// @desc    Get upcoming and overdue follow-ups for notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStart = moment(now).startOf('day').toDate();
    const todayEnd = moment(now).endOf('day').toDate();
    const threeDays = moment(now).add(3, 'days').endOf('day').toDate();

    // Overdue follow-ups (missed) - include 'missed' status too
    const overdue = await Followup.find({
      createdBy: userId,
      nextCallDate: { $lt: todayStart },
      status: { $in: ['pending', 'followed', 'missed'] }
    }).sort({ nextCallDate: 1 });

    // Due today - include 'missed' and 'pending'
    const dueToday = await Followup.find({
      createdBy: userId,
      nextCallDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['pending', 'followed', 'missed'] }
    }).sort({ nextCallDate: 1 });

    // Upcoming within 3 days (excluding today)
    const upcoming = await Followup.find({
      createdBy: userId,
      nextCallDate: { $gt: todayEnd, $lte: threeDays },
      status: { $in: ['pending', 'followed'] }
    }).sort({ nextCallDate: 1 });

    // Count for badge
    const urgentCount = overdue.length + dueToday.length;

    // Get the most urgent notification (for popup)
    let mostUrgent = null;
    if (overdue.length > 0) {
      mostUrgent = {
        type: 'overdue',
        count: overdue.length,
        first: {
          name: overdue[0].name,
          phone: overdue[0].phone,
          days: moment(now).diff(moment(overdue[0].nextCallDate), 'days'),
          dueDate: overdue[0].nextCallDate
        }
      };
    } else if (dueToday.length > 0) {
      mostUrgent = {
        type: 'due_today',
        count: dueToday.length,
        first: {
          name: dueToday[0].name,
          phone: dueToday[0].phone,
          dueDate: dueToday[0].nextCallDate
        }
      };
    } else if (upcoming.length > 0) {
      mostUrgent = {
        type: 'upcoming',
        count: upcoming.length,
        first: {
          name: upcoming[0].name,
          phone: upcoming[0].phone,
          days: Math.ceil((new Date(upcoming[0].nextCallDate) - now) / (1000 * 60 * 60 * 24)),
          dueDate: upcoming[0].nextCallDate
        }
      };
    }

    res.json({
      success: true,
      data: {
        urgentCount,
        mostUrgent,
        overdue: overdue.map(f => ({
          id: f._id,
          name: f.name,
          phone: f.phone,
          dueDate: f.nextCallDate,
          daysOverdue: moment(now).diff(moment(f.nextCallDate), 'days'),
          status: f.status
        })),
        dueToday: dueToday.map(f => ({
          id: f._id,
          name: f.name,
          phone: f.phone,
          dueDate: f.nextCallDate,
          status: f.status
        })),
        upcoming: upcoming.map(f => ({
          id: f._id,
          name: f.name,
          phone: f.phone,
          dueDate: f.nextCallDate,
          daysUntil: Math.ceil((new Date(f.nextCallDate) - now) / (1000 * 60 * 60 * 24)),
          status: f.status
        })),
        unattendedCount: await Followup.countDocuments({
          createdBy: userId,
          status: 'pending',
          createdAt: { $lte: moment(now).subtract(7, 'days').toDate() }
        })
      }
    });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get notification count only (for badge)
// @route   GET /api/notifications/count
exports.getNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStart = moment(now).startOf('day').toDate();

    const overdueCount = await Followup.countDocuments({
      createdBy: userId,
      nextCallDate: { $lt: todayStart },
      status: { $in: ['pending', 'followed', 'missed'] }
    });

    const dueTodayCount = await Followup.countDocuments({
      createdBy: userId,
      nextCallDate: { $gte: todayStart, $lte: moment(now).endOf('day').toDate() },
      status: { $in: ['pending', 'followed', 'missed'] }
    });

    res.json({
      success: true,
      count: overdueCount + dueTodayCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
