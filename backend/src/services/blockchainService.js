const { ethers } = require('ethers');
const crypto = require('crypto-js');

// Contract ABIs (simplified for demo - in production, import from artifacts)
const SUBSIDY_CONTRACT_ABI = [
  "function registerProject(address _producer, string memory _name, string memory _description, uint256 _totalSubsidyAmount) external returns (uint256)",
  "function addMilestone(uint256 _projectId, string memory _description, uint256 _subsidyAmount, uint256 _targetValue, string memory _verificationSource, uint256 _deadline) external returns (uint256)",
  "function verifyMilestone(uint256 _milestoneId, uint256 _actualValue, bool _success) external",
  "function getProject(uint256 _projectId) external view returns (uint256 id, address producer, string memory name, string memory description, uint256 totalSubsidyAmount, uint256 disbursedAmount, uint256 createdAt, uint8 status)",
  "function getMilestone(uint256 _milestoneId) external view returns (uint256 id, uint256 projectId, string memory description, uint256 subsidyAmount, uint256 targetValue, uint256 actualValue, string memory verificationSource, uint256 deadline, uint8 status, uint256 verifiedAt, address verifiedBy, bool paid)",
  "function getProducerProjects(address _producer) external view returns (uint256[] memory)",
  "function getProjectMilestones(uint256 _projectId) external view returns (uint256[] memory)",
  "function getContractBalance() external view returns (uint256)",
  "function getAvailableSubsidy() external view returns (uint256)",
  "function addFunds() external payable",
  "event ProjectRegistered(uint256 indexed projectId, address indexed producer, string name, uint256 totalSubsidy)",
  "event MilestoneAdded(uint256 indexed projectId, uint256 indexed milestoneId, string description, uint256 subsidyAmount)",
  "event MilestoneVerified(uint256 indexed milestoneId, uint256 actualValue, address indexed verifier)",
  "event SubsidyDisbursed(uint256 indexed projectId, uint256 indexed milestoneId, address indexed recipient, uint256 amount)"
];

