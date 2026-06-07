const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'denczbmin',
  api_key: process.env.CLOUDINARY_API_KEY || '911139828565233',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'jp0OmzxQF_qg8vdXPpfnnbgBwIs'
});

module.exports = cloudinary;
