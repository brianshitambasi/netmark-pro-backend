const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  renderTemplate
} = require('../controllers/templateController');

router.use(protect);

router.route('/')
  .get(getTemplates)
  .post(createTemplate);

router.post('/:id/render', renderTemplate);

router.route('/:id')
  .get(getTemplateById)
  .put(updateTemplate)
  .delete(deleteTemplate);

module.exports = router;
