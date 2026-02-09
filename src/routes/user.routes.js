const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

router.get('/search', auth, userController.searchUsers);
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.get('/active', auth, userController.getActiveUsers);
router.post('/profile/avatar', auth, userController.updateAvatar);

module.exports = router;
