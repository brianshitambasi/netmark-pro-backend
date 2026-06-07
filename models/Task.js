const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
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
    enum: ['call', 'whatsapp', 'email', 'meeting', 'research', 'followup', 'training', 'other'],
    default: 'followup'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['followup', 'event', 'goal', 'none'],
      default: 'none'
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  subTasks: [{
    title: String,
    completed: { type: Boolean, default: false }
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
TaskSchema.index({ dueDate: 1, status: 1 });
TaskSchema.index({ createdBy: 1, status: 1 });
TaskSchema.index({ priority: 1, dueDate: 1 });

// Virtual for is overdue
TaskSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status === 'pending';
});

// Virtual for urgency color
TaskSchema.virtual('urgencyColor').get(function() {
  const colors = {
    low: '#10b981',    // green
    medium: '#f59e0b', // orange
    high: '#ef4444',   // red
    urgent: '#dc2626'  // dark red
  };
  return colors[this.priority];
});

// Pre-save middleware
TaskSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
