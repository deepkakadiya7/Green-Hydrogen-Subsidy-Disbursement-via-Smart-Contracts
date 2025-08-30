const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Data Integration Service
 * Handles integration with IoT devices, government databases, and third-party verifiers
 */
class DataIntegrationService {
  constructor() {
    this.sources = {
      iot: {
        baseURL: process.env.IOT_PLATFORM_URL || 'https://iot.greenhydrogen.com',
        apiKey: process.env.IOT_PLATFORM_API_KEY,
        timeout: 15000
      },
      government: {
        baseURL: process.env.GOVERNMENT_API_URL || 'https://data.energy.gov',
        apiKey: process.env.GOVERNMENT_API_KEY,
        timeout: 30000
      },
      thirdParty: {
        baseURL: process.env.THIRD_PARTY_VERIFIER_URL || 'https://api.verifier.com',
        apiKey: process.env.THIRD_PARTY_API_KEY,
        timeout: 20000
      }
    };
  }

  /**
   * Get production data from IoT hydrogen meters
   */
  async getIoTProductionData(deviceId, fromDate, toDate) {
    try {
      logger.info('Fetching IoT production data', { deviceId, fromDate, toDate });

      const config = {
        method: 'GET',
        url: `${this.sources.iot.baseURL}/devices/${deviceId}/production`,
        params: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          metric: 'hydrogen_production_kg'
        },
        headers: {
          'Authorization': `Bearer ${this.sources.iot.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.sources.iot.timeout
      };

      const response = await axios(config);
      
      logger.info('IoT data retrieved successfully', {
        deviceId,
        dataPoints: response.data.measurements.length,
        totalProduction: response.data.summary.total_production
      });

      return {
        deviceId,
        period: { fromDate, toDate },
        measurements: response.data.measurements.map(m => ({
          timestamp: new Date(m.timestamp),
          value: m.value,
          unit: m.unit,
          quality: m.quality_score,
          deviceStatus: m.device_status
        })),
        summary: {
          totalProduction: response.data.summary.total_production,
          averageQuality: response.data.summary.average_quality,
          dataPoints: response.data.measurements.length,
          deviceUptime: response.data.summary.device_uptime
        },
        metadata: {
          deviceModel: response.data.device_info.model,
          calibrationDate: response.data.device_info.last_calibration,
          certificationLevel: response.data.device_info.certification
        }
      };

    } catch (error) {
      logger.error('Failed to fetch IoT production data', {
        error: error.message,
        deviceId,
        fromDate,
        toDate
      });
      throw new Error(`IoT data retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get energy consumption data from government databases
   */
  async getGovernmentEnergyData(facilityId, fromDate, toDate) {
    try {
      logger.info('Fetching government energy data', { facilityId, fromDate, toDate });

      const config = {
        method: 'GET',
        url: `${this.sources.government.baseURL}/facilities/${facilityId}/energy-consumption`,
        params: {
          start_date: fromDate.toISOString().split('T')[0],
          end_date: toDate.toISOString().split('T')[0],
          data_type: 'renewable_energy_usage'
        },
        headers: {
          'Authorization': `Bearer ${this.sources.government.apiKey}`,
          'X-API-Version': '2.0'
        },
        timeout: this.sources.government.timeout
      };

      const response = await axios(config);

      return {
        facilityId,
        period: { fromDate, toDate },
        energyData: response.data.energy_records.map(record => ({
          date: new Date(record.date),
          renewableEnergyUsed: record.renewable_kwh,
          totalEnergyUsed: record.total_kwh,
          renewablePercentage: record.renewable_percentage,
          carbonFootprint: record.carbon_footprint_kg,
          certifications: record.green_certifications
        })),
        summary: {
          totalRenewableEnergy: response.data.summary.total_renewable_kwh,
          averageRenewablePercentage: response.data.summary.avg_renewable_percentage,
          totalCarbonSaved: response.data.summary.carbon_saved_kg,
          complianceScore: response.data.summary.compliance_score
        },
        certifications: response.data.certifications
      };

    } catch (error) {
      logger.error('Failed to fetch government energy data', {
        error: error.message,
        facilityId,
        fromDate,
        toDate
      });
      throw new Error(`Government data retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get third-party verification data
   */
  async getThirdPartyVerification(verificationId, projectId) {
    try {
      logger.info('Fetching third-party verification', { verificationId, projectId });

      const config = {
        method: 'GET',
        url: `${this.sources.thirdParty.baseURL}/verifications/${verificationId}`,
        headers: {
          'Authorization': `Bearer ${this.sources.thirdParty.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.sources.thirdParty.timeout
      };

      const response = await axios(config);

      return {
        verificationId,
        projectId,
        status: response.data.verification_status,
        verifierName: response.data.verifier_info.name,
        verifierCertification: response.data.verifier_info.certification,
        results: {
          productionVerified: response.data.results.production_verified,
          qualityAssessment: response.data.results.quality_assessment,
          environmentalCompliance: response.data.results.environmental_compliance,
          processEfficiency: response.data.results.process_efficiency
        },
        documentation: response.data.documentation_links,
        completedAt: new Date(response.data.completed_at),
        expiresAt: new Date(response.data.expires_at)
      };

    } catch (error) {
      logger.error('Failed to fetch third-party verification', {
        error: error.message,
        verificationId,
        projectId
      });
      throw new Error(`Third-party verification failed: ${error.message}`);
    }
  }

  /**
   * Submit data for cross-verification
   */
  async submitForVerification(verificationData) {
    const { projectId, milestoneId, productionData, energyData } = verificationData;

    try {
      const payload = {
        project_id: projectId,
        milestone_id: milestoneId,
        production_data: productionData,
        energy_data: energyData,
        verification_type: 'milestone_completion',
        priority: 'normal'
      };

      const response = await this._makeRequest(
        'POST',
        '/verifications',
        payload,
        this.sources.thirdParty
      );

      logger.audit('VERIFICATION_SUBMITTED', null, {
        projectId,
        milestoneId,
        verificationId: response.data.verification_id,
        estimatedCompletion: response.data.estimated_completion
      });

      return {
        verificationId: response.data.verification_id,
        status: response.data.status,
        estimatedCompletion: new Date(response.data.estimated_completion),
        cost: response.data.verification_cost,
        requiredDocuments: response.data.required_documents
      };

    } catch (error) {
      logger.error('Failed to submit for verification', {
        error: error.message,
        projectId,
        milestoneId
      });
      throw error;
    }
  }

  /**
   * Get real-time production metrics
   */
  async getRealTimeMetrics(sourceIds) {
    try {
      const metricsPromises = sourceIds.map(async (sourceId) => {
        try {
          const response = await this._makeRequest(
            'GET',
            `/devices/${sourceId}/realtime`,
            null,
            this.sources.iot
          );

          return {
            sourceId,
            timestamp: new Date(response.data.timestamp),
            production: response.data.current_production,
            efficiency: response.data.efficiency,
            status: response.data.device_status,
            alerts: response.data.active_alerts || []
          };
        } catch (error) {
          logger.warn('Failed to get metrics for source', { sourceId, error: error.message });
          return {
            sourceId,
            error: error.message,
            timestamp: new Date()
          };
        }
      });

      const metrics = await Promise.allSettled(metricsPromises);
      
      return {
        timestamp: new Date(),
        sources: metrics.map(result => result.value || result.reason),
        summary: {
          totalSources: sourceIds.length,
          activeSources: metrics.filter(m => m.status === 'fulfilled' && !m.value.error).length,
          totalProduction: metrics
            .filter(m => m.status === 'fulfilled' && m.value.production)
            .reduce((sum, m) => sum + m.value.production, 0)
        }
      };

    } catch (error) {
      logger.error('Failed to get real-time metrics', {
        error: error.message,
        sourceIds
      });
      throw error;
    }
  }

  /**
   * Validate data source reliability
   */
  async validateDataSource(sourceId, sourceType) {
    try {
      const sourceConfig = this._getSourceConfig(sourceType);
      
      const config = {
        method: 'GET',
        url: `${sourceConfig.baseURL}/sources/${sourceId}/validation`,
        headers: {
          'Authorization': `Bearer ${sourceConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: sourceConfig.timeout
      };

      const response = await axios(config);

      return {
        sourceId,
        isValid: response.data.valid,
        reliabilityScore: response.data.reliability_score,
        lastCalibration: new Date(response.data.last_calibration),
        certificationStatus: response.data.certification_status,
        issues: response.data.issues || []
      };

    } catch (error) {
      logger.error('Data source validation failed', {
        error: error.message,
        sourceId,
        sourceType
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  async _makeRequest(method, endpoint, data = null, sourceConfig) {
    const config = {
      method,
      url: `${sourceConfig.baseURL}${endpoint}`,
      timeout: sourceConfig.timeout,
      headers: {
        'Authorization': `Bearer ${sourceConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: No response received');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  _getSourceConfig(sourceType) {
    const configMap = {
      'iot': this.sources.iot,
      'government': this.sources.government,
      'third_party': this.sources.thirdParty
    };

    return configMap[sourceType] || this.sources.iot;
  }

  /**
   * Aggregate data from multiple sources
   */
  async getAggregatedProductionData(sources, fromDate, toDate) {
    try {
      const dataPromises = sources.map(async (source) => {
        try {
          switch (source.type) {
            case 'iot':
              return await this.getIoTProductionData(source.id, fromDate, toDate);
            case 'government':
              return await this.getGovernmentEnergyData(source.id, fromDate, toDate);
            case 'third_party':
              return await this.getThirdPartyVerification(source.id, source.projectId);
            default:
              throw new Error(`Unsupported source type: ${source.type}`);
          }
        } catch (error) {
          logger.warn('Failed to get data from source', { 
            sourceId: source.id, 
            sourceType: source.type, 
            error: error.message 
          });
          return { error: error.message, sourceId: source.id };
        }
      });

      const results = await Promise.allSettled(dataPromises);
      
      // Calculate aggregated metrics
      const validResults = results
        .filter(r => r.status === 'fulfilled' && !r.value.error)
        .map(r => r.value);

      const totalProduction = validResults.reduce((sum, result) => {
        if (result.summary && result.summary.totalProduction) {
          return sum + result.summary.totalProduction;
        }
        return sum;
      }, 0);

      const averageQuality = validResults.reduce((sum, result, _, arr) => {
        if (result.summary && result.summary.averageQuality) {
          return sum + result.summary.averageQuality / arr.length;
        }
        return sum;
      }, 0);

      return {
        period: { fromDate, toDate },
        sources: results.map(r => r.value || { error: r.reason }),
        aggregated: {
          totalProduction,
          averageQuality,
          sourcesUsed: validResults.length,
          dataReliability: (validResults.length / sources.length) * 100
        },
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to aggregate production data', {
        error: error.message,
        sources: sources.map(s => ({ id: s.id, type: s.type }))
      });
      throw error;
    }
  }

  /**
   * Monitor data source health
   */
  async monitorSourceHealth() {
    const healthChecks = [];

    for (const [sourceType, config] of Object.entries(this.sources)) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${config.baseURL}/health`, {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
          timeout: 5000
        });
        
        const responseTime = Date.now() - startTime;

        healthChecks.push({
          sourceType,
          status: 'healthy',
          responseTime,
          lastCheck: new Date(),
          details: response.data
        });

      } catch (error) {
        healthChecks.push({
          sourceType,
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date()
        });

        logger.warn('Data source health check failed', {
          sourceType,
          error: error.message
        });
      }
    }

    return {
      timestamp: new Date(),
      sources: healthChecks,
      overallHealth: healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded'
    };
  }

  /**
   * Cache frequently accessed data
   */
  async getCachedData(cacheKey, fetchFunction, ttlSeconds = 3600) {
    // In production, use Redis or similar caching solution
    // For now, implement simple in-memory cache

    const cacheStore = this._getCache();
    const cached = cacheStore.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('Cache hit', { cacheKey });
      return cached.data;
    }

    try {
      const data = await fetchFunction();
      
      cacheStore.set(cacheKey, {
        data,
        expiresAt: Date.now() + (ttlSeconds * 1000)
      });

      logger.debug('Cache miss - data fetched and cached', { cacheKey });
      return data;

    } catch (error) {
      logger.error('Failed to fetch and cache data', {
        error: error.message,
        cacheKey
      });
      throw error;
    }
  }

  _getCache() {
    if (!this.cache) {
      this.cache = new Map();
    }
    return this.cache;
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const cache = this._getCache();
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of cache.entries()) {
      if (value.expiresAt <= now) {
        cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned expired cache entries', { cleanedCount });
    }
  }
}

module.exports = new DataIntegrationService();
