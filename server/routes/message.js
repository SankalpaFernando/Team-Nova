const express = require('express');
const router = express.Router();
const { createMessage, getMessages, updateMessageStatus } = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(createMessage)
  .get(protect, authorize('admin'), getMessages);

router.route('/:id/status')
  .put(protect, authorize('admin'), updateMessageStatus);

module.exports = router;
