const express = require('express');
const router = express.Router();
const { createMessage, getMessages, updateMessageStatus } = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const Message = require('../models/Message');

router.route('/')
  .post(createMessage)
  .get(protect, authorize('admin', 'site_engineer'), getMessages);

router.route('/:id/status')
  .put(protect, authorize('admin', 'site_engineer'), updateMessageStatus);

router.post('/:id/reply', protect, authorize('admin', 'site_engineer'), async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    await sendEmail({
      to: message.email,
      subject,
      text: body
    });

    res.status(200).json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
