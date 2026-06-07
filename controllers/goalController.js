const Goal = require('../models/Goal');
const Followup = require('../models/Followup');
const moment = require('moment');

// @desc    Create new goal
// @route   POST /api/goals
exports.createGoal = async (req, res) => {
  try {
    const {
      title, description, type, target, unit, period,
      startDate, endDate, reminderDays, reward, isChallenge, challengeStake
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const goal = new Goal({
      title,
      description,
      type,
      target,
      unit: unit || 'people',
      period,
      startDate,
      endDate,
      reminderDays: reminderDays || [1, 7, 14, 21, 28],
      reward,
      isChallenge: isChallenge || false,
      challengeStake: challengeStake || 0,
      createdBy: req.user.id
    });

    await goal.save();

    // Calculate initial current value
    await updateGoalCurrentValue(goal);

    res.status(201).json({
      success: true,
      data: goal,
      message: `Goal "${title}" created successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all goals
// @route   GET /api/goals
exports.getGoals = async (req, res) => {
  try {
    const { status, period, type, includeAchieved = false } = req.query;
    let query = { createdBy: req.user.id };
    
    if (status && status !== 'all') query.status = status;
    if (period && period !== 'all') query.period = period;
    if (type && type !== 'all') query.type = type;
    if (!includeAchieved) query.status = { $ne: 'achieved' };
    
    const goals = await Goal.find(query).sort({ createdAt: -1 });
    
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      // Update current value if needed
      await updateGoalCurrentValue(goal);
      
      const progress = (goal.current / goal.target) * 100;
      const daysRemaining = moment(goal.endDate).diff(moment(), 'days');
      const totalDays = moment(goal.endDate).diff(moment(goal.startDate), 'days');
      const daysPassed = moment().diff(moment(goal.startDate), 'days');
      const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
      
      return {
        ...goal.toObject(),
        progress: Math.min(100, progress),
        daysRemaining,
        isOnTrack: progress >= expectedProgress,
        neededPerDay: daysRemaining > 0 ? (goal.target - goal.current) / daysRemaining : 0,
        expectedProgress
      };
    }));
    
    // Summary statistics
    const summary = {
      active: goalsWithProgress.filter(g => g.status === 'active').length,
      achieved: goalsWithProgress.filter(g => g.status === 'achieved').length,
      failed: goalsWithProgress.filter(g => g.status === 'failed').length,
      totalProgress: goalsWithProgress.reduce((acc, g) => acc + g.progress, 0) / (goalsWithProgress.length || 1),
      onTrackCount: goalsWithProgress.filter(g => g.isOnTrack && g.status === 'active').length
    };
    
    res.json({
      success: true,
      data: goalsWithProgress,
      summary,
      total: goalsWithProgress.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single goal
// @route   GET /api/goals/:id
exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    if (goal.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Update current value
    await updateGoalCurrentValue(goal);
    
    const progress = (goal.current / goal.target) * 100;
    const daysRemaining = moment(goal.endDate).diff(moment(), 'days');
    const totalDays = moment(goal.endDate).diff(moment(goal.startDate), 'days');
    const daysPassed = moment().diff(moment(goal.startDate), 'days');
    const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
    
    // Get recent progress history
    const recentProgress = goal.progressHistory.slice(-10);
    
    res.json({
      success: true,
      data: {
        ...goal.toObject(),
        progress: Math.min(100, progress),
        daysRemaining,
        isOnTrack: progress >= expectedProgress,
        neededPerDay: daysRemaining > 0 ? (goal.target - goal.current) / daysRemaining : 0,
        recentProgress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update goal progress
// @route   PUT /api/goals/:id/progress
exports.updateGoalProgress = async (req, res) => {
  try {
    const { current, note } = req.body;
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    const oldValue = goal.current;
    goal.current = current;
    
    // Add to progress history
    goal.progressHistory.push({
      date: new Date(),
      value: current,
      note: note || 'Manual update'
    });
    
    // Add to daily progress
    const today = moment().startOf('day');
    const existingDay = goal.dailyProgress.find(d => 
      moment(d.date).isSame(today, 'day')
    );
    
    if (existingDay) {
      existingDay.value = current;
    } else {
      goal.dailyProgress.push({ date: today, value: current });
    }
    
    await goal.save();
    
    // Check if achieved
    if (goal.current >= goal.target && goal.status === 'active') {
      res.json({
        success: true,
        data: goal,
        achieved: true,
        message: `í¾‰ CONGRATULATIONS! You achieved your goal "${goal.title}"!`
      });
    } else {
      res.json({
        success: true,
        data: goal,
        achieved: false,
        message: `Progress updated: ${current}/${goal.target} (${((current/goal.target)*100).toFixed(1)}%)`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    res.json({
      success: true,
      data: goal,
      message: 'Goal updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    await goal.deleteOne();
    
    res.json({
      success: true,
      message: `Goal "${goal.title}" deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get goal suggestions based on performance
// @route   GET /api/goals/suggestions
exports.getGoalSuggestions = async (req, res) => {
  try {
    const lastMonthStart = moment().subtract(1, 'month').startOf('month');
    const lastMonthEnd = moment().subtract(1, 'month').endOf('month');
    
    // Get last month's performance
    const conversions = await Followup.countDocuments({
      createdBy: req.user.id,
      status: 'converted',
      convertedAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const followups = await Followup.countDocuments({
      createdBy: req.user.id,
      status: 'followed',
      followedAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const suggestions = [];
    
    // Suggest recruitment goal
    suggestions.push({
      title: `Recruit ${conversions + 2} new team members`,
      type: 'recruitment',
      target: conversions + 2,
      unit: 'people',
      period: 'monthly',
      reason: `Based on your last month's performance of ${conversions} conversions`
    });
    
    // Suggest activity goal
    suggestions.push({
      title: `Complete ${followups + 5} follow-ups`,
      type: 'activity',
      target: followups + 5,
      unit: 'followups',
      period: 'monthly',
      reason: `You did ${followups} follow-ups last month. Can you beat it?`
    });
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to update goal current value
async function updateGoalCurrentValue(goal) {
  let current = 0;
  
  switch (goal.type) {
    case 'recruitment':
      current = await Followup.countDocuments({
        createdBy: goal.createdBy,
        status: 'converted',
        conversionType: 'team_member',
        convertedAt: { $gte: goal.startDate, $lte: goal.endDate }
      });
      break;
      
    case 'activity':
      current = await Followup.countDocuments({
        createdBy: goal.createdBy,
        status: 'followed',
        followedAt: { $gte: goal.startDate, $lte: goal.endDate }
      });
      break;
      
    case 'sales':
      const result = await Followup.aggregate([
        {
          $match: {
            createdBy: goal.createdBy,
            status: 'converted',
            convertedAt: { $gte: goal.startDate, $lte: goal.endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$salesAmount' }
          }
        }
      ]);
      current = result[0]?.total || 0;
      break;
      
    case 'commission':
      const commissionResult = await Followup.aggregate([
        {
          $match: {
            createdBy: goal.createdBy,
            status: 'converted',
            convertedAt: { $gte: goal.startDate, $lte: goal.endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$commissionEarned' }
          }
        }
      ]);
      current = commissionResult[0]?.total || 0;
      break;
  }
  
  if (goal.current !== current) {
    goal.current = current;
    await goal.save();
  }
}
