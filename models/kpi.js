const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const kpiSchema = new Schema(
    {
        employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        },
        kpiName: {
        type: String,
        required: true,
        },
        kpiNote: {
        type: String,
        required: false,
        default: '',
        },
        kpi: {
        type: Number,
        required: true,
        default: 0,
        },
    },
    { timestamps: true }
);

const KPI = mongoose.model('KPI', kpiSchema);

module.exports = KPI;