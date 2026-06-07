const mongoose = require('mongoose');

const FollowupSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9+\-\s]+$/, 'Please add a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  
  // Lead Classification
  category: {
    type: String,
    enum: ['hot', 'warm', 'cold', 'converted', 'lost'],
    default: 'warm'
  },
  source: {
    type: String,
    enum: ['referral', 'social_media', 'event', 'cold_call', 'website', 'other'],
    default: 'other'
  },
  interestLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  
  // Scheduling
  nextCallDate: {
    type: Date,
    required: [true, 'Follow-up date is required'],
    index: true
  },
  preferredContactTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'any'],
    default: 'any'
  },
  
  // Notes & Details
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot be more than 2000 characters'],
    default: ''
  },
  lastConversation: {
    type: String,
    maxlength: [1000, 'Last conversation cannot be more than 1000 characters']
  },
  painPoints: {
    type: String,
    maxlength: [500, 'Pain points cannot be more than 500 characters']
  },
  objections: [{
    objection: String,
    resolved: { type: Boolean, default: false },
    resolutionNotes: String,
    date: { type: Date, default: Date.now }
  }],
  
  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'followed', 'converted', 'missed', 'cancelled'],
    default: 'pending'
  },
  
  // WhatsApp Tracking
  whatsappClicked: {
    type: Boolean,
    default: false
  },
  whatsappClickedAt: {
    type: Date,
    default: null
  },
  whatsappMessages: [{
    message: String,
    sentAt: { type: Date, default: Date.now },
    templateUsed: String
  }],
  
  // Follow-up History
  followedAt: {
    type: Date,
    default: null
  },
  followupCount: {
    type: Number,
    default: 0
  },
  missedCount: {
    type: Number,
    default: 0
  },
  redAlertCount: {
    type: Number,
    default: 0
  },
  lastRemindedAt: {
    type: Date,
    default: null
  },
  
  // Complete History Log
  followupHistory: [{
    action: {
      type: String,
      enum: [
        'created',
        'whatsapp_click',
        'marked_followed',
        'converted',
        'missed',
        'reminder_sent',
        'category_changed',
        'date_changed',
        'note_added',
        'objection_raised',
        'objection_resolved'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  
  // Conversion Details
  convertedAt: {
    type: Date,
    default: null
  },
  conversionType: {
    type: String,
    enum: ['customer', 'team_member', 'both', null],
    default: null
  },
  conversionValue: {
    type: Number,
    default: 0
  },
  
  // Sales Tracking
  salesAmount: {
    type: Number,
    default: 0,
    min: [0, 'Sales amount cannot be negative']
  },
  commissionEarned: {
    type: Number,
    default: 0,
    min: [0, 'Commission cannot be negative']
  },
  products: [{
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 }
  }],
  
  // Relationships
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Followup',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Tags & Custom Fields
  tags: [{
    type: String,
    trim: true
  }],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
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

// Indexes for faster queries
FollowupSchema.index({ nextCallDate: 1, status: 1 });
FollowupSchema.index({ createdBy: 1, status: 1 });
FollowupSchema.index({ createdBy: 1, nextCallDate: 1 });
FollowupSchema.index({ category: 1, status: 1 });
FollowupSchema.index({ tags: 1 });

// Virtual for days until follow-up
FollowupSchema.virtual('daysUntilFollowup').get(function() {
  const today = new Date();
  const diffTime = this.nextCallDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
FollowupSchema.virtual('isOverdue').get(function() {
  return this.nextCallDate < new Date() && this.status === 'pending';
});

// Virtual for severity level
FollowupSchema.virtual('severity').get(function() {
  if (!this.isOverdue) return 'none';
  const daysOverdue = Math.ceil((new Date() - this.nextCallDate) / (1000 * 60 * 60 * 24));
  if (daysOverdue >= 3) return 'critical';
  if (daysOverdue >= 1) return 'warning';
  return 'info';
});

// Pre-save middleware
FollowupSchema.pre('save', function(next) {
  // Auto-update status based on date
  if (this.nextCallDate < new Date() && this.status === 'pending') {
    this.status = 'missed';
    this.missedCount += 1;
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  // Update followup count when marked as followed
  if (this.isModified('status') && this.status === 'followed' && !this.followedAt) {
    this.followupCount += 1;
    this.followedAt = new Date();
  }
  
  // Handle conversion
  if (this.isModified('status') && this.status === 'converted' && !this.convertedAt) {
    this.convertedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Followup', FollowupSchema);
