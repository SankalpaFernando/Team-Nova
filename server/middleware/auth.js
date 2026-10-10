const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized. Token invalid.' 
    });
  }
};

// Role-based access control
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route.`
      });
    }
    next();
  };
};

// Helper: Authorize Site Access for Site Engineers vs Admins
exports.authorizeSiteAccess = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role === 'site_engineer') {
    const targetSiteId = req.params.siteId || req.params.id || req.body.site;
    const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;

    if (userAssignedSite && targetSiteId && userAssignedSite === targetSiteId.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have access to this site.'
    });
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: Role not authorized.'
  });
};

// Optional JWT verification — attaches req.user if token is valid, otherwise leaves req.user = null
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    req.user = null;
  }
  next();
};