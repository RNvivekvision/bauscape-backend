const express = require('express');
const multer = require('multer');

const router = express.Router();

const organizerController = require('../controllers/organizerController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/profiles') },
    filename: (req, file, callback) => callback(null, Date.now() + '.jpg')
})

const upload = multer({ storage: storage })

router.post('/insert', (req, res) => {
    return organizerController.organizer.insertOrganizer(req, res);
});

router.post('/get', (req, res) => {
    return organizerController.organizer.getOrganizers(req, res);
});

router.get('', (req, res) => {
    return organizerController.organizer.getOrganizer(req, res);
});

router.post('/update', upload.single('profilePicture'), (req, res) => {
    return organizerController.organizer.updateOrganizer(req, res);
});

router.post('/status', (req, res) => {
    return organizerController.organizer.toggleOrganizerStatus(req, res);
});

router.get('/onboarding', (req, res) => {
    return organizerController.organizer.onboarding(req, res);
});

router.post('/options', (req, res) => {
    return organizerController.organizer.organizerOptions(req, res);
});

module.exports = router;