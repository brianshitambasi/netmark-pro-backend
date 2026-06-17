const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    default: 'Network Marketer'
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  whatsappNumber: {
    type: String,
    default: '',
    match: [/^[0-9+\-\s]+$/, 'Please add a valid phone number']
  },
  settings: {
    reminderTime: {
      type: String,
      default: '08:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    reminderStyle: {
      type: String,
      enum: ['gentle', 'firm', 'strict'],
      default: 'firm'
    },
    dailyDigest: {
      type: Boolean,
      default: true
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    defaultCategory: {
      type: String,
      enum: ['hot', 'warm', 'cold'],
      default: 'warm'
    },
    reminderDays: {
      type: [Number],
      default: [1, 3, 7, 14, 30]
    }
  },
  stats: {
    totalFollowups: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    totalWhatsAppClicks: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
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

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Update stats before save
UserSchema.pre('save', function(next) {
  if (this.stats.totalFollowups > 0) {
    this.stats.conversionRate = (this.stats.totalConversions / this.stats.totalFollowups) * 100;
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);

// Add profile picture field to UserSchema
profilePicture: {
  type: String,
  default: ''
},
profilePicturePublicId: {
  type: String,
  default: ''
}
