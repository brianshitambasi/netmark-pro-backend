const express = require('express');
const router = express.Router();
const {
  updateProfilePicture,
  removeProfilePicture, 
  register, 
  login, 
  getMe, 
  updateProfile, 
  changePassword 
} = require('../controllers/authController');
const {
  updateProfilePicture,
  removeProfilePicture, protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;

// Profile picture routes
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.delete('/profile-picture', protect, removeProfilePicture);
