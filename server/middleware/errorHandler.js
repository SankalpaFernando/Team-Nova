const errorHandler = (err, req, res, next) => {

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌', err);
  }

  // Mongoose bad ObjectId  e.g. /api/users/invalid_id
  if (err.name === 'CastError') {
    return res.status(404).json({ 
      success: false, 
      message: `Resource not found` 
    });
  }

  // Mongoose duplicate key  e.g. same email twice
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ 
      success: false, 
      message: `${field} already exists` 
    });
  }

  // Mongoose validation error  e.g. missing required field
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      success: false, 
      message: messages.join(', ') 
    });
  }

  // Default
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
