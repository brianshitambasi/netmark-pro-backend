const mongoose = require('mongoose');
require('dotenv').config();

const Followup = require('./models/Followup');

async function updateRemaining() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Update remaining followups with totalAmount = 0
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
    
    console.log(`‚úÖ Updated ${result.modifiedCount} remaining followups with amount KSh 5,000`);
    
    // Show final summary
    const all = await Followup.find({}).select('name totalAmount amountPaid remainingBalance paymentStatus');
    console.log('\nÌ≥ã FINAL SUMMARY:');
    console.log('='.repeat(70));
    
    let totalRevenue = 0;
    let totalOutstanding = 0;
    
    all.forEach(f => {
      const total = f.totalAmount || 0;
      const paid = f.amountPaid || 0;
      const remaining = total - paid;
      totalRevenue += paid;
      totalOutstanding += remaining;
      
      let statusIcon = '';
      if (f.paymentStatus === 'paid') statusIcon = '‚úÖ PAID';
      else if (f.paymentStatus === 'partial') statusIcon = '‚ö†Ô∏è PARTIAL';
      else statusIcon = '‚è≥ PENDING';
      
      console.log(`${f.name.padEnd(20)}: KSh ${total} total, KSh ${paid} paid, Remaining: KSh ${remaining} - ${statusIcon}`);
    });
    
    console.log('='.repeat(70));
    console.log(`\nÌ≤∞ Total Revenue Collected: KSh ${totalRevenue.toLocaleString()}`);
    console.log(`Ì≥ä Total Outstanding Balance: KSh ${totalOutstanding.toLocaleString()}`);
    
    await mongoose.disconnect();
    console.log('\n‚úÖ All done! Refresh your frontend to see the changes.');
  } catch (error) {
    console.error('Error:', error);
  }
}

updateRemaining();
