const mongoose = require('mongoose');

// Define the Teacher Schema
const teacherSchema = new mongoose.Schema(
  {
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
    teacherPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    teacherFees: {
      type: Number,
      required: true,
    },
    paymentType : {
      type: String,
      enum: ['perSession', 'perCourse'],
      required: true,
    },

    schedule: {
      type: Map, // A map to represent the days of the week
      of: [
        {
          startTime: {
            type: String,
            required: true,
          },
          endTime: {
            type: String,
            required: true,
          },
          roomID: {
            type: String,
            required: true,
          },
        },
      ],
    },
    // Courses that the teacher is teaching
    courses: {
      type: [String],
      required: true,
    }

  },
  { timestamps: true }
);

// Create and export the Teacher model
const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
