'use strict';

const mongoose = require('mongoose');

const userTypeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        menu: [
            {
                menu: { type: mongoose.Schema.Types.ObjectId, ref: 'menu', required: true },
                permissions: {
                    hasAccess: { type: Boolean, default: false },
                    canCreate: { type: Boolean, default: false },
                    canUpdate: { type: Boolean, default: false },
                    canDelete: { type: Boolean, default: false }
                },
                children: [
                    {
                        menu: { type: mongoose.Schema.Types.ObjectId, ref: 'menu.children', required: true },
                        permissions: {
                            hasAccess: { type: Boolean, default: false },
                            canCreate: { type: Boolean, default: false },
                            canUpdate: { type: Boolean, default: false },
                            canDelete: { type: Boolean, default: false }
                        }
                    }
                ]
            }
        ],
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        isReadOnly: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('usertype', userTypeSchema);
