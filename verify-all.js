const mongoose = require('mongoose');
require('dotenv').config();

const Followup = require('./models/Followup');

async function verifyAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const zeroAmountCount = await Followup.countDocuments({ totalAmount: 0 });
    const totalCount = await Followup.countDocuments({});
    
    console.log(`Total Follow-ups: ${totalCount}`);
    console.log(`Follow-ups with ZERO amount: ${zeroAmountCount}`);
    
    if (zeroAmountCount > 0) {
      const zeroOnes = await Followup.find({ totalAmount: 0 }).select('name');
      console.log('\n⚠️ Still need amounts for:');
      zeroOnes.forEach(f => console.log(`  - ${f.name}`));
    } else {
      console.log('\n✅ All follow-ups now have amounts set!');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyAll();
