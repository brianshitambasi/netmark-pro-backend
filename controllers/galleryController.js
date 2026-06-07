const Gallery = require('../models/Gallery');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Upload media to gallery
// @route   POST /api/gallery/upload
exports.uploadMedia = async (req, res) => {
  try {
    const { title, category, description, tags, isPublic } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `netmark-pro/${req.user.id}`,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    
    // Get video duration if video
    let duration = 0;
    if (result.resource_type === 'video' && result.duration) {
      duration = Math.round(result.duration);
    }
    
    const galleryItem = new Gallery({
      title: title || file.originalname,
      type: result.resource_type,
      url: result.secure_url,
      thumbnail: result.resource_type === 'video' ? result.thumbnail_url : result.secure_url,
      category: category || 'other',
      description: description || '',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      publicId: result.public_id,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration,
      isPublic: isPublic === 'true',
      createdBy: req.user.id
    });
    
    await galleryItem.save();
    
    // Delete local file
    fs.unlinkSync(file.path);
    
    res.status(201).json({
      success: true,
      data: galleryItem,
      message: 'Media uploaded successfully'
    });
  } catch (error) {
    // Clean up file if error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all gallery items
// @route   GET /api/gallery
exports.getGallery = async (req, res) => {
  try {
    const { category, type, search, page = 1, limit = 20 } = req.query;
    let query = { createdBy: req.user.id };
    
    if (category && category !== 'all') query.category = category;
    if (type && type !== 'all') query.type = type;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const items = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Gallery.countDocuments(query);
    
    // Get category counts
    const categoryCounts = await Gallery.aggregate([
      { $match: { createdBy: req.user.id } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const summary = {
      total,
      images: await Gallery.countDocuments({ createdBy: req.user.id, type: 'image' }),
      videos: await Gallery.countDocuments({ createdBy: req.user.id, type: 'video' }),
      categories: categoryCounts
    };
    
    res.json({
      success: true,
      data: items,
      summary,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single gallery item
// @route   GET /api/gallery/:id
exports.getGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Increment view count
    item.views += 1;
    await item.save();
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update gallery item
// @route   PUT /api/gallery/:id
exports.updateGalleryItem = async (req, res) => {
  try {
    const { title, category, description, tags, isPublic } = req.body;
    
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    if (title) item.title = title;
    if (category) item.category = category;
    if (description) item.description = description;
    if (tags) item.tags = tags.split(',').map(t => t.trim());
    if (isPublic !== undefined) item.isPublic = isPublic;
    
    await item.save();
    
    res.json({
      success: true,
      data: item,
      message: 'Item updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like gallery item
// @route   PUT /api/gallery/:id/like
exports.likeGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    item.likes += 1;
    await item.save();
    
    res.json({
      success: true,
      likes: item.likes,
      message: 'Liked!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Share gallery item (increment share count)
// @route   PUT /api/gallery/:id/share
exports.shareGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    item.shared += 1;
    await item.save();
    
    // Generate shareable link
    const shareableLink = `${req.protocol}://${req.get('host')}/share/${item._id}`;
    
    res.json({
      success: true,
      shareableLink,
      shares: item.shared,
      message: 'Share link generated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete gallery item
// @route   DELETE /api/gallery/:id
exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Delete from cloudinary
    await cloudinary.uploader.destroy(item.publicId, {
      resource_type: item.type
    });
    
    await item.deleteOne();
    
    res.json({
      success: true,
      message: `Deleted "${item.title}" from gallery`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk delete gallery items
// @route   POST /api/gallery/bulk-delete
exports.bulkDeleteGallery = async (req, res) => {
  try {
    const { ids } = req.body;
    
    // Get items to delete from cloudinary
    const items = await Gallery.find({ _id: { $in: ids }, createdBy: req.user.id });
    
    // Delete from cloudinary
    for (const item of items) {
      await cloudinary.uploader.destroy(item.publicId, {
        resource_type: item.type
      });
    }
    
    // Delete from database
    const result = await Gallery.deleteMany({
      _id: { $in: ids },
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} items`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
