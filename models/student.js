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
    barCode: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;