const mongoose = require('mongoose');
require('dotenv').config();

const Followup = require('./models/Followup');

async function updateAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Update all followups that have totalAmount = 0
    const result = await Followup.updateMany(
      { totalAmount: 0 },
      { 
        $set: { 
          totalAmount: 5000, 
          remainingBalance: 5000,
          paymentStatus: 'pending',
          paymentPlan: 'full'
        } 
      }
    );
    
    console.log(`‚úÖ Updated ${result.modifiedCount} followups with amount KSh 5,000`);
    
    // Verify the update
    const updated = await Followup.find({ totalAmount: { $gt: 0 } }).select('name totalAmount amountPaid remainingBalance paymentStatus');
    console.log('\nÌ≥ã Updated followups (now have amounts):');
    console.log('='.repeat(60));
    
    updated.forEach(f => {
      console.log(`${f.name}: KSh ${f.totalAmount} total, KSh ${f.amountPaid || 0} paid, Status: ${f.paymentStatus}`);
    });
    
    const stillZero = await Followup.countDocuments({ totalAmount: 0 });
    console.log(`\n‚ö†Ô∏è Still have ${stillZero} followups with zero amount (these may be the ones already paid)`);
    
    await mongoose.disconnect();
    console.log('\n‚úÖ Done! Refresh your frontend to see changes.');
  } catch (error) {
    console.error('Error:', error);
  }
}

updateAmounts();
