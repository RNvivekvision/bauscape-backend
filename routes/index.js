const express = require('express');
const router = express.Router();

const { ensureAuthorized } = require('../middleware/auth');

router.use(ensureAuthorized);

const menu = require('./menu');
const userType = require('./userType');
const user = require('./user');
const authentication = require('./authentication');
const package = require('./package');
const organizer = require('./organizer');
const designation = require('./designation');
const stammUser = require('./stammUser');
const stammUserProject = require('./stammUserProject');
const stammUserDocument = require('./stammUserDocument');
const lager = require('./lager');
const whPlace = require('./whPlace');
const timeTracking = require('./timeTracking');
const city = require('./city');
const language = require('./language');

router.use('/menu', menu);
router.use('/usertype', userType);
router.use('/user', user);
router.use('/authentication', authentication);
router.use('/package', package);
router.use('/organizer', organizer);
router.use('/designation', designation);
router.use('/stammuser', stammUser);
router.use('/stammuserproject', stammUserProject);
router.use('/stammuserdocument', stammUserDocument);
router.use('/lager', lager);
router.use('/whplace', whPlace);
router.use('/timetracking', timeTracking);
router.use('/city', city);
router.use('/language', language);

module.exports = router;