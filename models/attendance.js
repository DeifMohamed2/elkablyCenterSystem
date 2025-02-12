const { add } = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema(
  {
    studentsPresent: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        amountPaid: { type: Number, required: true },
        feesApplied: { type: Number, required: false },
      },
    ],
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    course: { type: String, required: true },
    isFinalized: { type: Boolean, default: false },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    totalAmount: { type: Number, default: 0 },
    totalFees: { type: Number, required: false, default: 0 },
    invoices : [
      {
        invoiceDetails : { type: String, required: true },
        invoiceAmount: { type: Number, required: true },
        time: { type: String, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      },
    ],
    netProfitToTeacher: {
      amount: { type: Number, required: true },
      feesAmount: { type: Number, required: false },
    },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
