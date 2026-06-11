const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['cash', 'mpesa', 'bank', 'cheque', 'card'], default: 'mpesa' },
  transactionId: { type: String, default: '' },
  reference: { type: String, default: '' },
  notes: { type: String, default: '' },
  receiptUrl: { type: String, default: '' },
  isDeposit: { type: Boolean, default: false },
  installmentNumber: { type: Number, default: null }
});

const PaymentScheduleSchema = new mongoose.Schema({
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  paidDate: { type: Date, default: null },
  transactionId: { type: String, default: '' },
  notes: { type: String, default: '' }
});

const FollowupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  category: { type: String, enum: ['hot', 'warm', 'cold', 'converted'], default: 'warm' },
  source: { type: String, enum: ['referral', 'social_media', 'event', 'cold_call', 'website', 'other'], default: 'other' },
  interestLevel: { type: Number, min: 1, max: 10, default: 5 },
  nextCallDate: { type: Date, required: true, index: true },
  preferredContactTime: { type: String, enum: ['morning', 'afternoon', 'evening', 'any'], default: 'any' },
  notes: { type: String, default: '' },
  lastConversation: { type: String, default: '' },
  painPoints: { type: String, default: '' },
  objections: [{
    objection: String,
    resolved: { type: Boolean, default: false },
    resolutionNotes: String,
    date: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['pending', 'followed', 'converted', 'missed', 'cancelled'], default: 'pending' },
  accountStatus: { type: String, enum: ['not_started', 'in_progress', 'completed', 'on_hold'], default: 'not_started' },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid', 'overdue', 'deposit_paid', 'installment'], default: 'pending' },
  paymentPlan: { type: String, enum: ['full', 'partial', 'installment', 'deposit', 'subscription'], default: 'full' },
  totalAmount: { type: Number, default: 0, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  remainingBalance: { type: Number, default: 0 },
  partialAmount: { type: Number, default: 0 },
  partialDeadline: { type: Date, default: null },
  depositAmount: { type: Number, default: 0 },
  depositPaid: { type: Boolean, default: false },
  depositDeadline: { type: Date, default: null },
  installmentCount: { type: Number, default: 1 },
  currentInstallment: { type: Number, default: 0 },
  installmentAmount: { type: Number, default: 0 },
  paymentSchedule: [PaymentScheduleSchema],
  payments: [PaymentSchema],
  accountOpened: { type: Boolean, default: false },
  accountOpenedDate: { type: Date, default: null },
  accountNumber: { type: String, default: '' },
  packageName: { type: String, default: '' },
  packagePrice: { type: Number, default: 0 },
  whatsappClicked: { type: Boolean, default: false },
  whatsappClickedAt: { type: Date, default: null },
  whatsappMessages: [{
    message: String,
    sentAt: { type: Date, default: Date.now },
    templateUsed: String
  }],
  followedAt: { type: Date, default: null },
  followupCount: { type: Number, default: 0 },
  missedCount: { type: Number, default: 0 },
  redAlertCount: { type: Number, default: 0 },
  lastRemindedAt: { type: Date, default: null },
  followupHistory: [{
    action: { type: String, enum: [
      'created', 'whatsapp_click', 'marked_followed', 'converted', 'missed',
      'reminder_sent', 'category_changed', 'date_changed', 'note_added',
      'objection_raised', 'objection_resolved', 'payment_made', 'account_opened',
      'payment_plan_set', 'installment_paid', 'deposit_paid', 'rescheduled'
    ]},
    timestamp: { type: Date, default: Date.now },
    notes: String,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  convertedAt: { type: Date, default: null },
  conversionType: { type: String, enum: ['customer', 'team_member', 'both', null], default: null },
  conversionValue: { type: Number, default: 0 },
  salesAmount: { type: Number, default: 0, min: 0 },
  commissionEarned: { type: Number, default: 0, min: 0 },
  products: [{ name: String, price: Number, quantity: { type: Number, default: 1 } }],
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Followup', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tags: [{ type: String, trim: true }],
  customFields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

FollowupSchema.index({ nextCallDate: 1, status: 1 });
FollowupSchema.index({ createdBy: 1, status: 1 });
FollowupSchema.index({ paymentStatus: 1, paymentPlan: 1 });

FollowupSchema.virtual('paymentProgress').get(function() {
  if (this.totalAmount === 0) return 0;
  return (this.amountPaid / this.totalAmount) * 100;
});

FollowupSchema.virtual('remainingPercentage').get(function() {
  if (this.totalAmount === 0) return 0;
  return ((this.totalAmount - this.amountPaid) / this.totalAmount) * 100;
});

FollowupSchema.virtual('nextInstallment').get(function() {
  if (this.paymentPlan !== 'installment') return null;
  const nextPending = this.paymentSchedule.find(s => s.status === 'pending');
  return nextPending;
});

FollowupSchema.pre('save', function(next) {
  this.remainingBalance = this.totalAmount - this.amountPaid;
  
  if (this.paymentPlan === 'full') {
    if (this.remainingBalance <= 0) this.paymentStatus = 'paid';
    else if (this.amountPaid > 0) this.paymentStatus = 'partial';
    else this.paymentStatus = 'pending';
  } else if (this.paymentPlan === 'deposit') {
    if (this.depositPaid && this.remainingBalance <= 0) this.paymentStatus = 'paid';
    else if (this.depositPaid) this.paymentStatus = 'deposit_paid';
    else this.paymentStatus = 'pending';
  } else if (this.paymentPlan === 'installment') {
    const allPaid = this.paymentSchedule.every(s => s.status === 'paid');
    if (allPaid) this.paymentStatus = 'paid';
    else this.paymentStatus = 'installment';
  } else if (this.paymentPlan === 'partial') {
    if (this.remainingBalance <= 0) this.paymentStatus = 'paid';
    else if (this.amountPaid > 0) this.paymentStatus = 'partial';
    else this.paymentStatus = 'pending';
  }
  
  if (this.nextCallDate < new Date() && this.status === 'pending') {
    this.status = 'missed';
    this.missedCount += 1;
  }
  
  this.updatedAt = Date.now();
  
  if (this.isModified('status') && this.status === 'followed' && !this.followedAt) {
    this.followupCount += 1;
    this.followedAt = new Date();
  }
  
  if (this.isModified('status') && this.status === 'converted' && !this.convertedAt) {
    this.convertedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Followup', FollowupSchema);
