const mongoose = require('mongoose');
require('dotenv').config();

const Followup = require('./models/Followup');

async function fixPaidZero() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Update followups that are marked as paid but have zero totalAmount
    const result = await Followup.updateMany(
      { paymentStatus: 'paid', totalAmount: 0 },
      { 
        $set: { 
          totalAmount: 5000, 
          remainingBalance: 0
        } 
      }
    );
    
    console.log(`âœ… Fixed ${result.modifiedCount} followups that were paid but had zero amount`);
    
    // Show fixed records
    const fixed = await Followup.find({ paymentStatus: 'paid', totalAmount: { $gt: 0 } }).select('name totalAmount amountPaid paymentStatus');
    console.log('\ní³‹ Fixed followups:');
    fixed.forEach(f => {
      console.log(`${f.name}: KSh ${f.totalAmount} total, KSh ${f.amountPaid || 0} paid`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixPaidZero();
