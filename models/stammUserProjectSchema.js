'user strict';

const mongoose = require('mongoose');

const stammUserProjectSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        address: {
            streetNo: { type: String, trim: true, default: '' },
            city: { type: String, trim: true, default: '' },
            zip: { type: Number, trim: true, default: 0 },
        },
        otherContact: [
            {
                name: { type: String, trim: true, default: '' },
                email: { type: String, trim: true, default: '' },
                phone: { type: String, trim: true, default: '' }
            }
        ],
        stammUser: { type: mongoose.Schema.Types.ObjectId, ref: 'stammuser', default: null },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('stammuserproject', stammUserProjectSchema);