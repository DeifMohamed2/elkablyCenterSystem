const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const billingSchema = new Schema(
    {
        billName: {
            type: String,
            required: true,
        },
        billAmount: {
            type: Number,
            required: true,
        },
        billNote: {
            type: String,
            required: true,
        },
        billPhoto: {
            type: String,
            required: false,
        },
        employee:{
                type: Schema.Types.ObjectId,
                ref: 'Employee',
                required: true,
        },

    },
    { timestamps: true }
);


const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;