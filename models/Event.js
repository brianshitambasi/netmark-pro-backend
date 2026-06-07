const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot be more than 2000 characters'],
    default: ''
  },
  type: {
    type: String,
    enum: ['team_meeting', 'training', 'product_launch', 'webinar', 'conference', 'social', 'one_on_one'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    default: null
  },
  time: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  meetingLink: {
    type: String,
    default: ''
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderTime: {
    type: Number, // Minutes before event
    default: 60
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Followup'
    },
    name: String,
    phone: String,
    status: {
      type: String,
      enum: ['invited', 'confirmed', 'attended', 'no_show'],
      default: 'invited'
    },
    rsvpAt: Date
  }],
  notes: {
    type: String,
    default: ''
  },
  resources: [{
    title: String,
    url: String,
    type: String
  }],
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
EventSchema.index({ date: 1, createdBy: 1 });
EventSchema.index({ type: 1, date: 1 });

// Virtual for is upcoming
EventSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date();
});

// Virtual for attendee count
EventSchema.virtual('attendeeCount').get(function() {
  return this.attendees.length;
});

// Virtual for confirmed count
EventSchema.virtual('confirmedCount').get(function() {
  return this.attendees.filter(a => a.status === 'confirmed').length;
});

// Pre-save middleware
EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);
