const Template = require('../models/Template');

// @desc    Create template
// @route   POST /api/templates
exports.createTemplate = async (req, res) => {
  try {
    const { name, message, type, category, variables, isDefault } = req.body;
    
    const template = new Template({
      name,
      message,
      type,
      category,
      variables: variables || [],
      isDefault: isDefault || false,
      createdBy: req.user.id
    });
    
    await template.save();
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all templates
// @route   GET /api/templates
exports.getTemplates = async (req, res) => {
  try {
    const { type, category } = req.query;
    let query = { createdBy: req.user.id };
    
    if (type) query.type = type;
    if (category) query.category = category;
    
    const templates = await Template.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: templates,
      total: templates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get template by ID
// @route   GET /api/templates/:id
exports.getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update template
// @route   PUT /api/templates/:id
exports.updateTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    template.usageCount += 1;
    await template.save();
    
    res.json({
      success: true,
      data: template,
      message: 'Template updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Render template with variables
// @route   POST /api/templates/:id/render
exports.renderTemplate = async (req, res) => {
  try {
    const { variables } = req.body;
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    const renderedMessage = template.render(variables);
    
    res.json({
      success: true,
      data: {
        original: template.message,
        rendered: renderedMessage,
        variables: variables
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete template
// @route   DELETE /api/templates/:id
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    await template.deleteOne();
    
    res.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
