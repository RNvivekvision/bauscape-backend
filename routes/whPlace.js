const express = require('express');

const router = express.Router();

const whPlaceController = require('../controllers/whPlaceController');

router.post('/insert', (req, res) => {
    return whPlaceController.whPlace.insertWHPlace(req, res);
});

router.post('/get', (req, res) => {
    return whPlaceController.whPlace.getWHPlaces(req, res);
});

router.get('', (req, res) => {
    return whPlaceController.whPlace.getWhPlace(req, res);
});

router.post('/update', (req, res) => {
    return whPlaceController.whPlace.updateWHPlace(req, res);
});

router.post('/status', (req, res) => {
    return whPlaceController.whPlace.toggleLagarStatus(req, res);
});

module.exports = router;