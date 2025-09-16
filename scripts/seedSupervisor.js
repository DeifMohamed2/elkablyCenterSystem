require('dotenv').config();
const mongoose = require('mongoose');
const SuperViser = require('../models/superViser');

async function run() {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://deif:1qaz2wsx@3devway.aa4i6ga.mongodb.net/elkablyCenter?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUrl);

    const phoneNumber = process.env.SEED_SUPERVISOR_PHONE || '01111111111';
    const password = process.env.SEED_SUPERVISOR_PASSWORD || '123456';
    const name = process.env.SEED_SUPERVISOR_NAME || 'Super Visor';

    const existing = await SuperViser.findOne({ phoneNumber });
    if (existing) {
      console.log('Supervisor already exists:', existing.phoneNumber);
      process.exit(0);
    }

    const sv = new SuperViser({ name, phoneNumber, password, role: 'Supervisor' });
    await sv.save();
    console.log('Created supervisor:', { name: sv.name, phoneNumber: sv.phoneNumber });
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

run();


