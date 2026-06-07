const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createProspect,
  getProspects,
  getProspectById,
  sendInvitation,
  recordPresentation,
  addFollowUp,
  enrollProspect,
  updateProspect,
  deleteProspect,
  getPipeline,
  getTodayFollowups
} = require('../controllers/prospectController');

router.use(protect);

router.route('/')
  .get(getProspects)
  .post(createProspect);

router.get('/pipeline', getPipeline);
router.get('/today-followups', getTodayFollowups);

router.post('/:id/invite', sendInvitation);
router.post('/:id/presentation', recordPresentation);
router.post('/:id/followup', addFollowUp);
router.put('/:id/enroll', enrollProspect);

router.route('/:id')
  .get(getProspectById)
  .put(updateProspect)
  .delete(deleteProspect);

module.exports = router;
