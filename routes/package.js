const express = require('express');

const router = express.Router();

const packageController = require('../controllers/packageController ');

router.post('/insert', (req, res) => {
    return packageController.package.insertPackage(req, res);
});

router.post('/get', (req, res) => {
    return packageController.package.getPackages(req, res);
});

router.get('', (req, res) => {
    return packageController.package.getPackage(req, res);
});

router.post('/update', (req, res) => {
    return packageController.package.updatePackage(req, res);
});

router.post('/status', (req, res) => {
    return packageController.package.togglePackageStatus(req, res);
});

router.get('/options', (req, res) => {
    return packageController.package.packageOptions(req, res);
});

module.exports = router;