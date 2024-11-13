'use strict';

const mongoose = require('mongoose');

const timeTrackingSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        date: { type: Date, default: Date.now },
        timeEntries: [
            {
                type: { type: String, trim: true, default: '' },
                start: { type: String, trim: true, default: '' },
                end: { type: String, trim: true, default: '' },
                lat: { type: String, trim: true, default: '' },
                long: { type: String, trim: true, default: '' },
            }
        ],
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

timeTrackingSchema.index({ date: 1 });

module.exports = mongoose.model('timetracking', timeTrackingSchema);
