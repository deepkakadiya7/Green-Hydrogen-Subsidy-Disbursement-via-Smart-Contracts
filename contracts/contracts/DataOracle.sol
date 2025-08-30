// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DataOracle
 * @dev Oracle contract for verifying external data sources for green hydrogen production
 * Integrates with trusted IoT devices, government databases, and third-party verification services
 */
contract DataOracle is AccessControl, Pausable {
    bytes32 public constant ORACLE_OPERATOR_ROLE = keccak256("ORACLE_OPERATOR_ROLE");
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");

    // Data source types
    enum DataSourceType { IoTDevice, GovernmentDB, ThirdPartyVerifier, Manual }

    // Data verification structure
    struct DataPoint {
        uint256 value;
        uint256 timestamp;
        string source;
        DataSourceType sourceType;
        address verifier;
        bool isVerified;
        string metadata; // Additional context or proof
    }

    // Trusted data sources
    mapping(string => bool) public trustedSources;
    mapping(string => DataSourceType) public sourceTypes;
    
    // Data storage
    mapping(bytes32 => DataPoint) public dataPoints;
    mapping(string => bytes32[]) public sourceDataHistory;
    
    // Verification thresholds
    mapping(DataSourceType => uint256) public verificationThresholds;
    mapping(string => uint256) public sourceReliabilityScore;

    // Events
    event DataSubmitted(bytes32 indexed dataId, string indexed source, uint256 value, address indexed provider);
    event DataVerified(bytes32 indexed dataId, bool verified, address indexed verifier);
    event TrustedSourceAdded(string source, DataSourceType sourceType);
    event TrustedSourceRemoved(string source);
    event VerificationThresholdUpdated(DataSourceType sourceType, uint256 newThreshold);

    modifier onlyTrustedSource(string memory _source) {
        require(trustedSources[_source], "Source not trusted");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_OPERATOR_ROLE, msg.sender);
        
        // Set default verification thresholds (out of 100)
        verificationThresholds[DataSourceType.IoTDevice] = 85;
        verificationThresholds[DataSourceType.GovernmentDB] = 95;
        verificationThresholds[DataSourceType.ThirdPartyVerifier] = 90;
        verificationThresholds[DataSourceType.Manual] = 75;
    }

    /**
     * @dev Add a trusted data source
     */
    function addTrustedSource(string memory _source, DataSourceType _sourceType) 
        external onlyRole(ORACLE_OPERATOR_ROLE) {
        trustedSources[_source] = true;
        sourceTypes[_source] = _sourceType;
        sourceReliabilityScore[_source] = verificationThresholds[_sourceType];
        emit TrustedSourceAdded(_source, _sourceType);
    }

    /**
     * @dev Remove a trusted data source
     */
    function removeTrustedSource(string memory _source) 
        external onlyRole(ORACLE_OPERATOR_ROLE) {
        trustedSources[_source] = false;
        delete sourceTypes[_source];
        delete sourceReliabilityScore[_source];
        emit TrustedSourceRemoved(_source);
    }

    /**
     * @dev Submit data from an external source
     */
    function submitData(
        string memory _source,
        uint256 _value,
        string memory _metadata
    ) external onlyRole(DATA_PROVIDER_ROLE) onlyTrustedSource(_source) whenNotPaused returns (bytes32) {
        bytes32 dataId = keccak256(abi.encodePacked(_source, _value, block.timestamp, msg.sender));
        
        dataPoints[dataId] = DataPoint({
            value: _value,
            timestamp: block.timestamp,
            source: _source,
            sourceType: sourceTypes[_source],
            verifier: msg.sender,
            isVerified: false,
            metadata: _metadata
        });

        sourceDataHistory[_source].push(dataId);
        emit DataSubmitted(dataId, _source, _value, msg.sender);
        
        return dataId;
    }

    /**
     * @dev Verify submitted data
     */
    function verifyData(bytes32 _dataId, bool _verified) 
        external onlyRole(ORACLE_OPERATOR_ROLE) {
        require(dataPoints[_dataId].timestamp > 0, "Data point does not exist");
        
        dataPoints[_dataId].isVerified = _verified;
        dataPoints[_dataId].verifier = msg.sender;
        
        emit DataVerified(_dataId, _verified, msg.sender);
    }

    /**
     * @dev Get verified data for a specific source and time range
     */
    function getVerifiedData(
        string memory _source, 
        uint256 _fromTimestamp, 
        uint256 _toTimestamp
    ) external view returns (bytes32[] memory validDataIds, uint256[] memory values) {
        bytes32[] memory sourceData = sourceDataHistory[_source];
        uint256 validCount = 0;

        // Count valid data points first
        for (uint256 i = 0; i < sourceData.length; i++) {
            DataPoint memory dp = dataPoints[sourceData[i]];
            if (dp.isVerified && dp.timestamp >= _fromTimestamp && dp.timestamp <= _toTimestamp) {
                validCount++;
            }
        }

        // Create arrays with exact size
        validDataIds = new bytes32[](validCount);
        values = new uint256[](validCount);
        uint256 index = 0;

        // Fill arrays with valid data
        for (uint256 i = 0; i < sourceData.length; i++) {
            DataPoint memory dp = dataPoints[sourceData[i]];
            if (dp.isVerified && dp.timestamp >= _fromTimestamp && dp.timestamp <= _toTimestamp) {
                validDataIds[index] = sourceData[i];
                values[index] = dp.value;
                index++;
            }
        }

        return (validDataIds, values);
    }

    /**
     * @dev Calculate aggregate value from verified data
     */
    function getAggregateValue(
        string memory _source,
        uint256 _fromTimestamp,
        uint256 _toTimestamp
    ) external view returns (uint256 totalValue, uint256 dataPointCount) {
        (bytes32[] memory validDataIds, uint256[] memory values) = this.getVerifiedData(_source, _fromTimestamp, _toTimestamp);
        
        totalValue = 0;
        for (uint256 i = 0; i < values.length; i++) {
            totalValue += values[i];
        }
        
        dataPointCount = validDataIds.length;
        return (totalValue, dataPointCount);
    }

    /**
     * @dev Update verification threshold for a source type
     */
    function updateVerificationThreshold(DataSourceType _sourceType, uint256 _newThreshold) 
        external onlyRole(ORACLE_OPERATOR_ROLE) {
        require(_newThreshold <= 100, "Threshold cannot exceed 100");
        verificationThresholds[_sourceType] = _newThreshold;
        emit VerificationThresholdUpdated(_sourceType, _newThreshold);
    }

    /**
     * @dev Update source reliability score
     */
    function updateSourceReliability(string memory _source, uint256 _newScore) 
        external onlyRole(ORACLE_OPERATOR_ROLE) onlyTrustedSource(_source) {
        require(_newScore <= 100, "Score cannot exceed 100");
        sourceReliabilityScore[_source] = _newScore;
    }

    /**
     * @dev Get data point details
     */
    function getDataPoint(bytes32 _dataId) external view returns (
        uint256 value,
        uint256 timestamp,
        string memory source,
        DataSourceType sourceType,
        address verifier,
        bool isVerified,
        string memory metadata
    ) {
        DataPoint memory dp = dataPoints[_dataId];
        return (
            dp.value,
            dp.timestamp,
            dp.source,
            dp.sourceType,
            dp.verifier,
            dp.isVerified,
            dp.metadata
        );
    }

    /**
     * @dev Check if a data source is trusted
     */
    function isSourceTrusted(string memory _source) external view returns (bool) {
        return trustedSources[_source];
    }

    /**
     * @dev Get source reliability score
     */
    function getSourceReliability(string memory _source) external view returns (uint256) {
        return sourceReliabilityScore[_source];
    }

    /**
     * @dev Pause the oracle (emergency only)
     */
    function pause() external onlyRole(ORACLE_OPERATOR_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the oracle
     */
    function unpause() external onlyRole(ORACLE_OPERATOR_ROLE) {
        _unpause();
    }
}
