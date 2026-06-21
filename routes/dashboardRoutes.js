const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getDashboardStats,
  getCalendarData,
  getAnalytics
} = require('../controllers/dashboardController');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/calendar', getCalendarData);
router.get('/analytics', getAnalytics);

module.exports = router;

// Add this route
router.get('/activity', protect, getDailyActivity);
