const express = require('express');
const router = express.Router();
const {
  setPaymentPlan,
  payInstallment,
  payDeposit, protect } = require('../middleware/auth');
const {
  setPaymentPlan,
  payInstallment,
  payDeposit,
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
  addPayment,
  openAccount,
  updatePaymentDetails,
  getAnalytics
} = require('../controllers/followupController');

router.use(protect);

router.get('/analytics', getAnalytics);
router.put('/:id/reschedule', rescheduleFollowup);
router.post('/:id/quick-reschedule', quickReschedule);
router.put('/:id/whatsapp-click', whatsappClick);
router.put('/:id/mark-followed', markFollowed);
router.put('/:id/convert', convertFollowup);
router.post('/:id/payment', addPayment);
router.post('/:id/open-account', openAccount);
router.put('/:id/payment-details', updatePaymentDetails);

router.route('/')
  .get(getFollowups)
  .post(createFollowup);

router.route('/:id')
  .get(getFollowupById)
  .put(updateFollowup)
  .delete(deleteFollowup);

module.exports = router;

// Payment plan routes
router.post('/:id/set-payment-plan', setPaymentPlan);
router.post('/:id/pay-installment', payInstallment);
router.post('/:id/pay-deposit', payDeposit);
