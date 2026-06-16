const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, getNotificationCount } = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.get('/count', getNotificationCount);

module.exports = router;
