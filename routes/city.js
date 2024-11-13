const express = require('express');

const router = express.Router();

const cityController = require('../controllers/cityController');

router.post('/insert', (req, res) => {
    return cityController.city.insertCity(req, res);
});

router.post('/get', (req, res) => {
    return cityController.city.getCities(req, res);
});

router.get('', (req, res) => {
    return cityController.city.getCity(req, res);
});

router.post('/update', (req, res) => {
    return cityController.city.updateCity(req, res);
});

router.get('/options', (req, res) => {
    return cityController.city.cityOptions(req, res);
});

module.exports = router;