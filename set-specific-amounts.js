const mongoose = require('mongoose');
require('dotenv').config();

const Followup = require('./models/Followup');

async function setSpecificAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Define amounts for specific people
    const updates = [
      { name: 'rose', amount: 3000 },
      { name: 'Trizah', amount: 8000 },
      { name: 'Mariam', amount: 20000 },
      { name: 'Nafula Betty', amount: 15000 },
      { name: 'Mellen', amount: 10000 },
      { name: 'Meshack', amount: 5000 },
      { name: 'Sheila', amount: 7000 },
      { name: 'Caroline', amount: 12000 },
      { name: 'Mom ariela', amount: 25000 }
    ];
    
    for (const update of updates) {
      const result = await Followup.findOneAndUpdate(
        { name: update.name, totalAmount: 0 },
        { 
          $set: { 
            totalAmount: update.amount,
            remainingBalance: update.amount,
            paymentStatus: 'pending',
            paymentPlan: 'full'
          } 
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ ${update.name}: Set to KSh ${update.amount}`);
      } else {
        console.log(`⚠️ ${update.name}: Not found or already has amount`);
      }
    }
    
    // Show final summary
    const all = await Followup.find({}).select('name totalAmount amountPaid paymentStatus');
    console.log('\n��� FINAL SUMMARY:');
    console.log('='.repeat(60));
    all.forEach(f => {
      const status = f.paymentStatus === 'paid' ? '✅ PAID' : f.paymentStatus === 'partial' ? '⚠️ PARTIAL' : '⏳ PENDING';
      console.log(`${f.name}: KSh ${f.totalAmount || 0} total, KSh ${f.amountPaid || 0} paid - ${status}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ All done! Refresh your frontend.');
  } catch (error) {
    console.error('Error:', error);
  }
}

setSpecificAmounts();
