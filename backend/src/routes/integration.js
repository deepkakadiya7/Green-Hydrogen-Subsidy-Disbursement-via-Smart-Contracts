const express = require('express');
const { body } = require('express-validator');
const { authorize, validateRequest, USER_ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/integration/banking/transfer
 * @desc Trigger payment to legacy banking system
 * @access Government only
 */
router.post('/banking/transfer',
  authorize(USER_ROLES.GOVERNMENT),
  validateRequest([
    body('accountNumber').isLength({ min: 8, max: 20 }).withMessage('Invalid account number'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
    body('reference').trim().isLength({ min: 1, max: 100 }).withMessage('Reference required')
  ]),
  asyncHandler(async (req, res) => {
    const { accountNumber, amount, reference } = req.body;

    try {
      // In production, integrate with actual banking APIs
      const transferResult = {
        transferId: `TXN_${Date.now()}`,
        status: 'pending',
        accountNumber,
        amount,
        reference,
        initiatedAt: new Date().toISOString()
      };

      logger.audit('BANKING_TRANSFER_INITIATED', req.user.id, transferResult);

      res.json({
        message: 'Banking transfer initiated',
        transfer: transferResult
      });

    } catch (error) {
      logger.error('Failed to initiate banking transfer', {
        error: error.message,
        userId: req.user.id,
        accountNumber,
        amount
      });
      throw error;
    }
  })
);

module.exports = router;
