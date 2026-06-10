const Prospect = require('../models/Prospect');
const User = require('../models/User');

// @desc    Create new prospect
exports.createProspect = async (req, res) => {
  try {
    const prospect = new Prospect({ 
      ...req.body, 
      assignedTo: req.user.id,
      pipelineStage: 'lead'
    });
    await prospect.save();
    res.status(201).json({ success: true, data: prospect, message: 'Prospect added successfully' });
  } catch (error) {
    console.error('Create prospect error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all prospects
exports.getProspects = async (req, res) => {
  try {
    const prospects = await Prospect.find({ assignedTo: req.user.id }).sort({ createdAt: -1 });
    
    // Summary based on pipelineStage
    const summary = {
      total: prospects.length,
      qualified: prospects.filter(p => p.pipelineStage === 'qualified').length,
      invited: prospects.filter(p => p.pipelineStage === 'invited').length,
      presented: prospects.filter(p => p.pipelineStage === 'presented').length,
      negotiation: prospects.filter(p => p.pipelineStage === 'negotiation').length,
      enrolled: prospects.filter(p => p.pipelineStage === 'enrolled').length
    };
    
    res.json({ success: true, data: prospects, summary });
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single prospect
exports.getProspectById = async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ success: false, message: 'Prospect not found' });
    }
    res.json({ success: true, data: prospect });
  } catch (error) {
    console.error('Get prospect by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update prospect
exports.updateProspect = async (req, res) => {
  try {
    const { pipelineStage, qualificationNotes, invitationDetails, enrollmentDetails } = req.body;
    
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ success: false, message: 'Prospect not found' });
    }
    
    // Update pipeline stage
    if (pipelineStage) {
      prospect.pipelineStage = pipelineStage;
      // Add timestamp based on stage
      if (pipelineStage === 'qualified') prospect.qualifiedAt = new Date();
      if (pipelineStage === 'invited') prospect.invitedAt = new Date();
      if (pipelineStage === 'presented') prospect.presentedAt = new Date();
      if (pipelineStage === 'enrolled') prospect.enrolledAt = new Date();
    }
    
    // Update other fields
    if (qualificationNotes !== undefined) prospect.qualificationNotes = qualificationNotes;
    if (invitationDetails) prospect.invitationDetails = { ...prospect.invitationDetails, ...invitationDetails };
    if (enrollmentDetails) prospect.enrollmentDetails = { ...prospect.enrollmentDetails, ...enrollmentDetails };
    
    // Update basic fields if provided
    if (req.body.name) prospect.name = req.body.name;
    if (req.body.phone) prospect.phone = req.body.phone;
    if (req.body.email) prospect.email = req.body.email;
    if (req.body.occupation) prospect.occupation = req.body.occupation;
    if (req.body.interestLevel) prospect.interestLevel = req.body.interestLevel;
    if (req.body.notes) prospect.notes = req.body.notes;
    if (req.body.location) prospect.location = { ...prospect.location, ...req.body.location };
    
    await prospect.save();
    
    res.json({ success: true, data: prospect, message: 'Prospect updated successfully' });
  } catch (error) {
    console.error('Update prospect error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete prospect
exports.deleteProspect = async (req, res) => {
  try {
    await Prospect.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Prospect deleted successfully' });
  } catch (error) {
    console.error('Delete prospect error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
