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
            required: false,
            default: '',
        },
        billPhoto: {
            type: String,
            required: false,
        },
        billCategory: {
            type: String,
            enum: ['salaries', 'canteen_in', 'canteen_out', 'government_fees', 'electric_invoices', 'equipments', 'other'],
            default: 'other',
            required: true,
        },
        employee:{
                type: Schema.Types.ObjectId,
                ref: 'Employee',
                required: true,
        },
        salaryEmployee: {
                type: Schema.Types.ObjectId,
                ref: 'Employee',
                required: false,
        },

    },
    { timestamps: true }
);


const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;