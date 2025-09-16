const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const superViserSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
      default: 'Supervisor',
    },
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const SuperViser = mongoose.model('SuperViser', superViserSchema);

module.exports = SuperViser;


