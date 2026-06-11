const Gallery = require('../models/Gallery');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Upload media (images, videos, audio)
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

    // Determine file type
    let mediaType = 'image';
    
    if (file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      mediaType = 'audio';
    }

    console.log(`Uploading ${mediaType} file: ${file.originalname}`);

    // Upload to cloudinary
    let resourceType = 'auto';
    if (mediaType === 'image') resourceType = 'image';
    if (mediaType === 'video' || mediaType === 'audio') resourceType = 'video';
    
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `netmark-pro/${req.user.id}`,
      resource_type: resourceType
    });
    
    const galleryItem = new Gallery({
      title: title || file.originalname,
      type: mediaType,
      url: result.secure_url,
      thumbnail: result.thumbnail_url || result.secure_url,
      category: category || 'other',
      description: description || '',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      publicId: result.public_id,
      size: result.bytes,
      duration: result.duration ? Math.round(result.duration) : 0,
      createdBy: req.user.id
    });
    
    await galleryItem.save();
    
    // Delete local file
    fs.unlinkSync(file.path);
    
    res.status(201).json({
      success: true,
      data: galleryItem,
      message: `${mediaType} uploaded successfully`
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

// @desc    Get all gallery items
exports.getGallery = async (req, res) => {
  try {
    const { category, type, search, page = 1, limit = 20 } = req.query;
    let query = { createdBy: req.user.id };
    
    if (category && category !== 'all') query.category = category;
    if (type && type !== 'all') query.type = type;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const items = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Gallery.countDocuments(query);
    
    const summary = {
      total,
      images: await Gallery.countDocuments({ createdBy: req.user.id, type: 'image' }),
      videos: await Gallery.countDocuments({ createdBy: req.user.id, type: 'video' }),
      audio: await Gallery.countDocuments({ createdBy: req.user.id, type: 'audio' })
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
exports.getGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update gallery item
exports.updateGalleryItem = async (req, res) => {
  try {
    const { title, category, description, tags, isPublic } = req.body;
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    if (title) item.title = title;
    if (category) item.category = category;
    if (description) item.description = description;
    if (tags) item.tags = tags.split(',').map(t => t.trim());
    if (isPublic !== undefined) item.isPublic = isPublic;
    
    await item.save();
    
    res.json({ success: true, data: item, message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete gallery item
exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    let resourceType = 'image';
    if (item.type === 'video') resourceType = 'video';
    if (item.type === 'audio') resourceType = 'video';
    
    await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType });
    await item.deleteOne();
    
    res.json({ success: true, message: `Deleted "${item.title}" from gallery` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete gallery items
exports.bulkDeleteGallery = async (req, res) => {
  try {
    const { ids } = req.body;
    const items = await Gallery.find({ _id: { $in: ids }, createdBy: req.user.id });
    
    for (const item of items) {
      let resourceType = 'image';
      if (item.type === 'video') resourceType = 'video';
      if (item.type === 'audio') resourceType = 'video';
      await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType });
    }
    
    const result = await Gallery.deleteMany({ _id: { $in: ids }, createdBy: req.user.id });
    res.json({ success: true, message: `Deleted ${result.deletedCount} items`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
