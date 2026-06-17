const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  updateProfile, 
  changePassword,
  updateProfilePicture,
  removeProfilePicture
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Profile picture routes
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.delete('/profile-picture', protect, removeProfilePicture);

module.exports = router;
