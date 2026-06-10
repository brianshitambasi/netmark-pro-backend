const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createProspect,
  getProspects,
  getProspectById,
  updateProspect,
  deleteProspect
} = require('../controllers/prospectController');

// All routes require authentication
router.use(protect);

// Main CRUD routes
router.route('/')
  .get(getProspects)
  .post(createProspect);

router.route('/:id')
  .get(getProspectById)
  .put(updateProspect)
  .delete(deleteProspect);

module.exports = router;
