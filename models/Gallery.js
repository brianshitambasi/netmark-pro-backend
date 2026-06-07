const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  type: {
    type: String,
    enum: ['image', 'video', 'document'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['testimonial', 'event', 'training', 'product_demo', 'team_photo', 'certificate', 'other'],
    required: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  date: {
    type: Date,
    default: Date.now
  },
  publicId: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 0
  },
  width: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // For videos in seconds
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shared: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  shareableLink: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
GallerySchema.index({ category: 1, createdAt: -1 });
GallerySchema.index({ createdBy: 1, category: 1 });
GallerySchema.index({ tags: 1 });

// Virtual for file size formatted
GallerySchema.virtual('sizeFormatted').get(function() {
  if (this.size < 1024) return `${this.size} B`;
  if (this.size < 1048576) return `${(this.size / 1024).toFixed(2)} KB`;
  return `${(this.size / 1048576).toFixed(2)} MB`;
});

// Virtual for media type icon
GallerySchema.virtual('icon').get(function() {
  const icons = {
    image: 'í¶¼ï¸',
    video: 'í¾¥',
    document: 'í³„'
  };
  return icons[this.type] || 'í³Ž';
});

// Pre-save middleware
GallerySchema.pre('save', function(next) {
  // Generate shareable link if public
  if (this.isPublic && !this.shareableLink) {
    this.shareableLink = `/share/${this._id}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Gallery', GallerySchema);
