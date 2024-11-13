const express = require('express');

const router = express.Router();

const designationController = require('../controllers/designationController');

router.post('/insert', (req, res) => {
    return designationController.designation.insertDesignation(req, res);
});

router.post('/get', (req, res) => {
    return designationController.designation.getDesignations(req, res);
});

router.get('', (req, res) => {
    return designationController.designation.getDesignation(req, res);
});

router.post('/update', (req, res) => {
    return designationController.designation.updateDesignation(req, res);
});

router.post('/status', (req, res) => {
    return designationController.designation.toggleDesignationStatus(req, res);
});

router.get('/options', (req, res) => {
    return designationController.designation.designationOptions(req, res);
});

module.exports = router;