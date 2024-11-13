'user strict';

const mongoose = require('mongoose');

const stammUserDocumentSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        type: { type: String, trim: true, default: '' },
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'stammuserproject', default: null },
        document: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
        stammUser: { type: mongoose.Schema.Types.ObjectId, ref: 'stammuser', default: null },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('stammuserdocument', stammUserDocumentSchema);