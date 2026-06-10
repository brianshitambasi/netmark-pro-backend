const mongoose = require('mongoose');
require('dotenv').config();

const Followup = require('./models/Followup');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const followups = await Followup.find({}).select('name totalAmount amountPaid remainingBalance paymentStatus');
    
    console.log('Followups in database:');
    console.log('='.repeat(60));
    
    followups.forEach(f => {
      console.log(`Name: ${f.name}`);
      console.log(`  Total Amount: KSh ${f.totalAmount || 0}`);
      console.log(`  Amount Paid: KSh ${f.amountPaid || 0}`);
      console.log(`  Remaining: KSh ${f.remainingBalance || 0}`);
      console.log(`  Status: ${f.paymentStatus || 'pending'}`);
      console.log('-'.repeat(40));
    });
    
    console.log(`\nTotal count: ${followups.length}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
