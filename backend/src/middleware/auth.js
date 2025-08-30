const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User roles
const USER_ROLES = {
  GOVERNMENT: 'government',
  PRODUCER: 'producer',
  AUDITOR: 'auditor',
  ORACLE: 'oracle'
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Validation middleware
const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    next();
  };
};

// Common validation rules
const validationRules = {
  ethereumAddress: () => 
    body('address').isEthereumAddress().withMessage('Invalid Ethereum address'),
  
  projectId: () => 
    body('projectId').isInt({ min: 1 }).withMessage('Project ID must be a positive integer'),
  
  milestoneId: () => 
    body('milestoneId').isInt({ min: 1 }).withMessage('Milestone ID must be a positive integer'),
  
  amount: () => 
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
  
  deadline: () => 
    body('deadline').isISO8601().toDate().custom(value => {
      if (value <= new Date()) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),
  
  projectName: () => 
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be 1-100 characters'),
  
  description: () => 
    body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
  
  targetValue: () => 
    body('targetValue').isInt({ min: 1 }).withMessage('Target value must be a positive integer')
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Verify user role matches blockchain role
const verifyBlockchainRole = async (req, res, next) => {
  try {
    const blockchainService = require('../services/blockchainService');
    
    // This would verify that the user's role in the JWT matches
    // their role in the smart contract
    // Implementation depends on how roles are managed
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify blockchain role' });
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimiter = require('express-rate-limit')({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per hour for sensitive operations
  message: 'Too many sensitive operations, please try again later'
});

module.exports = {
  authenticateToken,
  authorize,
  validateRequest,
  validationRules,
  generateToken,
  verifyBlockchainRole,
  sensitiveOperationLimiter,
  USER_ROLES
};
