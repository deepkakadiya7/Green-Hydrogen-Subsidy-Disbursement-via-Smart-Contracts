const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const blockchainService = require('./services/blockchainService');

// Route imports
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const milestoneRoutes = require('./routes/milestones');
const oracleRoutes = require('./routes/oracle');
const auditRoutes = require('./routes/audit');
const integrationRoutes = require('./routes/integration');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware.authenticateToken, projectRoutes);
app.use('/api/milestones', authMiddleware.authenticateToken, milestoneRoutes);
app.use('/api/oracle', authMiddleware.authenticateToken, oracleRoutes);
app.use('/api/audit', authMiddleware.authenticateToken, auditRoutes);
app.use('/api/integration', authMiddleware.authenticateToken, integrationRoutes);

// Blockchain connection status endpoint
app.get('/api/blockchain/status', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const status = await blockchainService.getConnectionStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get blockchain status' });
  }
});

// Contract information endpoint
app.get('/api/contracts/info', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const info = await blockchainService.getContractInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contract information' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use(errorHandler.errorHandler);

// Initialize blockchain connection
async function initializeApp() {
  try {
    await blockchainService.initialize();
    if (blockchainService.initialized) {
      console.log('✅ Blockchain service initialized successfully');
    } else {
      console.log('⚠️  Running without blockchain connectivity');
    }
  } catch (error) {
    console.error('❌ Failed to initialize blockchain service:', error.message);
    console.log('⚠️  Continuing without blockchain connectivity');
  }
}

// Start server
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  initializeApp().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Green Hydrogen Subsidy API server running on port ${PORT}`);
      console.log(`📖 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔗 Blockchain status at http://localhost:${PORT}/api/blockchain/status`);
    });
  });
}

module.exports = app;
