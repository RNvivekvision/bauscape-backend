const express = require('express');

const router = express.Router();

const userTypeController = require('../controllers/userTypeController');

router.post('/insert', (req, res) => {
    return userTypeController.userType.insertUserType(req, res);
});

router.post('/get', (req, res) => {
    return userTypeController.userType.getUserTypes(req, res);
});

router.get('', (req, res) => {
    return userTypeController.userType.getUserType(req, res);
});

router.post('/update', (req, res) => {
    return userTypeController.userType.updateUserType(req, res);
});

router.post('/status', (req, res) => {
    return userTypeController.userType.toggleUserTypeStatus(req, res);
});

router.get('/options', (req, res) => {
    return userTypeController.userType.userTypeOptions(req, res);
});

module.exports = router;