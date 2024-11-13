const express = require('express');

const router = express.Router();

const menuController = require('../controllers/menuController');

router.post('/insert', (req, res) => {
    return menuController.menu.insertMenu(req, res);
});

router.get('/get', (req, res) => {
    return menuController.menu.getMenus(req, res);
});

router.get('/options', (req, res) => {
    return menuController.menu.menuOptions(req, res);
});

module.exports = router;