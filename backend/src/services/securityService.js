const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Security Service
 * Provides encryption, access control, and security monitoring functionality
 */
class SecurityService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret';
    this.saltRounds = 12;
    this.sessionStore = new Map(); // In production, use Redis
    this.failedAttempts = new Map();
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag, algorithm } = encryptedData;
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Hash password securely
   */
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      throw new Error('Password verification failed');
    }
  }

  /**
   * Generate secure JWT token
   */
  generateSecureToken(payload, expiresIn = '24h') {
    try {
      const tokenId = crypto.randomUUID();
      const tokenPayload = {
        ...payload,
        jti: tokenId,
        iat: Math.floor(Date.now() / 1000),
        iss: 'green-hydrogen-subsidy-system'
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, { expiresIn });
      
      // Store token in session store for revocation capability
      this.sessionStore.set(tokenId, {
        userId: payload.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this._parseExpirationTime(expiresIn)),
        isValid: true
      });

      return { token, tokenId };
    } catch (error) {
      logger.error('Token generation failed', { error: error.message });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check if token is revoked
      const session = this.sessionStore.get(decoded.jti);
      if (!session || !session.isValid) {
        throw new Error('Token has been revoked');
      }

      return decoded;
    } catch (error) {
      logger.security('Token verification failed', { 
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Revoke token (logout)
   */
  revokeToken(tokenId) {
    try {
      const session = this.sessionStore.get(tokenId);
      if (session) {
        session.isValid = false;
        logger.security('Token revoked', { tokenId, userId: session.userId });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Token revocation failed', { error: error.message, tokenId });
      throw error;
    }
  }

  /**
   * Track and limit failed login attempts
   */
  trackFailedAttempt(identifier) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || { count: 0, firstAttempt: now };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    // Reset counter if first attempt was more than 1 hour ago
    if (now - attempts.firstAttempt > 3600000) {
      attempts.count = 1;
      attempts.firstAttempt = now;
    }

    this.failedAttempts.set(identifier, attempts);

    logger.security('Failed authentication attempt tracked', {
      identifier: this._maskIdentifier(identifier),
      attemptCount: attempts.count
    });

    return attempts;
  }

  /**
   * Check if account is locked due to failed attempts
   */
  isAccountLocked(identifier) {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts) return false;

    const lockThreshold = 5;
    const lockDuration = 3600000; // 1 hour

    if (attempts.count >= lockThreshold) {
      const lockUntil = attempts.lastAttempt + lockDuration;
      if (Date.now() < lockUntil) {
        return {
          locked: true,
          lockUntil: new Date(lockUntil),
          attemptCount: attempts.count
        };
      } else {
        // Lock period expired, reset attempts
        this.failedAttempts.delete(identifier);
      }
    }

    return { locked: false };
  }

  /**
   * Reset failed attempts (successful login)
   */
  resetFailedAttempts(identifier) {
    this.failedAttempts.delete(identifier);
    logger.security('Failed attempts reset', { 
      identifier: this._maskIdentifier(identifier) 
    });
  }

  /**
   * Generate API key for external integrations
   */
  generateApiKey(purpose, expiresAt = null) {
    try {
      const keyId = crypto.randomUUID();
      const keySecret = crypto.randomBytes(32).toString('hex');
      
      const apiKey = {
        keyId,
        secret: keySecret,
        purpose,
        createdAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        usageCount: 0,
        lastUsed: null
      };

      // In production, store in database
      logger.audit('API_KEY_GENERATED', null, {
        keyId,
        purpose,
        expiresAt
      });

      return {
        keyId,
        secret: keySecret,
        fullKey: `${keyId}.${keySecret}`
      };
    } catch (error) {
      logger.error('API key generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify API key
   */
  verifyApiKey(apiKey) {
    try {
      const [keyId, secret] = apiKey.split('.');
      
      if (!keyId || !secret) {
        throw new Error('Invalid API key format');
      }

      // In production, verify against database
      logger.security('API key verification attempted', { keyId });

      return {
        keyId,
        valid: true,
        purpose: 'external_integration' // Would come from database
      };
    } catch (error) {
      logger.security('API key verification failed', { 
        error: error.message,
        apiKey: apiKey.substring(0, 10) + '...'
      });
      throw error;
    }
  }

  /**
   * Create secure checksum for data integrity
   */
  createChecksum(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.createChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create digital signature for important transactions
   */
  signTransaction(transactionData, privateKey = null) {
    try {
      const signingKey = privateKey || process.env.TRANSACTION_SIGNING_KEY || 'default-key';
      const dataString = JSON.stringify(transactionData, Object.keys(transactionData).sort());
      
      const signature = crypto.createHmac('sha256', signingKey).update(dataString).digest('hex');
      
      return {
        signature,
        algorithm: 'HMAC-SHA256',
        timestamp: new Date().toISOString(),
        dataHash: crypto.createHash('sha256').update(dataString).digest('hex')
      };
    } catch (error) {
      logger.error('Transaction signing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify transaction signature
   */
  verifyTransactionSignature(transactionData, signatureData, privateKey = null) {
    try {
      const signingKey = privateKey || process.env.TRANSACTION_SIGNING_KEY || 'default-key';
      const dataString = JSON.stringify(transactionData, Object.keys(transactionData).sort());
      
      const expectedSignature = crypto.createHmac('sha256', signingKey).update(dataString).digest('hex');
      
      const isValid = signatureData.signature === expectedSignature;
      
      if (!isValid) {
        logger.security('Transaction signature verification failed', {
          expectedSignature: expectedSignature.substring(0, 10) + '...',
          providedSignature: signatureData.signature.substring(0, 10) + '...'
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Signature verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Create rate limiter for specific operations
   */
  createRateLimiter(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP',
      ...options
    };

    return rateLimit(defaultOptions);
  }

  /**
   * Monitor security events
   */
  monitorSecurityEvent(eventType, details) {
    const securityEvent = {
      type: eventType,
      timestamp: new Date(),
      details,
      severity: this._getEventSeverity(eventType),
      id: crypto.randomUUID()
    };

    logger.security('Security event detected', securityEvent);

    // In production, integrate with security monitoring systems (SIEM)
    this._processSecurityEvent(securityEvent);

    return securityEvent;
  }

  _getEventSeverity(eventType) {
    const severityMap = {
      'FAILED_LOGIN': 'medium',
      'ACCOUNT_LOCKED': 'high',
      'INVALID_TOKEN': 'medium',
      'UNAUTHORIZED_ACCESS': 'high',
      'SUSPICIOUS_ACTIVITY': 'high',
      'DATA_BREACH_ATTEMPT': 'critical',
      'PRIVILEGE_ESCALATION': 'critical'
    };

    return severityMap[eventType] || 'low';
  }

  _processSecurityEvent(event) {
    // Implement automated responses to security events
    switch (event.type) {
      case 'ACCOUNT_LOCKED':
        // Could send notification to security team
        break;
      case 'DATA_BREACH_ATTEMPT':
        // Could trigger emergency protocols
        break;
      case 'SUSPICIOUS_ACTIVITY':
        // Could increase monitoring for the user/IP
        break;
    }
  }

  _maskIdentifier(identifier) {
    if (identifier.includes('@')) {
      // Email
      const [local, domain] = identifier.split('@');
      return local.substring(0, 2) + '***@' + domain;
    } else {
      // Other identifiers
      return identifier.substring(0, 4) + '***';
    }
  }

  _parseExpirationTime(expiresIn) {
    const timeUnits = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24 hours

    const [, value, unit] = match;
    return parseInt(value) * timeUnits[unit];
  }

  /**
   * Validate Ethereum address
   */
  isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate transaction hash
   */
  isValidTransactionHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean expired sessions
   */
  cleanExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [tokenId, session] of this.sessionStore.entries()) {
      if (session.expiresAt && session.expiresAt.getTime() <= now) {
        this.sessionStore.delete(tokenId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned expired sessions', { cleanedCount });
    }
  }

  /**
   * Audit trail for security events
   */
  createAuditTrail(action, userId, resourceType, resourceId, oldData, newData) {
    const auditRecord = {
      id: crypto.randomUUID(),
      action,
      userId,
      resourceType,
      resourceId,
      oldData: oldData ? this.createChecksum(oldData) : null,
      newData: newData ? this.createChecksum(newData) : null,
      timestamp: new Date(),
      checksum: null
    };

    // Create integrity checksum
    auditRecord.checksum = this.createChecksum(auditRecord);

    logger.audit(action, userId, {
      resourceType,
      resourceId,
      auditId: auditRecord.id
    });

    return auditRecord;
  }

  /**
   * Verify audit trail integrity
   */
  verifyAuditTrail(auditRecord) {
    const { checksum, ...recordWithoutChecksum } = auditRecord;
    const calculatedChecksum = this.createChecksum(recordWithoutChecksum);
    
    return checksum === calculatedChecksum;
  }
}

module.exports = new SecurityService();
