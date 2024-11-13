const express = require('express');
const multer = require('multer');

const router = express.Router();

const stammUsersController = require('../controllers/stammUsersController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/profiles') },
    filename: (req, file, callback) => callback(null, Date.now() + '.jpg')
})

const upload = multer({ storage: storage })

router.post('/insert', (req, res) => {
    return stammUsersController.stammUser.insertStammUser(req, res);
});

router.post('/get', (req, res) => {
    return stammUsersController.stammUser.getStammUsers(req, res);
});

router.get('', (req, res) => {
    return stammUsersController.stammUser.getStammUser(req, res);
});

router.post('/update', (req, res) => {
    return stammUsersController.stammUser.updateStammUser(req, res);
});

router.post('/status', (req, res) => {
    return stammUsersController.stammUser.toggleStammUserStatus(req, res);
});

module.exports = router;