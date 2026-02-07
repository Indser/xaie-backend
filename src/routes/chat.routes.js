
const express = require('express');
const router = express.Router();
const controller = require('../controllers/chat.controller');

router.get('/history', controller.getHistory);
router.post('/send', controller.sendMessage);

module.exports = router;
