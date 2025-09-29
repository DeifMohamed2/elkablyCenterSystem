const mongoose = require('mongoose');

const CollectCenterFeesLogSchema = new mongoose.Schema(
  {
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    attendanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true }],
    totalSessions: { type: Number, required: true, default: 0 },
    totalCenterFees: { type: Number, required: true, default: 0 },
    note: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CollectCenterFeesLog', CollectCenterFeesLogSchema);


