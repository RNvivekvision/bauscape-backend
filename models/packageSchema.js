'use strict';

const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        menu: [{ type: mongoose.Schema.Types.ObjectId, ref: 'menu', required: true }],
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('package', packageSchema);
