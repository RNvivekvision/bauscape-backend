const express = require('express');

const router = express.Router();

const lagerController = require('../controllers/lagerController');

router.post('/insert', (req, res) => {
    return lagerController.lager.insertLagar(req, res);
});

router.post('/get', (req, res) => {
    return lagerController.lager.getLagars(req, res);
});

router.get('', (req, res) => {
    return lagerController.lager.getLagar(req, res);
});

router.post('/update', (req, res) => {
    return lagerController.lager.updateLagar(req, res);
});

router.post('/status', (req, res) => {
    return lagerController.lager.toggleLagarStatus(req, res);
});

router.get('/options', (req, res) => {
    return lagerController.lager.lagerOptions(req, res);
});

module.exports = router;