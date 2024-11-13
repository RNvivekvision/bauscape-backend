'use strict';

const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('designation', designationSchema);
