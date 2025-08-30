const express = require('express');
const { body, param, query } = require('express-validator');
const { authorize, validateRequest, USER_ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/oracle/data
 * @desc Submit data to oracle
 * @access Oracle only
 */
router.post('/data',
  authorize(USER_ROLES.ORACLE),
  validateRequest([
    body('source').trim().isLength({ min: 1, max: 100 }).withMessage('Source must be 1-100 characters'),
    body('value').isInt({ min: 0 }).withMessage('Value must be non-negative integer'),
    body('metadata').optional().trim().isLength({ max: 1000 }).withMessage('Metadata max 1000 characters')
  ]),
  asyncHandler(async (req, res) => {
    const { source, value, metadata = '' } = req.body;

    try {
      const result = await blockchainService.submitOracleData(source, value, metadata);

      logger.audit('ORACLE_DATA_SUBMITTED', req.user.id, {
        source,
        value,
        dataId: result.dataId,
        transactionHash: result.transactionHash
      });

      res.status(201).json({
        message: 'Data submitted successfully',
        data: {
          dataId: result.dataId,
          source,
          value,
          transactionHash: result.transactionHash
        }
      });

    } catch (error) {
      logger.error('Failed to submit oracle data', {
        error: error.message,
        userId: req.user.id,
        source,
        value
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/oracle/data/:source
 * @desc Get verified data for a source
 */
router.get('/data/:source',
  authorize(USER_ROLES.ORACLE, USER_ROLES.AUDITOR, USER_ROLES.GOVERNMENT),
  validateRequest([
    param('source').trim().isLength({ min: 1 }).withMessage('Source must not be empty'),
    query('fromDate').isISO8601().toDate().withMessage('Valid from date required'),
    query('toDate').isISO8601().toDate().withMessage('Valid to date required')
  ]),
  asyncHandler(async (req, res) => {
    const { source } = req.params;
    const { fromDate, toDate } = req.query;

    try {
      const data = await blockchainService.getVerifiedData(source, new Date(fromDate), new Date(toDate));

      res.json({
        source,
        period: { fromDate, toDate },
        data
      });

    } catch (error) {
      logger.error('Failed to get verified data', {
        error: error.message,
        userId: req.user.id,
        source
      });
      throw error;
    }
  })
);

module.exports = router;
