const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
    default: ''
  },
  type: {
    type: String,
    enum: ['recruitment', 'sales', 'commission', 'activity', 'revenue', 'team_growth'],
    required: true
  },
  target: {
    type: Number,
    required: [true, 'Target value is required'],
    min: [0, 'Target cannot be negative']
  },
  current: {
    type: Number,
    default: 0,
    min: [0, 'Current value cannot be negative']
  },
  unit: {
    type: String,
    enum: ['people', 'sales', 'dollars', 'followups', 'calls'],
    default: 'people'
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'achieved', 'failed', 'paused'],
    default: 'active'
  },
  
  // Progress Tracking
  progressHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    value: Number,
    note: String
  }],
  dailyProgress: [{
    date: Date,
    value: Number
  }],
  weeklyProgress: [{
    week: Number,
    year: Number,
    value: Number
  }],
  
  // Reminder Settings
  reminderDays: [{
    type: Number,
    default: [1, 7, 14, 21, 28]
  }],
  reminderTimes: [{
    type: String,
    default: ['09:00']
  }],
  lastRemindedAt: {
    type: Date,
    default: null
  },
  nextReminderAt: {
    type: Date,
    default: null
  },
  
  // Achievement
  achievedAt: {
    type: Date,
    default: null
  },
  achievementNotes: {
    type: String,
    default: ''
  },
  
  // Reward
  reward: {
    type: String,
    default: ''
  },
  rewardClaimed: {
    type: Boolean,
    default: false
  },
  
  // Challenge
  isChallenge: {
    type: Boolean,
    default: false
  },
  challengeStake: {
    type: Number,
    default: 0
  },
  
  // Relationships
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
GoalSchema.index({ createdBy: 1, status: 1 });
GoalSchema.index({ createdBy: 1, period: 1 });
GoalSchema.index({ endDate: 1, status: 1 });

// Virtual for progress percentage
GoalSchema.virtual('progressPercentage').get(function() {
  if (this.target === 0) return 0;
  return Math.min(100, (this.current / this.target) * 100);
});

// Virtual for days remaining
GoalSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is on track
GoalSchema.virtual('isOnTrack').get(function() {
  const totalDays = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24);
  const daysPassed = (new Date() - this.startDate) / (1000 * 60 * 60 * 24);
  const expectedProgress = (daysPassed / totalDays) * 100;
  return this.progressPercentage >= expectedProgress;
});

// Virtual for daily target
GoalSchema.virtual('dailyTarget').get(function() {
  const remainingDays = this.daysRemaining;
  if (remainingDays <= 0) return 0;
  const remainingTarget = this.target - this.current;
  return Math.ceil(remainingTarget / remainingDays);
});

// Pre-save middleware
GoalSchema.pre('save', function(next) {
  // Auto-update status based on current vs target
  if (this.current >= this.target && this.status === 'active') {
    this.status = 'achieved';
    this.achievedAt = new Date();
  }
  
  // Auto-fail if end date passed
  if (this.endDate < new Date() && this.current < this.target && this.status === 'active') {
    this.status = 'failed';
  }
  
  // Update daily progress
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingDay = this.dailyProgress.find(d => 
    d.date && d.date.setHours(0, 0, 0, 0) === today.getTime()
  );
  
  if (existingDay) {
    existingDay.value = this.current;
  } else {
    this.dailyProgress.push({ date: today, value: this.current });
  }
  
  // Keep only last 30 days
  if (this.dailyProgress.length > 30) {
    this.dailyProgress = this.dailyProgress.slice(-30);
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Goal', GoalSchema);
