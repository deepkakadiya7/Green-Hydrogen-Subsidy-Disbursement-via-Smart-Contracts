const logger = require('../utils/logger');

const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error
  let status = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    status = 401;
    message = 'Unauthorized access';
  } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
    status = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    status = 404;
    message = 'Resource not found';
  } else if (error.name === 'ConflictError' || error.message.includes('conflict')) {
    status = 409;
    message = 'Resource conflict';
  } else if (error.name === 'TooManyRequestsError') {
    status = 429;
    message = 'Too many requests';
  }

  // Blockchain-specific errors
  if (error.message.includes('revert') || error.message.includes('transaction failed')) {
    status = 400;
    message = 'Blockchain transaction failed';
  }

  // Database-specific errors
  if (error.name === 'MongoError' || error.name === 'SequelizeError') {
    status = 500;
    message = 'Database operation failed';
  }

  const response = {
    error: message,
    status,
    timestamp: new Date().toISOString()
  };

  // Include additional details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = error.message;
    response.stack = error.stack;
  }

  res.status(status).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error classes
class APIError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  APIError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
