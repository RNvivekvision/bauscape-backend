const express = require('express');

const router = express.Router();

const stammUserProjectController = require('../controllers/stammUserProjectController');

router.post('/insert', (req, res) => {
    return stammUserProjectController.stammUserProject.insertStammUserProject(req, res);
});

router.post('/get', (req, res) => {
    return stammUserProjectController.stammUserProject.getStammUserProjects(req, res);
});

router.get('', (req, res) => {
    return stammUserProjectController.stammUserProject.getStammUserProject(req, res);
});

router.post('/update', (req, res) => {
    return stammUserProjectController.stammUserProject.updateStammUserProject(req, res);
});

router.post('/status', (req, res) => {
    return stammUserProjectController.stammUserProject.toggleStammUserProjectStatus(req, res);
});

router.get('/options', (req, res) => {
    return stammUserProjectController.stammUserProject.projectOptions(req, res);
});

module.exports = router;