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
    const field = Object.keys(err.keyValue || {})[0] || 'email';
    const capitalized = field.charAt(0).toUpperCase() + field.slice(1);
    return res.status(400).json({ 
      success: false, 
      message: `${capitalized} already exists` 
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

  // Database / Network Connection Errors (offline, DNS lookup failure, connection reset, timeout)
  const isDbNetworkError =
    err.name === 'MongoNetworkError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoTimeoutError' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNRESET' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ECONNREFUSED' ||
    (typeof err.message === 'string' && (
      err.message.includes('ENOTFOUND') ||
      err.message.includes('ECONNRESET') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('mongodb.net') ||
      err.message.includes('Server selection timed out') ||
      err.message.includes('connection closed')
    ));

  if (isDbNetworkError) {
    return res.status(503).json({
      success: false,
      message: 'Unable to connect to the cloud database. Please verify your internet connection and try again.'
    });
  }

  // Default
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
