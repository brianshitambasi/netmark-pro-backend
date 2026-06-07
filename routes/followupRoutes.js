const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createFollowup,
  getFollowups,
  getFollowupById,
  whatsappClick,
  markFollowed,
  convertFollowup,
  addObjection,
  resolveObjection,
  updateFollowup,
  deleteFollowup,
  bulkDelete,
  getAnalytics
} = require('../controllers/followupController');

// All routes require authentication
router.use(protect);

// Bulk operations
router.post('/bulk-delete', bulkDelete);
router.get('/analytics', getAnalytics);

// Main CRUD
router.route('/')
  .get(getFollowups)
  .post(createFollowup);

// Action routes
router.put('/:id/whatsapp-click', whatsappClick);
router.put('/:id/mark-followed', markFollowed);
router.put('/:id/convert', convertFollowup);

// Objection handling
router.post('/:id/objections', addObjection);
router.put('/:id/objections/:objectionId/resolve', resolveObjection);

// Individual followup routes
router.route('/:id')
  .get(getFollowupById)
  .put(updateFollowup)
  .delete(deleteFollowup);

module.exports = router;
