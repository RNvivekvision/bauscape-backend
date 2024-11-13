'user strict';

const mongoose = require('mongoose');

const stammUsersSchema = new mongoose.Schema(
    {
        company: { type: String, trim: true, default: '' },
        firstName: { type: String, trim: true, default: '' },
        lastName: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        address: {
            streetNo: { type: String, trim: true, default: '' },
            city: { type: String, trim: true, default: '' },
            zip: { type: Number, trim: true, default: 0 },
        },
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        otherContact: [
            {
                name: { type: String, trim: true, default: '' },
                email: { type: String, trim: true, default: '' },
                phone: { type: String, trim: true, default: '' }
            }
        ],
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('stammuser', stammUsersSchema);