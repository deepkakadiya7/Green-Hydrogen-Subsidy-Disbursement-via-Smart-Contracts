const express = require('express');
const { query } = require('express-validator');
const { authorize, validateRequest, USER_ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/audit/logs
 * @desc Get audit logs
 * @access Government, Auditor only
 */
router.get('/logs',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR),
  validateRequest([
    query('action').optional().trim().isLength({ min: 1 }).withMessage('Action filter cannot be empty'),
    query('userId').optional().isInt({ min: 1 }).withMessage('User ID must be positive integer'),
    query('fromDate').optional().isISO8601().toDate().withMessage('Invalid from date'),
    query('toDate').optional().isISO8601().toDate().withMessage('Invalid to date'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ]),
  asyncHandler(async (req, res) => {
    const { action, userId, fromDate, toDate, limit = 100, offset = 0 } = req.query;

    try {
      // In production, query audit logs from database
      const auditLogs = [];

      res.json({
        logs: auditLogs,
        filters: { action, userId, fromDate, toDate },
        pagination: {
          total: auditLogs.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      logger.error('Failed to get audit logs', {
        error: error.message,
        userId: req.user.id
      });
      throw error;
    }
  })
);

module.exports = router;
