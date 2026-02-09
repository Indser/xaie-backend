const express = require('express');
const router = express.Router();
const controller = require('../controllers/update.controller');

router.get('/check', controller.checkUpdate);

module.exports = router;
