const mongoose = require('mongoose');

const ProspectSchema = new mongoose.Schema({
  // Basic Information
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  alternativePhone: { type: String, default: '' },
  
  // Location Information
  location: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'Kenya' },
    landmark: { type: String, default: '' }
  },
  
  // Demographic Information
  occupation: { type: String, default: '' },
  
  // Prospect Source
  source: { type: String, enum: ['referral', 'social_media', 'event', 'cold_call', 'website', 'other'], default: 'other' },
  
  // Interest & Qualification
  interests: [{ type: String }],
  interestLevel: { type: Number, min: 1, max: 10, default: 5 },
  notes: { type: String, default: '' },
  
  // Prospect Status (original status - for contact status)
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'invited', 'presentation_scheduled', 'presentation_done', 'follow_up', 'negotiation', 'enrolled', 'customer', 'not_interested', 'lost'],
    default: 'new'
  },
  
  // PIPELINE STAGE - This is what we'll use for the pipeline
  pipelineStage: {
    type: String,
    enum: ['lead', 'qualified', 'invited', 'presented', 'negotiation', 'enrolled'],
    default: 'lead'
  },
  
  // Stage Timestamps
  qualifiedAt: { type: Date, default: null },
  invitedAt: { type: Date, default: null },
  presentedAt: { type: Date, default: null },
  enrolledAt: { type: Date, default: null },
  
  // Stage Notes
  qualificationNotes: { type: String, default: '' },
  
  // Invitation Details
  invitationDetails: {
    method: { type: String, enum: ['whatsapp', 'email', 'call', 'in_person'], default: 'whatsapp' },
    eventName: { type: String, default: '' },
    eventDate: { type: Date, default: null },
    eventLink: { type: String, default: '' },
    attendance: { type: String, enum: ['pending', 'confirmed', 'attended', 'missed'], default: 'pending' }
  },
  
  // Enrollment Details
  enrollmentDetails: {
    package: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    sponsorName: { type: String, default: '' },
    accountNumber: { type: String, default: '' }
  },
  
  // Priority
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  
  // Score
  score: { type: Number, min: 0, max: 100, default: 0 },
  
  // Last Activity
  lastContactDate: { type: Date, default: Date.now },
  
  // Assigned To
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save middleware to update score based on pipelineStage
ProspectSchema.pre('save', function(next) {
  // Calculate score based on pipeline stage
  const stageScores = {
    'lead': 10,
    'qualified': 30,
    'invited': 50,
    'presented': 70,
    'negotiation': 85,
    'enrolled': 100
  };
  
  // Update score based on pipeline stage
  if (this.pipelineStage) {
    this.score = stageScores[this.pipelineStage] || this.score;
  }
  
  // Update timestamps when stage changes
  if (this.isModified('pipelineStage')) {
    if (this.pipelineStage === 'qualified') {
      this.qualifiedAt = new Date();
    } else if (this.pipelineStage === 'invited') {
      this.invitedAt = new Date();
    } else if (this.pipelineStage === 'presented') {
      this.presentedAt = new Date();
    } else if (this.pipelineStage === 'enrolled') {
      this.enrolledAt = new Date();
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Prospect', ProspectSchema);
