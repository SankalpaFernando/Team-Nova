const Message = require('../models/Message');

// @desc    Create a new message
// @route   POST /api/messages
// @access  Public
exports.createMessage = async (req, res, next) => {
  try {
    const { fullName, email, subject, message } = req.body;
    
    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }
    
    const newMessage = await Message.create({
      fullName,
      email,
      subject,
      message
    });
    
    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private/Admin
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Update message status
// @route   PUT /api/messages/:id/status
// @access  Private/Admin
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['unread', 'read'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};
