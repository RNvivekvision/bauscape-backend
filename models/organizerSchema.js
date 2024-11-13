'user strict';

const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema(
    {
        firstName: { type: String, trim: true, default: '' },
        lastName: { type: String, trim: true, default: '' },
        company: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        password: { type: String, trim: true, default: '' },
        profilePicture: { type: String, trim: true, default: '' },
        language: { type: String, trim: true, default: 'en' },
        address: {
            streetNo: { type: String, trim: true, default: '' },
            city: { type: String, trim: true, default: '' },
            zip: { type: Number, trim: true, default: 0 },
        },
        organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'organizer', default: null },
        package: { type: mongoose.Schema.Types.ObjectId, ref: 'package', default: null },
        userType: { type: mongoose.Schema.Types.ObjectId, ref: 'userType', default: null },
        designation: { type: mongoose.Schema.Types.ObjectId, ref: 'designation', default: null },
        employeeType: { type: String, trim: true, default: '' },
        holiday: { type: Number, default: 0 },
        userLimit: { type: Number, default: 1 },
        workType: { type: String, trim: true, default: '' },
        weeklyWorkHours: { type: Number, trim: true, default: 0 },
        status: { type: Number, trim: true, default: 2 },
        accessToken: { type: String, default: null },
        invitationToken: { type: String, default: null },
        invitationExpiryTime: { type: Date, default: null },
        resetPasswordOTP: { type: Number, default: null },
        resetPasswordOTPExpiryTime: { type: Date, default: null },
        resetPasswordToken: { type: String, trim: true, default: '' },
        resetPasswordTokenExpiryTime: { type: Date, default: null },
        isImmutable: { type: Boolean, default: false },
        isOrganizer: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
        isInitialSignIn: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('organizer', organizerSchema);