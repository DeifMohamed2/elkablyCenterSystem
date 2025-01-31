const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    studentName: {
      type: String,
      required: true,
    },
    studentPhoneNumber: {
      type: String,
      required: true,
    },
    studentParentPhone: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    studentTeacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    attendanceNumber: {
      type: Number,
      default: 0,
      required: false,
    },
    studentAmount: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['perSession', 'perCourse'],
      required: true,
    },
    amountRemaining: {
      type: Number,
      required: true,
    },
    amountRemainingSessions: {  
      type: Number,
      required: false,
      default : 0,
    },
    paidHistory: [
      {
        amount: {
          type: Number,
          required: false,
        },
        date: {
          type: Date,
          required: false,
        },
        employee: {
          type: Schema.Types.ObjectId,
          ref: 'Employee',
          required: false,
        },
      },
    ],
    barCode: {
      type: String,
      required: false,
    },
    studentCode: {
      type: String,
      required: false,
      unique: true,
    },

  },
  { timestamps: true }
);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;