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
      unique: true,
    },
    studentParentPhone: {
      type: String,
      required: true,
    },
    studentTeacher: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
      },
    ],
    schoolName: {
      type: String,
      required: false,
    },
    attendanceNumber: {
      type: Number,
      default: 0,
      required: false,
    },
    studentAmount: {
      type: Number,
      default: 0,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['perSession', 'perCourse'],
      required: true,
    },

    selectedTeachers: [
      {
        teacherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Teacher',
          required: true,
        },
        courses: [
          {
            courseName: { type: String, required: true },
            amountPay: { type: Number, required: true },
            registerPrice: { type: Number, required: true },
            amountRemaining: { type: Number, required: true },
          },
        ],
      },
    ],
    amountRemaining: {
      type: Number,
      required: true,
    },
    amountRemainingSessions: {
      type: Number,
      required: false,
      default: 0,
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
      required: true,
      unique: true,
      validate: {
        validator: function(v) {
          // Ensure the code follows the pattern: 'G' + 4 digits
          return /^G\d{4}$/.test(v);
        },
        message: 'Student code must be G followed by 4 digits (e.g., G1234)'
      }
    },
  },
  { timestamps: true }
);

// Add indexes for better performance
studentSchema.index({ studentCode: 1 }, { unique: true });
studentSchema.index({ studentPhoneNumber: 1 }, { unique: true });
studentSchema.index({ barCode: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;