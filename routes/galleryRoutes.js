const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  uploadMedia,
  getGallery,
  getGalleryItem,
  updateGalleryItem,
  likeGalleryItem,
  shareGalleryItem,
  deleteGalleryItem,
  bulkDeleteGallery
} = require('../controllers/galleryController');

router.use(protect);

// Bulk operations
router.post('/bulk-delete', bulkDeleteGallery);

// Main routes
router.route('/')
  .get(getGallery)
  .post(upload.single('file'), uploadMedia);

// Interaction routes
router.put('/:id/like', likeGalleryItem);
router.put('/:id/share', shareGalleryItem);

// Individual item routes
router.route('/:id')
  .get(getGalleryItem)
  .put(updateGalleryItem)
  .delete(deleteGalleryItem);

module.exports = router;
