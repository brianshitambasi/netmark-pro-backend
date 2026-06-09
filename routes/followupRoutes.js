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
  updateFollowup,
  deleteFollowup,
  rescheduleFollowup,
  quickReschedule,
  getFollowupHistory,
  getAnalytics
} = require('../controllers/followupController');

router.use(protect);

// Analytics
router.get('/analytics', getAnalytics);

// Reschedule endpoints
router.put('/:id/reschedule', rescheduleFollowup);
router.post('/:id/quick-reschedule', quickReschedule);
router.get('/:id/history', getFollowupHistory);

// Action endpoints
router.put('/:id/whatsapp-click', whatsappClick);
router.put('/:id/mark-followed', markFollowed);
router.put('/:id/convert', convertFollowup);

// Main CRUD
router.route('/')
  .get(getFollowups)
  .post(createFollowup);

router.route('/:id')
  .get(getFollowupById)
  .put(updateFollowup)
  .delete(deleteFollowup);

module.exports = router;
