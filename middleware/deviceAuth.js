const Device = require('../models/Device');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate requests via either x-device-key header or User JWT
 */
exports.authenticateDeviceOrUser = async (req, res, next) => {
  const deviceKey = req.headers['x-device-key'];

  // Case 1: Device API Key provided in header
  if (deviceKey) {
    try {
      const device = await Device.findOne({ apiKey: deviceKey }).populate('site');
      if (!device) {
        return res.status(401).json({ success: false, message: 'Invalid device API key' });
      }
      const isAllowed = device.status === 'active' || (device.status === 'faulty' && device.auto_flagged === true);
      if (!isAllowed) {
        return res.status(403).json({ success: false, message: 'Device is not active' });
      }
      req.device = device;
      return next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Device authentication error', error: error.message });
    }
  }

  // Case 2: JWT Bearer Token provided in header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please provide x-device-key header or Bearer JWT token.'
  });
};
