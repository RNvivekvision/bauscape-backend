'user strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        firstName: { type: String, trim: true, default: '' },
        lastName: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        profilePicture: { type: String, trim: true, default: '' },
        password: { type: String, trim: true, default: '' },
        language: { type: String, trim: true, default: 'en' },
        address: {
            streetNo: { type: String, trim: true, default: '' },
            city: { type: String, trim: true, default: '' },
            zip: { type: Number, trim: true, default: 0 },
        },
        userType: { type: mongoose.Schema.Types.ObjectId, ref: 'userType', default: null },
        status: { type: Number, trim: true, default: 2 },
        accessToken: { type: String, default: null },
        invitationToken: { type: String, default: null },
        invitationExpiryTime: { type: Date, default: null },
        resetPasswordOTP: { type: Number, default: null },
        resetPasswordOTPExpiryTime: { type: Date, default: null },
        resetPasswordToken: { type: String, trim: true, default: '' },
        resetPasswordTokenExpiryTime: { type: Date, default: null },
        isImmutable: { type: Boolean, default: false },
        isInitialSignIn: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('user', userSchema);