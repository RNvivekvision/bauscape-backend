const express = require('express');

const router = express.Router();

const languageController = require('../controllers/languageController');

router.get('', (req, res) => {
    return languageController.language.getLanguage(req, res);
});

router.post('/update', (req, res) => {
    return languageController.language.updateLanguage(req, res);
});

module.exports = router;