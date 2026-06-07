const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      reminderEmail: { type: Boolean, default: true },
      goalAlerts: { type: Boolean, default: true }
    },
    browser: {
      enabled: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      desktopNotifications: { type: Boolean, default: true }
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      reminderMessages: { type: Boolean, default: false }
    }
  },
  followupDefaults: {
    defaultCategory: { type: String, enum: ['hot', 'warm', 'cold'], default: 'warm' },
    defaultReminderDays: [{ type: Number, default: [1, 3, 7, 14, 30] }],
    autoConvertAfterFollowups: { type: Number, default: 5 },
    missedAlertAfter: { type: Number, default: 1 }
  },
  whatsapp: {
    countryCode: { type: String, default: '254' },
    defaultMessageTemplate: { type: String, default: '' },
    trackClicks: { type: Boolean, default: true }
  },
  dashboard: {
    defaultView: { type: String, enum: ['today', 'week', 'month'], default: 'today' },
    showGoalProgress: { type: Boolean, default: true },
    showRecentActivity: { type: Boolean, default: true },
    widgetOrder: [{ type: String }]
  },
  appearance: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    compactMode: { type: Boolean, default: false },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' }
  },
  backup: {
    autoBackup: { type: Boolean, default: false },
    backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
    lastBackup: { type: Date, default: null }
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
  timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema);