const ORACLE_CONTRACT_ABI = [
  "function submitData(string memory _source, uint256 _value, string memory _metadata) external returns (bytes32)",
  "function verifyData(bytes32 _dataId, bool _verified) external",
  "function getVerifiedData(string memory _source, uint256 _fromTimestamp, uint256 _toTimestamp) external view returns (bytes32[] memory validDataIds, uint256[] memory values)",
  "function getAggregateValue(string memory _source, uint256 _fromTimestamp, uint256 _toTimestamp) external view returns (uint256 totalValue, uint256 dataPointCount)",
  "function addTrustedSource(string memory _source, uint8 _sourceType) external",
  "function isSourceTrusted(string memory _source) external view returns (bool)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.subsidyContract = null;
    this.oracleContract = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Check if blockchain environment is configured
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      const subsidyAddress = process.env.SUBSIDY_CONTRACT_ADDRESS;
      const oracleAddress = process.env.ORACLE_CONTRACT_ADDRESS;
      
      if (!privateKey || privateKey === '0xyour_private_key_here' || 
          !subsidyAddress || subsidyAddress === '0x0000000000000000000000000000000000000000' ||
          !oracleAddress || oracleAddress === '0x0000000000000000000000000000000000000000') {
        console.log('⚠️  Blockchain environment not configured. Running in demo mode.');
        this.initialized = false;
        return;
      }
      
      // Connect to blockchain
      const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(providerUrl);
      
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Initialize contracts
      this.subsidyContract = new ethers.Contract(subsidyAddress, SUBSIDY_CONTRACT_ABI, this.signer);
      this.oracleContract = new ethers.Contract(oracleAddress, ORACLE_CONTRACT_ABI, this.signer);
      
      // Test connection
      await this.provider.getNetwork();
      
      this.initialized = true;
      console.log('✅ Blockchain service initialized successfully');
      
    } catch (error) {
      console.log('⚠️  Blockchain service initialization failed. Running in demo mode.');
      console.error('Error details:', error.message);
      this.initialized = false;
    }
  }

  async getConnectionStatus() {
    if (!this.initialized) {
      return { 
        connected: false, 
        mode: 'demo',
        message: 'Running in demo mode without blockchain connectivity' 
      };
    }

    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const balance = await this.signer.getBalance();
      
      return {
        connected: true,
        mode: 'blockchain',
        network: network.name,
        chainId: network.chainId,
        blockNumber,
        signerAddress: this.signer.address,
        signerBalance: ethers.formatEther(balance)
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  async getContractInfo() {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      const [contractBalance, availableSubsidy, totalDisbursed] = await Promise.all([
        this.subsidyContract.getContractBalance(),
        this.subsidyContract.getAvailableSubsidy(),
        this.subsidyContract.totalDisbursed()
      ]);

      return {
        subsidyContract: this.subsidyContract.address,
        oracleContract: this.oracleContract.address,
        contractBalance: ethers.formatEther(contractBalance),
        availableSubsidy: ethers.formatEther(availableSubsidy),
        totalDisbursed: ethers.formatEther(totalDisbursed)
      };
    } catch (error) {
      throw new Error(`Failed to get contract info: ${error.message}`);
    }
  }

  // Project-related methods
  async registerProject(producerAddress, name, description, totalSubsidyAmount) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.subsidyContract.registerProject(
        producerAddress,
        name,
        description,
        ethers.parseEther(totalSubsidyAmount.toString())
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ProjectRegistered');
      
      return {
        projectId: event.args.projectId.toNumber(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      throw new Error(`Failed to register project: ${error.message}`);
    }
  }

  async getProject(projectId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const project = await this.subsidyContract.getProject(projectId);
      
      return {
        id: project.id.toNumber(),
        producer: project.producer,
        name: project.name,
        description: project.description,
        totalSubsidyAmount: ethers.formatEther(project.totalSubsidyAmount),
        disbursedAmount: ethers.formatEther(project.disbursedAmount),
        createdAt: new Date(project.createdAt.toNumber() * 1000),
        status: this._getProjectStatusName(project.status)
      };
    } catch (error) {
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  async getProducerProjects(producerAddress) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const projectIds = await this.subsidyContract.getProducerProjects(producerAddress);
      const projects = await Promise.all(
        projectIds.map(id => this.getProject(id.toNumber()))
      );
      
      return projects;
    } catch (error) {
      throw new Error(`Failed to get producer projects: ${error.message}`);
    }
  }

  // Milestone-related methods
  async addMilestone(projectId, description, subsidyAmount, targetValue, verificationSource, deadline) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.subsidyContract.addMilestone(
        projectId,
        description,
        ethers.parseEther(subsidyAmount.toString()),
        targetValue,
        verificationSource,
        Math.floor(deadline.getTime() / 1000)
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'MilestoneAdded');
      
      return {
        milestoneId: event.args.milestoneId.toNumber(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      throw new Error(`Failed to add milestone: ${error.message}`);
    }
  }

  async getMilestone(milestoneId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const milestone = await this.subsidyContract.getMilestone(milestoneId);
      
      return {
        id: milestone.id.toNumber(),
        projectId: milestone.projectId.toNumber(),
        description: milestone.description,
        subsidyAmount: ethers.formatEther(milestone.subsidyAmount),
        targetValue: milestone.targetValue.toNumber(),
        actualValue: milestone.actualValue.toNumber(),
        verificationSource: milestone.verificationSource,
        deadline: new Date(milestone.deadline.toNumber() * 1000),
        status: this._getMilestoneStatusName(milestone.status),
        verifiedAt: milestone.verifiedAt.toNumber() > 0 ? new Date(milestone.verifiedAt.toNumber() * 1000) : null,
        verifiedBy: milestone.verifiedBy !== ethers.constants.AddressZero ? milestone.verifiedBy : null,
        paid: milestone.paid
      };
    } catch (error) {
      throw new Error(`Failed to get milestone: ${error.message}`);
    }
  }

  async verifyMilestone(milestoneId, actualValue, success) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.subsidyContract.verifyMilestone(milestoneId, actualValue, success);
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        events: receipt.events.map(e => ({
          event: e.event,
          args: e.args
        }))
      };
    } catch (error) {
      throw new Error(`Failed to verify milestone: ${error.message}`);
    }
  }

  async getProjectMilestones(projectId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const milestoneIds = await this.subsidyContract.getProjectMilestones(projectId);
      const milestones = await Promise.all(
        milestoneIds.map(id => this.getMilestone(id.toNumber()))
      );
      
      return milestones;
    } catch (error) {
      throw new Error(`Failed to get project milestones: ${error.message}`);
    }
  }

  // Oracle-related methods
  async submitOracleData(source, value, metadata) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.oracleContract.submitData(source, value, metadata);
      const receipt = await tx.wait();
      
      return {
        dataId: receipt.events[0].args.dataId,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      throw new Error(`Failed to submit oracle data: ${error.message}`);
    }
  }

  async getVerifiedData(source, fromTimestamp, toTimestamp) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.oracleContract.getVerifiedData(
        source,
        Math.floor(fromTimestamp.getTime() / 1000),
        Math.floor(toTimestamp.getTime() / 1000)
      );
      
      return {
        dataIds: result.validDataIds,
        values: result.values.map(v => v.toNumber())
      };
    } catch (error) {
      throw new Error(`Failed to get verified data: ${error.message}`);
    }
  }

  async getAggregateValue(source, fromTimestamp, toTimestamp) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.oracleContract.getAggregateValue(
        source,
        Math.floor(fromTimestamp.getTime() / 1000),
        Math.floor(toTimestamp.getTime() / 1000)
      );
      
      return {
        totalValue: result.totalValue.toNumber(),
        dataPointCount: result.dataPointCount.toNumber()
      };
    } catch (error) {
      throw new Error(`Failed to get aggregate value: ${error.message}`);
    }
  }

  // Event listening methods
  async subscribeToEvents(eventFilters, callback) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      // Subscribe to subsidy contract events
      this.subsidyContract.on(eventFilters.subsidyEvents || '*', (event) => {
        callback({
          contract: 'subsidy',
          event: event.event,
          args: event.args,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      // Subscribe to oracle contract events
      this.oracleContract.on(eventFilters.oracleEvents || '*', (event) => {
        callback({
          contract: 'oracle',
          event: event.event,
          args: event.args,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

    } catch (error) {
      throw new Error(`Failed to subscribe to events: ${error.message}`);
    }
  }

  // Utility methods
  _getProjectStatusName(status) {
    const statuses = ['Pending', 'Active', 'Completed', 'Suspended', 'Cancelled'];
    return statuses[status] || 'Unknown';
  }

  _getMilestoneStatusName(status) {
    const statuses = ['Pending', 'Verified', 'Failed', 'Disputed'];
    return statuses[status] || 'Unknown';
  }

  // Security methods
  encryptSensitiveData(data) {
    const secretKey = process.env.ENCRYPTION_SECRET || 'default-secret-key';
    return crypto.AES.encrypt(JSON.stringify(data), secretKey).toString();
  }

  decryptSensitiveData(encryptedData) {
    const secretKey = process.env.ENCRYPTION_SECRET || 'default-secret-key';
    const bytes = crypto.AES.decrypt(encryptedData, secretKey);
    return JSON.parse(bytes.toString(crypto.enc.Utf8));
  }

  // Transaction monitoring
  async waitForTransaction(txHash, confirmations = 1) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      return receipt;
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // Gas estimation
  async estimateGas(contractMethod, params) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const gasEstimate = await contractMethod.estimateGas(...params);
      const gasPrice = await this.provider.getGasPrice();
      
      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: ethers.formatEther(gasEstimate * gasPrice)
      };
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }
}

module.exports = new BlockchainService();
