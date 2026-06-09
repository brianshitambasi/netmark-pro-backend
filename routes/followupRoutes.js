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
  addPayment,
  openAccount,
  updatePaymentDetails,
  getAnalytics,
  setPaymentPlan,
  payInstallment,
  payDeposit,
  setTotalAmount
} = require('../controllers/followupController');

// Check if required functions exist
const requiredFunctions = [
  'createFollowup', 'getFollowups', 'getFollowupById', 'whatsappClick',
  'markFollowed', 'convertFollowup', 'updateFollowup', 'deleteFollowup',
  'rescheduleFollowup', 'quickReschedule', 'addPayment', 'openAccount',
  'updatePaymentDetails', 'getAnalytics', 'setPaymentPlan', 'payInstallment',
  'payDeposit', 'setTotalAmount'
];

requiredFunctions.forEach(fn => {
  if (typeof eval(fn) !== 'function') {
    console.error(`ERROR: Function ${fn} is not properly exported`);
  }
});

router.use(protect);

// Analytics
router.get('/analytics', getAnalytics);

// Reschedule endpoints
router.put('/:id/reschedule', rescheduleFollowup);
router.post('/:id/quick-reschedule', quickReschedule);

// Payment and Account endpoints
router.post('/:id/payment', addPayment);
router.post('/:id/open-account', openAccount);
router.put('/:id/payment-details', updatePaymentDetails);

// Payment Plan endpoints
router.post('/:id/set-payment-plan', setPaymentPlan);
router.post('/:id/pay-installment', payInstallment);
router.post('/:id/pay-deposit', payDeposit);

// Set total amount for existing followup
router.put('/:id/set-amount', setTotalAmount);

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
