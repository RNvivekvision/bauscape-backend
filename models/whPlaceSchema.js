'use strict';

const mongoose = require('mongoose');

const whPlaceSchema = new mongoose.Schema(
    {
        serialNumber: { type: Number },
        uniqueIdentifier: { type: String },
        lager: { type: mongoose.Schema.Types.ObjectId, ref: 'lager', default: null },
        city: { type: mongoose.Schema.Types.ObjectId, ref: 'city', default: null },
        rackNumber: { type: String, required: true, trim: true },
        rackSelfNumber: [{ type: String, required: true, trim: true }],
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('whPlace', whPlaceSchema);
