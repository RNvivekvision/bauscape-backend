const express = require('express');

const router = express.Router();

const timeTrackingController = require('../controllers/timeTrackingController');

router.post('/insert', (req, res) => {
    return timeTrackingController.timeTracking.insertTimeTracking(req, res);
});

router.get('/get-by-user', (req, res) => {
    return timeTrackingController.timeTracking.getTimeTrackingByUser(req, res);
});

router.get('/get-by-day', (req, res) => {
    return timeTrackingController.timeTracking.getTimeTrackingByDay(req, res);
});

router.get('/get', (req, res) => {
    return timeTrackingController.timeTracking.getTimeTracking(req, res);
});

router.post('/update', (req, res) => {
    return timeTrackingController.timeTracking.updateTimeTracking(req, res);
});

router.post('/status', (req, res) => {
    return timeTrackingController.timeTracking.toggleTimeTrackingStatus(req, res);
});

router.get('/history', (req, res) => {
    return timeTrackingController.timeTracking.getWorkHistory(req, res);
});

module.exports = router;