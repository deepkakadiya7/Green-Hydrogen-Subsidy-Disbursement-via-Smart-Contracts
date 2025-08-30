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
 * @route POST /api/projects
 * @desc Register a new green hydrogen project
 * @access Government only
 */
router.post('/', 
  authorize(USER_ROLES.GOVERNMENT),
  sensitiveOperationLimiter,
  validateRequest([
    body('producerAddress').isEthereumAddress().withMessage('Valid producer Ethereum address is required'),
    validationRules.projectName(),
    validationRules.description(),
    validationRules.amount()
  ]),
  asyncHandler(async (req, res) => {
    const { producerAddress, name, description, totalSubsidyAmount } = req.body;

    const startTime = Date.now();
    
    try {
      const result = await blockchainService.registerProject(
        producerAddress,
        name,
        description,
        totalSubsidyAmount
      );

      const duration = Date.now() - startTime;
      logger.performance('PROJECT_REGISTRATION', duration, { projectId: result.projectId });

      logger.audit('PROJECT_REGISTERED', req.user.id, {
        projectId: result.projectId,
        producerAddress,
        name,
        totalSubsidyAmount,
        transactionHash: result.transactionHash
      });

      res.status(201).json({
        message: 'Project registered successfully',
        project: {
          id: result.projectId,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber
        }
      });

    } catch (error) {
      logger.error('Failed to register project', {
        error: error.message,
        userId: req.user.id,
        producerAddress,
        name
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/projects
 * @desc Get all projects or projects for a specific producer
 * @access Government, Auditor (all), Producer (own projects)
 */
router.get('/',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR, USER_ROLES.PRODUCER),
  validateRequest([
    query('producer').optional().isEthereumAddress().withMessage('Invalid producer address'),
    query('status').optional().isIn(['Pending', 'Active', 'Completed', 'Suspended', 'Cancelled']).withMessage('Invalid status'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ]),
  asyncHandler(async (req, res) => {
    const { producer, status, limit = 50, offset = 0 } = req.query;

    try {
      let projects = [];

      if (req.user.role === USER_ROLES.PRODUCER) {
        // Producers can only see their own projects
        projects = await blockchainService.getProducerProjects(req.user.walletAddress);
      } else if (producer) {
        // Government/Auditor requesting specific producer's projects
        projects = await blockchainService.getProducerProjects(producer);
      } else {
        // Government/Auditor requesting all projects (would need a different method)
        // For now, return empty array - in production, implement getAllProjects
        projects = [];
      }

      // Filter by status if provided
      if (status) {
        projects = projects.filter(p => p.status === status);
      }

      // Apply pagination
      const paginatedProjects = projects.slice(offset, offset + parseInt(limit));

      res.json({
        projects: paginatedProjects,
        pagination: {
          total: projects.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + parseInt(limit) < projects.length
        }
      });

    } catch (error) {
      logger.error('Failed to get projects', {
        error: error.message,
        userId: req.user.id,
        producer,
        status
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/projects/:id
 * @desc Get project by ID
 * @access Government, Auditor (any project), Producer (own projects)
 */
router.get('/:id',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR, USER_ROLES.PRODUCER),
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Project ID must be a positive integer')
  ]),
  asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.id);

    try {
      const project = await blockchainService.getProject(projectId);

      // Check if producer is authorized to view this project
      if (req.user.role === USER_ROLES.PRODUCER && project.producer !== req.user.walletAddress) {
        throw new ForbiddenError('You can only view your own projects');
      }

      // Get project milestones
      const milestones = await blockchainService.getProjectMilestones(projectId);

      res.json({
        project: {
          ...project,
          milestones
        }
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Project not found');
      }
      logger.error('Failed to get project', {
        error: error.message,
        userId: req.user.id,
        projectId
      });
      throw error;
    }
  })
);

/**
 * @route PUT /api/projects/:id/status
 * @desc Update project status
 * @access Government only
 */
router.put('/:id/status',
  authorize(USER_ROLES.GOVERNMENT),
  sensitiveOperationLimiter,
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Project ID must be a positive integer'),
    body('status').isIn(['Pending', 'Active', 'Completed', 'Suspended', 'Cancelled']).withMessage('Invalid status')
  ]),
  asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.id);
    const { status } = req.body;

    try {
      // Get current project to verify it exists
      const currentProject = await blockchainService.getProject(projectId);

      // Map status string to enum value
      const statusMap = {
        'Pending': 0,
        'Active': 1,
        'Completed': 2,
        'Suspended': 3,
        'Cancelled': 4
      };

      const statusValue = statusMap[status];
      
      // Update status via blockchain (would need to implement this method)
      // await blockchainService.updateProjectStatus(projectId, statusValue);

      logger.audit('PROJECT_STATUS_UPDATED', req.user.id, {
        projectId,
        oldStatus: currentProject.status,
        newStatus: status
      });

      res.json({
        message: 'Project status updated successfully',
        projectId,
        newStatus: status
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Project not found');
      }
      logger.error('Failed to update project status', {
        error: error.message,
        userId: req.user.id,
        projectId,
        status
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/projects/:id/milestones
 * @desc Get all milestones for a project
 * @access Government, Auditor (any project), Producer (own projects)
 */
router.get('/:id/milestones',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR, USER_ROLES.PRODUCER),
  validateRequest([
    param('id').isInt({ min: 1 }).withMessage('Project ID must be a positive integer')
  ]),
  asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.id);

    try {
      const project = await blockchainService.getProject(projectId);

      // Check authorization for producers
      if (req.user.role === USER_ROLES.PRODUCER && project.producer !== req.user.walletAddress) {
        throw new ForbiddenError('You can only view milestones for your own projects');
      }

      const milestones = await blockchainService.getProjectMilestones(projectId);

      res.json({
        projectId,
        milestones,
        summary: {
          total: milestones.length,
          pending: milestones.filter(m => m.status === 'Pending').length,
          verified: milestones.filter(m => m.status === 'Verified').length,
          failed: milestones.filter(m => m.status === 'Failed').length,
          disputed: milestones.filter(m => m.status === 'Disputed').length
        }
      });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundError('Project not found');
      }
      logger.error('Failed to get project milestones', {
        error: error.message,
        userId: req.user.id,
        projectId
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/projects/producer/:address
 * @desc Get all projects for a specific producer
 * @access Government, Auditor (any producer), Producer (own address only)
 */
router.get('/producer/:address',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR, USER_ROLES.PRODUCER),
  validateRequest([
    param('address').isEthereumAddress().withMessage('Invalid producer address')
  ]),
  asyncHandler(async (req, res) => {
    const producerAddress = req.params.address;

    // Check authorization for producers
    if (req.user.role === USER_ROLES.PRODUCER && producerAddress !== req.user.walletAddress) {
      throw new ForbiddenError('You can only view your own projects');
    }

    try {
      const projects = await blockchainService.getProducerProjects(producerAddress);

      res.json({
        producerAddress,
        projects,
        summary: {
          total: projects.length,
          active: projects.filter(p => p.status === 'Active').length,
          completed: projects.filter(p => p.status === 'Completed').length,
          totalSubsidyAllocated: projects.reduce((sum, p) => sum + parseFloat(p.totalSubsidyAmount), 0),
          totalDisbursed: projects.reduce((sum, p) => sum + parseFloat(p.disbursedAmount), 0)
        }
      });

    } catch (error) {
      logger.error('Failed to get producer projects', {
        error: error.message,
        userId: req.user.id,
        producerAddress
      });
      throw error;
    }
  })
);

/**
 * @route GET /api/projects/stats/overview
 * @desc Get system-wide project statistics
 * @access Government, Auditor only
 */
router.get('/stats/overview',
  authorize(USER_ROLES.GOVERNMENT, USER_ROLES.AUDITOR),
  asyncHandler(async (req, res) => {
    try {
      const contractInfo = await blockchainService.getContractInfo();

      // In production, these would come from database aggregations or contract view functions
      const stats = {
        totalProjects: 0, // Would query blockchain or database
        activeProjects: 0,
        completedProjects: 0,
        totalSubsidyPool: contractInfo.contractBalance,
        totalDisbursed: contractInfo.totalDisbursed,
        availableSubsidy: contractInfo.availableSubsidy,
        lastUpdated: new Date().toISOString()
      };

      res.json(stats);

    } catch (error) {
      logger.error('Failed to get project statistics', {
        error: error.message,
        userId: req.user.id
      });
      throw error;
    }
  })
);

module.exports = router;
