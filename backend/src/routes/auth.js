const express = require('express');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const { 
  validateRequest, 
  generateToken, 
  USER_ROLES,
  authenticateToken
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Mock user database (in production, use proper database)
const users = [
  {
    id: 1,
    email: 'government@example.com',
    password: '$2b$10$hash_for_government_password', // Replace with actual hashed password
    role: USER_ROLES.GOVERNMENT,
    name: 'Government Administrator',
    walletAddress: '0x1234567890123456789012345678901234567890'
  },
  {
    id: 2,
    email: 'producer@example.com',
    password: '$2b$10$hash_for_producer_password',
    role: USER_ROLES.PRODUCER,
    name: 'Green Hydrogen Producer',
    walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  },
  {
    id: 3,
    email: 'auditor@example.com',
    password: '$2b$10$hash_for_auditor_password',
    role: USER_ROLES.AUDITOR,
    name: 'Independent Auditor',
    walletAddress: '0x9876543210987654321098765432109876543210'
  },
  {
    id: 4,
    email: 'oracle@example.com',
    password: '$2b$10$hash_for_oracle_password',
    role: USER_ROLES.ORACLE,
    name: 'Data Oracle Service',
    walletAddress: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba'
  }
];

// Validation rules for authentication
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('role').isIn(Object.values(USER_ROLES)).withMessage('Invalid role'),
  body('walletAddress').isEthereumAddress().withMessage('Valid Ethereum address is required')
];

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT token
 */
router.post('/login', validateRequest(loginValidation), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = users.find(u => u.email === email);
  if (!user) {
    logger.security('Failed login attempt - user not found', { email, ip: req.ip });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // For demo purposes, we'll use a simple password check
  // In production, use proper bcrypt comparison
  const isValidPassword = password === 'password123'; // Demo password
  
  if (!isValidPassword) {
    logger.security('Failed login attempt - invalid password', { email, ip: req.ip });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate token
  const token = generateToken(user);
  
  logger.audit('USER_LOGIN', user.id, { email, role: user.role });
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress
    }
  });
}));

/**
 * @route POST /api/auth/register
 * @desc Register new user (government admin only)
 */
router.post('/register', 
  authenticateToken,
  validateRequest(registerValidation), 
  asyncHandler(async (req, res) => {
    // Only government can register new users
    if (req.user.role !== USER_ROLES.GOVERNMENT) {
      return res.status(403).json({ error: 'Only government can register new users' });
    }

    const { email, password, name, role, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.walletAddress === walletAddress);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name,
      role,
      walletAddress,
      createdAt: new Date(),
      createdBy: req.user.id
    };

    users.push(newUser);

    logger.audit('USER_REGISTERED', req.user.id, { 
      newUserId: newUser.id, 
      email: newUser.email, 
      role: newUser.role 
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        walletAddress: newUser.walletAddress
      }
    });
  })
);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    walletAddress: user.walletAddress
  });
}));

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 */
router.put('/profile', 
  authenticateToken,
  validateRequest([
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('walletAddress').optional().isEthereumAddress().withMessage('Valid Ethereum address is required')
  ]),
  asyncHandler(async (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, walletAddress } = req.body;

    if (name) user.name = name;
    if (walletAddress) {
      // Check if wallet address is already in use
      const existingUser = users.find(u => u.walletAddress === walletAddress && u.id !== user.id);
      if (existingUser) {
        return res.status(409).json({ error: 'Wallet address already in use' });
      }
      user.walletAddress = walletAddress;
    }

    logger.audit('USER_PROFILE_UPDATED', user.id, { name, walletAddress });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  })
);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 */
router.post('/change-password',
  authenticateToken,
  validateRequest([
    body('currentPassword').isLength({ min: 6 }).withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
  ]),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For demo purposes, simple password check
    const isCurrentPasswordValid = currentPassword === 'password123';
    
    if (!isCurrentPasswordValid) {
      logger.security('Failed password change - invalid current password', { 
        userId: user.id, 
        email: user.email 
      });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    
    logger.audit('PASSWORD_CHANGED', user.id);
    logger.security('Password changed successfully', { userId: user.id });

    res.json({ message: 'Password changed successfully' });
  })
);

/**
 * @route GET /api/auth/users
 * @desc Get all users (government only)
 */
router.get('/users',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== USER_ROLES.GOVERNMENT) {
      return res.status(403).json({ error: 'Only government can view all users' });
    }

    const userList = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt
    }));

    res.json(userList);
  })
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 */
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newToken = generateToken(user);
  
  res.json({ token: newToken });
}));

/**
 * @route GET /api/auth/roles
 * @desc Get available user roles
 */
router.get('/roles', (req, res) => {
  res.json({
    roles: Object.values(USER_ROLES),
    descriptions: {
      [USER_ROLES.GOVERNMENT]: 'Government body responsible for subsidy management',
      [USER_ROLES.PRODUCER]: 'Green hydrogen producer eligible for subsidies',
      [USER_ROLES.AUDITOR]: 'Independent auditor for verification',
      [USER_ROLES.ORACLE]: 'Data oracle service for external verification'
    }
  });
});

module.exports = router;
