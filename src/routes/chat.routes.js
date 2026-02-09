const express = require('express');
const router = express.Router();
const controller = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth'); // assuming you have auth middleware

// Apply auth middleware if required
router.use(authMiddleware);

// Routes
// Specific Routes (must be before /:chatId)
router.get('/list', controller.listChats);              // list all chats for user
router.get('/public', controller.getPublicChat);        // get/join public chat
router.post('/create', controller.createChat);          // create a new chat
router.post('/group/create', controller.createGroup);
router.post('/join', controller.joinChat);              // join an existing chat
router.get('/details/:chatId', controller.getChatDetails); // get chat details (partner name)
router.delete('/message/:messageId', controller.deleteMessage); // delete a message
router.post('/message/:messageId/react', controller.reactToMessage); // react to message
router.post('/send', controller.sendMessage);            // send a message

// Parameterized Routes (must be last)
router.get('/:chatId', controller.fetchMessages); // fetch messages for a chat
router.put('/:chatId', controller.updateChat);    // update chat name

module.exports = router;
