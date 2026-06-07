const mongoose = require('mongoose');

const ProspectSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  alternativePhone: {
    type: String,
    default: ''
  },
  
  // Location Information
  location: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'Kenya' },
    zipCode: { type: String, default: '' },
    landmark: { type: String, default: '' },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Demographic Information
  age: { type: Number, default: null },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  occupation: { type: String, default: '' },
  income: { type: String, default: '' },
  education: { type: String, default: '' },
  
  // Prospect Source
  source: {
    type: String,
    enum: ['referral', 'social_media', 'event', 'cold_call', 'website', 'walk_in', 'other'],
    default: 'other'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
    default: null
  },
  referrerName: { type: String, default: '' },
  
  // Interest & Qualification
  interests: [{
    type: String,
    enum: ['business_opportunity', 'products', 'both', 'not_sure'],
    default: 'business_opportunity'
  }],
  interestLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  painPoints: { type: String, default: '' },
  goals: { type: String, default: '' },
  budget: { type: String, default: '' },
  timeAvailability: { type: String, default: '' },
  
  // Prospect Status (Journey Stage)
  status: {
    type: String,
    enum: [
      'new',                    // Just collected
      'contacted',              // Initial contact made
      'qualified',              // Qualified as potential
      'invited',                // Invited to presentation
      'presentation_scheduled', // Presentation scheduled
      'presentation_done',      // Presentation completed
      'follow_up',              // In follow-up stage
      'negotiation',            // Negotiating terms
      'enrolled',               // Joined business
      'customer',               // Became customer
      'not_interested',         // Not interested
      'lost'                    // Lost prospect
    ],
    default: 'new'
  },
  
  // Invitation Tracking
  invitations: [{
    type: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'text', 'in_person'],
      default: 'whatsapp'
    },
    sentAt: { type: Date, default: Date.now },
    eventType: { type: String, default: 'presentation' },
    eventDate: Date,
    eventLocation: String,
    eventLink: String,
    response: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'maybe'],
      default: 'pending'
    },
    responseDate: Date,
    notes: String
  }],
  
  // Presentation Tracking
  presentations: [{
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['one_on_one', 'group', 'webinar', 'event', 'virtual'],
      default: 'one_on_one'
    },
    attended: { type: Boolean, default: false },
    duration: Number, // minutes
    presenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    objections: [String],
    interestLevel: { type: Number, min: 1, max: 10 },
    nextSteps: String
  }],
  
  // Follow-up Activities
  followUps: [{
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'meeting', 'text', 'visit'],
      default: 'call'
    },
    purpose: String,
    notes: String,
    outcome: String,
    nextFollowUpDate: Date,
    completed: { type: Boolean, default: true }
  }],
  
  // Communication Log
  communications: [{
    date: { type: Date, default: Date.now },
    channel: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'sms', 'in_person', 'social_media'],
      default: 'whatsapp'
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound'
    },
    summary: String,
    notes: String,
    followUpNeeded: { type: Boolean, default: false },
    followUpDate: Date
  }],
  
  // Documents & Media
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Business Opportunity Interest
  businessInterest: {
    level: { type: Number, min: 1, max: 10, default: 5 },
    timeline: { type: String, default: '' },
    investmentCapacity: { type: String, default: '' },
    previousExperience: { type: String, default: '' },
    teamInterest: { type: Boolean, default: false },
    leadershipInterest: { type: Boolean, default: false }
  },
  
  // Product Interest
  productInterest: {
    products: [String],
    totalValue: { type: Number, default: 0 },
    recurringInterest: { type: Boolean, default: false }
  },
  
  // Enrollment Details
  enrollment: {
    date: Date,
    package: String,
    sponsor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sponsorName: String,
    enrollmentId: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'partial'],
      default: 'pending'
    },
    amount: { type: Number, default: 0 }
  },
  
  // Tags & Categories
  tags: [{
    type: String,
    trim: true
  }],
  categories: [{
    type: String,
    enum: ['hot', 'warm', 'cold', 'lead', 'prospect', 'customer', 'distributor'],
    default: 'prospect'
  }],
  
  // Priority
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  
  // Score (based on engagement, interest, etc.)
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Last Activity
  lastContactDate: { type: Date, default: Date.now },
  lastActivity: { type: String, default: '' },
  
  // Next Scheduled Action
  nextAction: {
    type: String,
    default: ''
  },
  nextActionDate: { type: Date, default: null },
  
  // Assigned To
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notes
  notes: { type: String, default: '' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
ProspectSchema.index({ name: 1, phone: 1 });
ProspectSchema.index({ status: 1, assignedTo: 1 });
ProspectSchema.index({ priority: 1, score: 1 });
ProspectSchema.index({ location: 1 });
ProspectSchema.index({ tags: 1 });
ProspectSchema.index({ nextActionDate: 1 });

// Virtual for full address
ProspectSchema.virtual('fullAddress').get(function() {
  const parts = [this.location.address, this.location.city, this.location.state, this.location.country];
  return parts.filter(p => p).join(', ');
});

// Virtual for days since last contact
ProspectSchema.virtual('daysSinceLastContact').get(function() {
  const diff = new Date() - this.lastContactDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Virtual for prospect stage
ProspectSchema.virtual('stage').get(function() {
  const stages = {
    'new': 'New Prospect',
    'contacted': 'Contacted',
    'qualified': 'Qualified',
    'invited': 'Invited',
    'presentation_scheduled': 'Presentation Scheduled',
    'presentation_done': 'Presentation Done',
    'follow_up': 'Follow Up',
    'negotiation': 'Negotiation',
    'enrolled': 'Enrolled',
    'customer': 'Customer'
  };
  return stages[this.status] || this.status;
});

// Pre-save middleware to update score
ProspectSchema.pre('save', function(next) {
  // Calculate prospect score based on various factors
  let score = 0;
  
  // Interest level contributes up to 30 points
  score += (this.interestLevel / 10) * 30;
  
  // Response to invitations (if any)
  const acceptedInvites = this.invitations.filter(i => i.response === 'accepted').length;
  score += Math.min(acceptedInvites * 10, 20);
  
  // Presentation attendance
  const attendedPresentations = this.presentations.filter(p => p.attended).length;
  score += Math.min(attendedPresentations * 15, 30);
  
  // Follow-up engagement
  const followUpsCount = this.followUps.length;
  score += Math.min(followUpsCount * 5, 20);
  
  this.score = Math.min(score, 100);
  this.updatedAt = Date.now();
  
  next();
});

module.exports = mongoose.model('Prospect', ProspectSchema);
