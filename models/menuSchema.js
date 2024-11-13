'use strict';

const mongoose = require('mongoose');

const childMenuSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
    }
);

const menuSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        children: [childMenuSchema],
        isOrganizerMenu: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('menu', menuSchema);
