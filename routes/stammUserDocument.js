const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const stammUserDocumentController = require('../controllers/stammUserDocumentController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/documents');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
    }
});

const upload = multer({ storage: storage })

router.post('/insert', upload.single('document'), (req, res) => {
    return stammUserDocumentController.stammUserDocument.insertStammUserDocument(req, res);
});

router.post('/get', (req, res) => {
    return stammUserDocumentController.stammUserDocument.getStammUserDocuments(req, res);
});

router.get('', (req, res) => {
    return stammUserDocumentController.stammUserDocument.getStammUserDocument(req, res);
});

router.post('/status', (req, res) => {
    return stammUserDocumentController.stammUserDocument.toggleStammUserDocumentStatus(req, res);
});

module.exports = router;