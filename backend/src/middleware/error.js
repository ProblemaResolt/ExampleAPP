class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Always log errors to console for debugging (but don't expose sensitive details)
  console.error('ERROR:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : '[Stack trace hidden in production]',
    url: req.url,
    method: req.method
  });
  
  if (process.env.NODE_ENV === 'development') {
    // Development mode - show more details but filter sensitive information
    const sanitizedError = {
      status: err.status,
      message: err.message,
      details: err.details,
      stack: err.stack?.split('\n').slice(0, 10).join('\n') // Limit stack trace lines
    };
    
    res.status(err.statusCode).json(sanitizedError);
  } else {
    // Production mode
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        details: err.details
      });
    } else {
      // Programming or unknown errors - don't expose details
      res.status(500).json({
        status: 'error',
        message: 'サーバー内部エラーが発生しました'
      });
    }
  }
};

module.exports = {
  AppError,
  errorHandler
}; 