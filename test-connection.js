const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('Ì≥° Testing MongoDB connection...');
    console.log('Ì≥ç Database:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('‚úÖ MongoDB Connected Successfully!');
    
    // Get connection info
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`Ì≥ä Database: ${db.databaseName}`);
    console.log(`Ì≥Å Collections: ${collections.map(c => c.name).join(', ') || 'none yet'}`);
    
    await mongoose.disconnect();
    console.log('Ìæâ Connection test passed!');
  } catch (error) {
    console.error('‚ùå Connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();
