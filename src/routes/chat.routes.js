const express = require('express');
const router = express.Router();
const controller = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth'); // assuming you have auth middleware

// Apply auth middleware if required
router.use(authMiddleware);

// Routes
router.get('/history/:chatId', controller.fetchMessages); // fetch messages for a chat
router.post('/send', controller.sendMessage);            // send a message
router.get('/list', controller.listChats);              // list all chats for user
router.post('/create', controller.createChat);          // create a new chat
router.post('/join', controller.joinChat);              // join an existing chat

module.exports = router;
