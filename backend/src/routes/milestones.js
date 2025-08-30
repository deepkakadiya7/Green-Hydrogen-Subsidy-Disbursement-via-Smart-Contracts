const express = require('express');
const { body, param, query } = require('express-validator');
const { 
  authorize, 
  validateRequest, 
  validationRules,
  USER_ROLES,
  sensitiveOperationLimiter
} = require('../middleware/auth');
const { asyncHandler, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/milestones
 * @desc Add a new milestone to a project
 * @access Government only
 */
router.post('/', 
  authorize(USER_ROLES.GOVERNMENT),
  sensitiveOperationLimiter,
  validateRequest([
    validationRules.projectId(),
    validationRules.description(),
    validationRules.amount(),
    validationRules.targetValue(),
    body('verificationSource').trim().isLength({ min: 1, max: 100 }).withMessage('Verification source must be 1-100 characters'),
    validationRules.deadline()
  ]),
  asyncHandler(async (req, res) => {
    const { projectId, description, subsidyAmount, targetValue, verificationSource, deadline } = req.body;

    const startTime = Date.now();
    
    try {
      // Verify project exists and get details
      const project = await blockchainService.getProject(projectId);

      const result = await blockchainService.addMilestone(
        projectId,
        description,
        subsidyAmount,
        targetValue,
        verificationSource,
        new Date(deadline)
      );

      const duration = Date.now() - startTime;
      logger.performance('MILESTONE_CREATION', duration, { milestoneId: result.milestoneId });

      logger.audit('MILESTONE_ADDED', req.user.id, {
        projectId,
        milestoneId: result.milestoneId,
        description,
        subsidyAmount,
        targetValue,
        transactionHash: result.transactionHash
      });

      res.status(201).json({
        message: 'Milestone added successfully',
        milestone: {
          id: result.milestoneId,
          projectId,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber
        }
      });

    } catch (error) {
      logger.error('Failed to add milestone', {
        error: error.message,
        userId: req.user.id,
        projectId,
        description
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/milestones/:id
 * @desc Get milestone by ID
 * @access Government, Auditor, Oracle (any), Producer (own project milestones)
 */
router.get('/:id',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR, USER_ROLES.ORACLE, USER_ROLES.PRODUCER),
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Milestone ID must be a positive integer')
  ]),
  asyncHandler(async (req, res) => {
    const milestoneId = parseInt(req.params.id);

    try {
      const milestone = await blockchainService.getMilestone(milestoneId);
      const project = await blockchainService.getProject(milestone.projectId);

      // Check authorization for producers
      if (req.user.role === USER_ROLES.PRODUCER && project.producer !== req.user.walletAddress) {
        throw new ForbiddenError('You can only view milestones for your own projects');
      }

      res.json({
        milestone: {
          ...milestone,
          project: {
            id: project.id,
            name: project.name,
            producer: project.producer
          }
        }
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Milestone not found');
      }
      logger.error('Failed to get milestone', {
        error: error.message,
        userId: req.user.id,
        milestoneId
      });
      throw error;
    }
  })
);

/**
 * @route POST /api/milestones/:id/verify
 * @desc Verify a milestone
 * @access Oracle, Auditor only
 */
router.post('/:id/verify',
  authorize(USER_ROLES.ORACLE, USER_ROLES.AUDITOR),
  sensitiveOperationLimiter,
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Milestone ID must be a positive integer'),
    body('actualValue').isInt({ min: 0 }).withMessage('Actual value must be non-negative integer'),
    body('success').isBoolean().withMessage('Success must be boolean'),
    body('verificationNotes').optional().trim().isLength({ max: 500 }).withMessage('Verification notes max 500 characters')
  ]),
  asyncHandler(async (req, res) => {
    const milestoneId = parseInt(req.params.id);
    const { actualValue, success, verificationNotes } = req.body;

    const startTime = Date.now();

    try {
      // Get milestone details first
      const milestone = await blockchainService.getMilestone(milestoneId);

      const result = await blockchainService.verifyMilestone(milestoneId, actualValue, success);

      const duration = Date.now() - startTime;
      logger.performance('MILESTONE_VERIFICATION', duration, { milestoneId });

      logger.audit('MILESTONE_VERIFIED', req.user.id, {
        milestoneId,
        projectId: milestone.projectId,
        actualValue,
        success,
        verificationNotes,
        transactionHash: result.transactionHash
      });

      // Log blockchain transaction
      logger.blockchain('Milestone verification transaction', {
        milestoneId,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        events: result.events
      });

      res.json({
        message: 'Milestone verified successfully',
        milestone: {
          id: milestoneId,
          actualValue,
          success,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber
        },
        events: result.events
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Milestone not found');
      }
      logger.error('Failed to verify milestone', {
        error: error.message,
        userId: req.user.id,
        milestoneId,
        actualValue,
        success
      });
      throw error;
    }
  })
);

/**
 * @route POST /api/milestones/:id/dispute
 * @desc Dispute a milestone verification
 * @access Producer (own milestones), Government
 */
router.post('/:id/dispute',
  authorize(USER_ROLES.PRODUCER, USER_ROLES.GOVERNMENT),
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Milestone ID must be a positive integer'),
    body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Dispute reason must be 10-500 characters')
  ]),
  asyncHandler(async (req, res) => {
    const milestoneId = parseInt(req.params.id);
    const { reason } = req.body;

    try {
      const milestone = await blockchainService.getMilestone(milestoneId);
      const project = await blockchainService.getProject(milestone.projectId);

      // Check authorization for producers
      if (req.user.role === USER_ROLES.PRODUCER && project.producer !== req.user.walletAddress) {
        throw new ForbiddenError('You can only dispute milestones for your own projects');
      }

      // Check if milestone can be disputed
      if (!['Verified', 'Failed'].includes(milestone.status)) {
        return res.status(400).json({ error: 'Only verified or failed milestones can be disputed' });
      }

      // In production, this would call a smart contract method
      // For now, we'll log the dispute
      logger.audit('MILESTONE_DISPUTED', req.user.id, {
        milestoneId,
        projectId: milestone.projectId,
        reason,
        originalStatus: milestone.status
      });

      res.json({
        message: 'Milestone dispute submitted successfully',
        dispute: {
          milestoneId,
          reason,
          submittedBy: req.user.id,
          submittedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Milestone not found');
      }
      logger.error('Failed to dispute milestone', {
        error: error.message,
        userId: req.user.id,
        milestoneId,
        reason
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/milestones/pending
 * @desc Get all pending milestones for verification
 * @access Oracle, Auditor only
 */
router.get('/pending',
  authorize(USER_ROLES.ORACLE, USER_ROLES.AUDITOR),
  validateRequest([
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ]),
  asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    try {
      // In production, this would query the database or blockchain for pending milestones
      // For now, return mock data
      const pendingMilestones = [];

      res.json({
        milestones: pendingMilestones,
        pagination: {
          total: pendingMilestones.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: false
        }
      });

    } catch (error) {
      logger.error('Failed to get pending milestones', {
        error: error.message,
        userId: req.user.id
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/milestones/overdue
 * @desc Get overdue milestones
 * @access Government, Auditor only
 */
router.get('/overdue',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR),
  asyncHandler(async (req, res) => {
    try {
      // In production, query for milestones past their deadline
      const overdueMilestones = [];

      res.json({
        milestones: overdueMilestones,
        count: overdueMilestones.length
      });

    } catch (error) {
      logger.error('Failed to get overdue milestones', {
        error: error.message,
        userId: req.user.id
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/milestones/stats
 * @desc Get milestone statistics
 * @access Government, Auditor only
 */
router.get('/stats',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR),
  validateRequest([
    query('projectId').optional().isInt({ min: 1 }).withMessage('Project ID must be positive integer'),
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid timeframe')
  ]),
  asyncHandler(async (req, res) => {
    const { projectId, timeframe = '30d' } = req.query;

    try {
      // Calculate timeframe
      const now = new Date();
      const timeframes = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      };
      
      const fromDate = new Date(now.getTime() - timeframes[timeframe]);

      // In production, aggregate from database
      const stats = {
        timeframe,
        fromDate,
        toDate: now,
        projectId: projectId ? parseInt(projectId) : null,
        milestones: {
          total: 0,
          pending: 0,
          verified: 0,
          failed: 0,
          disputed: 0,
          overdue: 0
        },
        subsidies: {
          totalAllocated: 0,
          totalDisbursed: 0,
          averagePerMilestone: 0
        },
        verification: {
          averageTime: 0, // in hours
          successRate: 0 // percentage
        }
      };

      res.json(stats);

    } catch (error) {
      logger.error('Failed to get milestone statistics', {
        error: error.message,
        userId: req.user.id,
        projectId,
        timeframe
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/milestones/disputes
 * @desc Get disputed milestones
 * @access Auditor only
 */
router.get('/disputes',
  authorize(USER_ROLES.AUDITOR),
  validateRequest([
    query('status').optional().isIn(['open', 'resolved']).withMessage('Status must be open or resolved'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  asyncHandler(async (req, res) => {
    const { status = 'open', limit = 50 } = req.query;

    try {
      // In production, query database for disputed milestones
      const disputes = [];

      res.json({
        disputes,
        filter: { status },
        count: disputes.length
      });

    } catch (error) {
      logger.error('Failed to get disputed milestones', {
        error: error.message,
        userId: req.user.id,
        status
      });
      throw error;
    }
  })
);

/**
 * @route POST /api/milestones/:id/resolve-dispute
 * @desc Resolve a disputed milestone
 * @access Auditor only
 */
router.post('/:id/resolve-dispute',
  authorize(USER_ROLES.AUDITOR),
  sensitiveOperationLimiter,
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Milestone ID must be a positive integer'),
    body('approved').isBoolean().withMessage('Approved must be boolean'),
    body('resolution').trim().isLength({ min: 10, max: 1000 }).withMessage('Resolution must be 10-1000 characters')
  ]),
  asyncHandler(async (req, res) => {
    const milestoneId = parseInt(req.params.id);
    const { approved, resolution } = req.body;

    try {
      const milestone = await blockchainService.getMilestone(milestoneId);

      if (milestone.status !== 'Disputed') {
        return res.status(400).json({ error: 'Milestone is not in disputed status' });
      }

      // In production, call smart contract method to resolve dispute
      // await blockchainService.resolveDispute(milestoneId, approved);

      logger.audit('DISPUTE_RESOLVED', req.user.id, {
        milestoneId,
        projectId: milestone.projectId,
        approved,
        resolution
      });

      res.json({
        message: 'Dispute resolved successfully',
        resolution: {
          milestoneId,
          approved,
          resolution,
          resolvedBy: req.user.id,
          resolvedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Milestone not found');
      }
      logger.error('Failed to resolve dispute', {
        error: error.message,
        userId: req.user.id,
        milestoneId,
        approved
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/milestones/verification/queue
 * @desc Get milestones ready for verification
 * @access Oracle only
 */
router.get('/verification/queue',
  authorize(USER_ROLES.ORACLE),
  validateRequest([
    query('source').optional().trim().isLength({ min: 1 }).withMessage('Source must not be empty')
  ]),
  asyncHandler(async (req, res) => {
    const { source } = req.query;

    try {
      // In production, query for milestones that are ready for verification
      // based on data availability from the specified source
      const verificationQueue = [];

      res.json({
        milestones: verificationQueue,
        source,
        count: verificationQueue.length,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get verification queue', {
        error: error.message,
        userId: req.user.id,
        source
      });
      throw error;
    }
  })
);

/**
 * @route POST /api/milestones/:id/auto-verify
 * @desc Automatically verify milestone based on oracle data
 * @access Oracle only
 */
router.post('/:id/auto-verify',
  authorize(USER_ROLES.ORACLE),
  sensitiveOperationLimiter,
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Milestone ID must be a positive integer'),
    body('fromDate').isISO8601().toDate().withMessage('Valid from date required'),
    body('toDate').isISO8601().toDate().withMessage('Valid to date required')
  ]),
  asyncHandler(async (req, res) => {
    const milestoneId = parseInt(req.params.id);
    const { fromDate, toDate } = req.body;

    try {
      const milestone = await blockchainService.getMilestone(milestoneId);

      if (milestone.status !== 'Pending') {
        return res.status(400).json({ error: 'Milestone is not in pending status' });
      }

      // Get aggregate value from oracle for the verification period
      const aggregateData = await blockchainService.getAggregateValue(
        milestone.verificationSource,
        fromDate,
        toDate
      );

      const success = aggregateData.totalValue >= milestone.targetValue;
      
      const result = await blockchainService.verifyMilestone(
        milestoneId,
        aggregateData.totalValue,
        success
      );

      logger.audit('MILESTONE_AUTO_VERIFIED', req.user.id, {
        milestoneId,
        projectId: milestone.projectId,
        targetValue: milestone.targetValue,
        actualValue: aggregateData.totalValue,
        dataPointCount: aggregateData.dataPointCount,
        success,
        transactionHash: result.transactionHash
      });

      res.json({
        message: 'Milestone auto-verified successfully',
        verification: {
          milestoneId,
          targetValue: milestone.targetValue,
          actualValue: aggregateData.totalValue,
          dataPointCount: aggregateData.dataPointCount,
          success,
          transactionHash: result.transactionHash
        }
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Milestone not found');
      }
      logger.error('Failed to auto-verify milestone', {
        error: error.message,
        userId: req.user.id,
        milestoneId
      });
      throw error;
    }
  })
);

module.exports = router;
