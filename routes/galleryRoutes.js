const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  uploadMedia,
  getGallery,
  getGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  bulkDeleteGallery
} = require('../controllers/galleryController');

// All routes require authentication
router.use(protect);

// Main routes
router.route('/')
  .get(getGallery)
  .post(upload.single('file'), uploadMedia);

// Bulk delete
router.post('/bulk-delete', bulkDeleteGallery);

// Individual item routes
router.route('/:id')
  .get(getGalleryItem)
  .put(updateGalleryItem)
  .delete(deleteGalleryItem);

module.exports = router;
