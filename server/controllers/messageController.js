const Message = require('../models/Message');

// @desc    Create a new message
// @route   POST /api/messages
// @access  Public
exports.createMessage = async (req, res, next) => {
  try {
    const { fullName, email, subject, message, site } = req.body;
    
    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    
    const newMessage = await Message.create({
      fullName,
      email,
      subject,
      message,
      site: site || null
    });
    
    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages (admin sees all, site engineer sees assigned site's messages)
// @route   GET /api/messages
// @access  Private (Admin or Site Engineer)
exports.getMessages = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'site_engineer') {
      if (!req.user.assignedSite) {
        return res.status(200).json({ success: true, data: [] });
      }
      query.site = req.user.assignedSite;
    }

    const messages = await Message.find(query)
      .populate('site', 'name location region')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Update message status
// @route   PUT /api/messages/:id/status
// @access  Private (Admin or Site Engineer for target site)
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['unread', 'read'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const existingMsg = await Message.findById(req.params.id);
    if (!existingMsg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (req.user.role === 'site_engineer') {
      const userSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      const msgSite = existingMsg.site ? existingMsg.site.toString() : null;
      if (!userSite || userSite !== msgSite) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot update message for another site' });
      }
    }
    
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('site', 'name location region');
    
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};
