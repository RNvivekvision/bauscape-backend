const express = require('express');
const multer = require('multer');

const router = express.Router();

const userController = require('../controllers/userController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/profiles') },
    filename: (req, file, callback) => callback(null, Date.now() + '.jpg')
})

const upload = multer({ storage: storage })

router.post('/insert', (req, res) => {
    return userController.user.insertUser(req, res);
});

router.post('/get', (req, res) => {
    return userController.user.getUsers(req, res);
});

router.get('', (req, res) => {
    return userController.user.getUser(req, res);
});

router.post('/update', upload.single('profilePicture'), (req, res) => {
    return userController.user.updateUser(req, res);
});

router.post('/status', (req, res) => {
    return userController.user.toggleUserStatus(req, res);
});

router.get('/onboarding', (req, res) => {
    return userController.user.onboarding(req, res);
});

module.exports = router;