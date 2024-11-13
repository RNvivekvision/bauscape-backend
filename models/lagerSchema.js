'use strict';

const mongoose = require('mongoose');

const lagerSchema = new mongoose.Schema(
    {
        serialNumber: { type: Number },
        uniqueIdentifier: { type: String },
        name: { type: String, required: true, trim: true },
        city: { type: mongoose.Schema.Types.ObjectId, ref: 'city', default: null },
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('lager', lagerSchema);
