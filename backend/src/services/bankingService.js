const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Banking Integration Service
 * Handles integration with legacy banking systems and payment gateways
 */
class BankingService {
  constructor() {
    this.baseURL = process.env.BANKING_API_URL || 'https://api.bank.gov';
    this.apiKey = process.env.BANKING_API_KEY;
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  /**
   * Initialize banking service connection
   */
  async initialize() {
    try {
      // Test connection to banking API
      const response = await this._makeRequest('GET', '/health');
      logger.info('Banking service initialized successfully', { status: response.status });
      return true;
    } catch (error) {
      logger.error('Failed to initialize banking service', { error: error.message });
      throw new Error(`Banking service initialization failed: ${error.message}`);
    }
  }

  /**
   * Process subsidy payment to beneficiary bank account
   */
  async processSubsidyPayment(paymentData) {
    const { 
      beneficiaryAccount, 
      amount, 
      reference, 
      milestoneId, 
      projectId,
      currency = 'USD' 
    } = paymentData;

    try {
      logger.info('Processing subsidy payment', { 
        milestoneId, 
        amount, 
        beneficiaryAccount: this._maskAccountNumber(beneficiaryAccount) 
      });

      // Prepare payment payload
      const payload = {
        transaction_id: `GH_${projectId}_${milestoneId}_${Date.now()}`,
        beneficiary_account: beneficiaryAccount,
        amount: parseFloat(amount),
        currency,
        reference,
        purpose_code: 'GREEN_HYDROGEN_SUBSIDY',
        metadata: {
          project_id: projectId,
          milestone_id: milestoneId,
          timestamp: new Date().toISOString()
        }
      };

      // Add security signature
      payload.signature = this._generatePaymentSignature(payload);

      const response = await this._makeRequest('POST', '/payments/subsidy', payload);

      logger.audit('BANKING_PAYMENT_INITIATED', null, {
        transactionId: payload.transaction_id,
        amount,
        beneficiaryAccount: this._maskAccountNumber(beneficiaryAccount),
        bankTransactionId: response.data.transaction_id
      });

      return {
        success: true,
        transactionId: response.data.transaction_id,
        bankReference: response.data.reference,
        status: response.data.status,
        estimatedCompletionTime: response.data.estimated_completion,
        fees: response.data.fees
      };

    } catch (error) {
      logger.error('Banking payment failed', {
        error: error.message,
        milestoneId,
        projectId,
        beneficiaryAccount: this._maskAccountNumber(beneficiaryAccount)
      });

      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId) {
    try {
      const response = await this._makeRequest('GET', `/payments/${transactionId}/status`);
      
      return {
        transactionId,
        status: response.data.status,
        completedAt: response.data.completed_at,
        failureReason: response.data.failure_reason,
        fees: response.data.fees
      };

    } catch (error) {
      logger.error('Failed to check payment status', { 
        error: error.message, 
        transactionId 
      });
      throw error;
    }
  }

  /**
   * Validate bank account details
   */
  async validateBankAccount(accountDetails) {
    const { accountNumber, routingNumber, accountHolderName } = accountDetails;

    try {
      const payload = {
        account_number: accountNumber,
        routing_number: routingNumber,
        account_holder_name: accountHolderName
      };

      const response = await this._makeRequest('POST', '/validation/account', payload);

      return {
        isValid: response.data.valid,
        accountType: response.data.account_type,
        bankName: response.data.bank_name,
        verificationLevel: response.data.verification_level,
        riskScore: response.data.risk_score
      };

    } catch (error) {
      logger.error('Bank account validation failed', { 
        error: error.message,
        accountNumber: this._maskAccountNumber(accountNumber)
      });
      throw error;
    }
  }

  /**
   * Get supported currencies and limits
   */
  async getSupportedCurrencies() {
    try {
      const response = await this._makeRequest('GET', '/currencies');
      return response.data.currencies;
    } catch (error) {
      logger.error('Failed to get supported currencies', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate transfer fees
   */
  async calculateFees(amount, currency, paymentMethod) {
    try {
      const response = await this._makeRequest('POST', '/fees/calculate', {
        amount,
        currency,
        payment_method: paymentMethod,
        purpose: 'SUBSIDY_PAYMENT'
      });

      return {
        baseFee: response.data.base_fee,
        percentageFee: response.data.percentage_fee,
        totalFees: response.data.total_fees,
        netAmount: response.data.net_amount
      };

    } catch (error) {
      logger.error('Fee calculation failed', { error: error.message, amount, currency });
      throw error;
    }
  }

  /**
   * Process bulk payments (for multiple milestones)
   */
  async processBulkPayments(payments) {
    try {
      const batchId = `BATCH_${Date.now()}`;
      const payload = {
        batch_id: batchId,
        payments: payments.map(p => ({
          ...p,
          signature: this._generatePaymentSignature(p)
        }))
      };

      const response = await this._makeRequest('POST', '/payments/bulk', payload);

      logger.audit('BULK_PAYMENT_INITIATED', null, {
        batchId,
        paymentCount: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
      });

      return {
        batchId,
        status: response.data.status,
        successCount: response.data.success_count,
        failureCount: response.data.failure_count,
        results: response.data.results
      };

    } catch (error) {
      logger.error('Bulk payment processing failed', { 
        error: error.message,
        paymentCount: payments.length 
      });
      throw error;
    }
  }

  /**
   * Handle payment webhook notifications
   */
  async handleWebhook(webhookData, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = this._generateWebhookSignature(webhookData);
      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const { transaction_id, status, completed_at, failure_reason } = webhookData;

      logger.info('Payment webhook received', {
        transactionId: transaction_id,
        status,
        completedAt: completed_at
      });

      // Update payment status in database
      // This would update the payment_transactions table
      
      return {
        processed: true,
        transactionId: transaction_id,
        status
      };

    } catch (error) {
      logger.error('Webhook processing failed', { 
        error: error.message,
        webhookData: JSON.stringify(webhookData)
      });
      throw error;
    }
  }

  /**
   * Private methods
   */
  async _makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-API-Version': '1.0'
      }
    };

    if (data) {
      config.data = data;
    }

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios(config);
        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          break;
        }

        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  _generatePaymentSignature(paymentData) {
    const signingKey = process.env.BANKING_SIGNING_KEY || 'default-signing-key';
    const dataString = JSON.stringify(paymentData);
    return crypto.createHmac('sha256', signingKey).update(dataString).digest('hex');
  }

  _generateWebhookSignature(webhookData) {
    const webhookSecret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || 'webhook-secret';
    const dataString = JSON.stringify(webhookData);
    return crypto.createHmac('sha256', webhookSecret).update(dataString).digest('hex');
  }

  _maskAccountNumber(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) return 'XXXX';
    return 'XXXX' + accountNumber.slice(-4);
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await this._makeRequest('GET', `/payments/history?${queryParams}`);
      
      return response.data.payments;
    } catch (error) {
      logger.error('Failed to get payment history', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Cancel pending payment
   */
  async cancelPayment(transactionId, reason) {
    try {
      const payload = { reason };
      const response = await this._makeRequest('POST', `/payments/${transactionId}/cancel`, payload);

      logger.audit('PAYMENT_CANCELLED', null, {
        transactionId,
        reason,
        cancelledAt: new Date().toISOString()
      });

      return {
        cancelled: true,
        refundAmount: response.data.refund_amount,
        refundReference: response.data.refund_reference
      };

    } catch (error) {
      logger.error('Payment cancellation failed', { 
        error: error.message, 
        transactionId 
      });
      throw error;
    }
  }
}

module.exports = new BankingService();
