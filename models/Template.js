const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    unique: true
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  type: {
    type: String,
    enum: ['whatsapp', 'email', 'sms', 'call_script'],
    required: true
  },
  category: {
    type: String,
    enum: ['followup', 'recruitment', 'sales', 'event', 'welcome', 'closing', 'objection_handling'],
    required: true
  },
  variables: [{
    name: String,
    description: String,
    required: Boolean
  }],
  example: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
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
  timestamps: true
});

// Indexes
TemplateSchema.index({ createdBy: 1, category: 1 });
TemplateSchema.index({ type: 1, category: 1 });
TemplateSchema.index({ isDefault: 1 });

// Method to render message with variables
TemplateSchema.methods.render = function(variables = {}) {
  let renderedMessage = this.message;
  for (const [key, value] of Object.entries(variables)) {
    renderedMessage = renderedMessage.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return renderedMessage;
};

// Pre-save middleware
TemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Template', TemplateSchema);
