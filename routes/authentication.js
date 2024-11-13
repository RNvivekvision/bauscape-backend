const express = require('express');

const router = express.Router();

const authenticationController = require('../controllers/authenticationController');

router.post('/set-password', (req, res) => {
    return authenticationController.authentication.setPassword(req, res);
});

router.get('/check-invitation', (req, res) => {
    return authenticationController.authentication.checkInvitation(req, res);
});

router.get('/resend-invitation', (req, res) => {
    return authenticationController.authentication.resendInvitation(req, res);
});

router.post('/sign-in', (req, res) => {
    return authenticationController.authentication.signIn(req, res);
});

router.post('/request-otp', (req, res) => {
    return authenticationController.authentication.requestOTP(req, res);
});

router.post('/resend-otp', (req, res) => {
    return authenticationController.authentication.requestOTP(req, res);
});

router.post('/verify-otp', (req, res) => {
    return authenticationController.authentication.verifyOTP(req, res);
});

router.post('/reset-password', (req, res) => {
    return authenticationController.authentication.resetPassword(req, res);
});

router.post('/change-password', (req, res) => {
    return authenticationController.authentication.changePassword(req, res);
});

router.post('/sign-out', (req, res) => {
    return authenticationController.authentication.signOut(req, res);
});

module.exports = router;