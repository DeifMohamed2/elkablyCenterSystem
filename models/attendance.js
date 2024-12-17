const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema(
  {
    studentsPresent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    isFinalized: { type: Boolean, default: false },
    date: { type: String, required: true },

  },
  { timestamps: true }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
