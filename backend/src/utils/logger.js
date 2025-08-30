const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'application.log');
    this.errorFile = path.join(logsDir, 'error.log');
    this.auditFile = path.join(logsDir, 'audit.log');
  }

  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    return JSON.stringify(logEntry) + '\n';
  }

  _writeToFile(file, content) {
    try {
      fs.appendFileSync(file, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, data = null) {
    const logMessage = this._formatMessage('INFO', message, data);
    console.log(`ℹ️ ${message}`, data || '');
    this._writeToFile(this.logFile, logMessage);
  }

  warn(message, data = null) {
    const logMessage = this._formatMessage('WARN', message, data);
    console.warn(`⚠️ ${message}`, data || '');
    this._writeToFile(this.logFile, logMessage);
  }

  error(message, data = null) {
    const logMessage = this._formatMessage('ERROR', message, data);
    console.error(`❌ ${message}`, data || '');
    this._writeToFile(this.logFile, logMessage);
    this._writeToFile(this.errorFile, logMessage);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this._formatMessage('DEBUG', message, data);
      console.debug(`🐛 ${message}`, data || '');
      this._writeToFile(this.logFile, logMessage);
    }
  }

  audit(action, userId, data = null) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      ...(data && { data })
    };

    const logMessage = JSON.stringify(auditEntry) + '\n';
    this._writeToFile(this.auditFile, logMessage);
    
    this.info(`AUDIT: ${action} by user ${userId}`, data);
  }

  // Blockchain-specific logging
  blockchain(message, transactionData = null) {
    const blockchainLogFile = path.join(logsDir, 'blockchain.log');
    const logMessage = this._formatMessage('BLOCKCHAIN', message, transactionData);
    
    console.log(`⛓️ ${message}`, transactionData || '');
    this._writeToFile(this.logFile, logMessage);
    this._writeToFile(blockchainLogFile, logMessage);
  }

  // Security-related logging
  security(message, securityData = null) {
    const securityLogFile = path.join(logsDir, 'security.log');
    const logMessage = this._formatMessage('SECURITY', message, securityData);
    
    console.log(`🔒 ${message}`, securityData || '');
    this._writeToFile(this.logFile, logMessage);
    this._writeToFile(securityLogFile, logMessage);
  }

  // Performance logging
  performance(operation, duration, data = null) {
    const performanceLogFile = path.join(logsDir, 'performance.log');
    const logMessage = this._formatMessage('PERFORMANCE', `${operation} took ${duration}ms`, data);
    
    if (duration > 1000) { // Log slow operations
      console.log(`⏱️ SLOW: ${operation} took ${duration}ms`, data || '');
    }
    
    this._writeToFile(performanceLogFile, logMessage);
  }

  // Clean old logs (call periodically)
  cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const logFiles = fs.readdirSync(logsDir);
      
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`Cleaned old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error('Failed to clean old logs:', error);
    }
  }
}

module.exports = new Logger();
