// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title GreenHydrogenSubsidy
 * @dev Smart contract for automated green hydrogen subsidy disbursement
 * Manages project registration, milestone verification, and automated payments
 */
contract GreenHydrogenSubsidy is ReentrancyGuard, AccessControl, Pausable {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");

    // Project status enum
    enum ProjectStatus { Pending, Active, Completed, Suspended, Cancelled }

    // Milestone status enum
    enum MilestoneStatus { Pending, Verified, Failed, Disputed }

    // Project structure
    struct Project {
        uint256 id;
        address producer;
        string name;
        string description;
        uint256 totalSubsidyAmount;
        uint256 disbursedAmount;
        uint256 createdAt;
        ProjectStatus status;
        uint256[] milestoneIds;
        mapping(uint256 => bool) milestoneExists;
    }

    // Milestone structure
    struct Milestone {
        uint256 id;
        uint256 projectId;
        string description;
        uint256 subsidyAmount;
        uint256 targetValue; // e.g., kg of hydrogen to be produced
        uint256 actualValue; // verified actual production
        string verificationSource;
        uint256 deadline;
        MilestoneStatus status;
        uint256 verifiedAt;
        address verifiedBy;
        bool paid;
    }

    // State variables
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone) public milestones;
    mapping(address => uint256[]) public producerProjects;
    
    uint256 public nextProjectId = 1;
    uint256 public nextMilestoneId = 1;
    uint256 public totalSubsidyPool;
    uint256 public totalDisbursed;

    // Events
    event ProjectRegistered(uint256 indexed projectId, address indexed producer, string name, uint256 totalSubsidy);
    event MilestoneAdded(uint256 indexed projectId, uint256 indexed milestoneId, string description, uint256 subsidyAmount);
    event MilestoneVerified(uint256 indexed milestoneId, uint256 actualValue, address indexed verifier);
    event SubsidyDisbursed(uint256 indexed projectId, uint256 indexed milestoneId, address indexed recipient, uint256 amount);
    event ProjectStatusChanged(uint256 indexed projectId, ProjectStatus oldStatus, ProjectStatus newStatus);
    event FundsAdded(uint256 amount, uint256 newTotal);
    event FundsWithdrawn(uint256 amount, address indexed recipient);

    modifier onlyGovernment() {
        require(hasRole(GOVERNMENT_ROLE, msg.sender), "Only government can perform this action");
        _;
    }

    modifier onlyAuditor() {
        require(hasRole(AUDITOR_ROLE, msg.sender), "Only auditor can perform this action");
        _;
    }

    modifier onlyOracle() {
        require(hasRole(ORACLE_ROLE, msg.sender), "Only oracle can perform this action");
        _;
    }

    modifier projectExists(uint256 _projectId) {
        require(_projectId > 0 && _projectId < nextProjectId, "Project does not exist");
        _;
    }

    modifier milestoneExists(uint256 _milestoneId) {
        require(_milestoneId > 0 && _milestoneId < nextMilestoneId, "Milestone does not exist");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNMENT_ROLE, msg.sender);
    }

    /**
     * @dev Add funds to the subsidy pool
     */
    function addFunds() external payable onlyGovernment {
        require(msg.value > 0, "Amount must be greater than 0");
        totalSubsidyPool = totalSubsidyPool.add(msg.value);
        emit FundsAdded(msg.value, totalSubsidyPool);
    }

    /**
     * @dev Register a new green hydrogen project
     */
    function registerProject(
        address _producer,
        string memory _name,
        string memory _description,
        uint256 _totalSubsidyAmount
    ) external onlyGovernment returns (uint256) {
        require(_producer != address(0), "Invalid producer address");
        require(bytes(_name).length > 0, "Project name cannot be empty");
        require(_totalSubsidyAmount > 0, "Subsidy amount must be greater than 0");
        require(_totalSubsidyAmount <= totalSubsidyPool.sub(totalDisbursed), "Insufficient subsidy pool");

        uint256 projectId = nextProjectId++;
        Project storage project = projects[projectId];
        
        project.id = projectId;
        project.producer = _producer;
        project.name = _name;
        project.description = _description;
        project.totalSubsidyAmount = _totalSubsidyAmount;
        project.disbursedAmount = 0;
        project.createdAt = block.timestamp;
        project.status = ProjectStatus.Pending;

        producerProjects[_producer].push(projectId);
        
        // Grant producer role to the producer address
        grantRole(PRODUCER_ROLE, _producer);

        emit ProjectRegistered(projectId, _producer, _name, _totalSubsidyAmount);
        return projectId;
    }

    /**
     * @dev Add a milestone to a project
     */
    function addMilestone(
        uint256 _projectId,
        string memory _description,
        uint256 _subsidyAmount,
        uint256 _targetValue,
        string memory _verificationSource,
        uint256 _deadline
    ) external onlyGovernment projectExists(_projectId) returns (uint256) {
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_subsidyAmount > 0, "Subsidy amount must be greater than 0");
        require(_targetValue > 0, "Target value must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Pending || project.status == ProjectStatus.Active, "Project not active");
        require(project.disbursedAmount.add(_subsidyAmount) <= project.totalSubsidyAmount, "Exceeds project subsidy limit");

        uint256 milestoneId = nextMilestoneId++;
        
        milestones[milestoneId] = Milestone({
            id: milestoneId,
            projectId: _projectId,
            description: _description,
            subsidyAmount: _subsidyAmount,
            targetValue: _targetValue,
            actualValue: 0,
            verificationSource: _verificationSource,
            deadline: _deadline,
            status: MilestoneStatus.Pending,
            verifiedAt: 0,
            verifiedBy: address(0),
            paid: false
        });

        project.milestoneIds.push(milestoneId);
        project.milestoneExists[milestoneId] = true;

        // Activate project if it's pending and has milestones
        if (project.status == ProjectStatus.Pending) {
            project.status = ProjectStatus.Active;
            emit ProjectStatusChanged(_projectId, ProjectStatus.Pending, ProjectStatus.Active);
        }

        emit MilestoneAdded(_projectId, milestoneId, _description, _subsidyAmount);
        return milestoneId;
    }

    /**
     * @dev Verify a milestone achievement (called by oracle or auditor)
     */
    function verifyMilestone(
        uint256 _milestoneId,
        uint256 _actualValue,
        bool _success
    ) external milestoneExists(_milestoneId) {
        require(hasRole(ORACLE_ROLE, msg.sender) || hasRole(AUDITOR_ROLE, msg.sender), "Unauthorized verifier");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.Pending, "Milestone already processed");
        require(block.timestamp <= milestone.deadline, "Milestone deadline passed");

        milestone.actualValue = _actualValue;
        milestone.verifiedAt = block.timestamp;
        milestone.verifiedBy = msg.sender;

        if (_success && _actualValue >= milestone.targetValue) {
            milestone.status = MilestoneStatus.Verified;
            _processMilestonePayment(_milestoneId);
        } else {
            milestone.status = MilestoneStatus.Failed;
        }

        emit MilestoneVerified(_milestoneId, _actualValue, msg.sender);
    }

    /**
     * @dev Internal function to process milestone payment
     */
    function _processMilestonePayment(uint256 _milestoneId) internal {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.Verified, "Milestone not verified");
        require(!milestone.paid, "Already paid");

        Project storage project = projects[milestone.projectId];
        require(project.status == ProjectStatus.Active, "Project not active");

        uint256 paymentAmount = milestone.subsidyAmount;
        require(address(this).balance >= paymentAmount, "Insufficient contract balance");

        milestone.paid = true;
        project.disbursedAmount = project.disbursedAmount.add(paymentAmount);
        totalDisbursed = totalDisbursed.add(paymentAmount);

        // Transfer payment to producer
        payable(project.producer).transfer(paymentAmount);

        emit SubsidyDisbursed(milestone.projectId, _milestoneId, project.producer, paymentAmount);

        // Check if project is completed
        _checkProjectCompletion(milestone.projectId);
    }

    /**
     * @dev Check if all milestones are completed and mark project as completed
     */
    function _checkProjectCompletion(uint256 _projectId) internal {
        Project storage project = projects[_projectId];
        bool allMilestonesCompleted = true;

        for (uint256 i = 0; i < project.milestoneIds.length; i++) {
            uint256 milestoneId = project.milestoneIds[i];
            Milestone storage milestone = milestones[milestoneId];
            
            if (milestone.status != MilestoneStatus.Verified || !milestone.paid) {
                allMilestonesCompleted = false;
                break;
            }
        }

        if (allMilestonesCompleted && project.milestoneIds.length > 0) {
            ProjectStatus oldStatus = project.status;
            project.status = ProjectStatus.Completed;
            emit ProjectStatusChanged(_projectId, oldStatus, ProjectStatus.Completed);
        }
    }

    /**
     * @dev Update project status (government only)
     */
    function updateProjectStatus(uint256 _projectId, ProjectStatus _newStatus) 
        external onlyGovernment projectExists(_projectId) {
        Project storage project = projects[_projectId];
        ProjectStatus oldStatus = project.status;
        project.status = _newStatus;
        emit ProjectStatusChanged(_projectId, oldStatus, _newStatus);
    }

    /**
     * @dev Dispute a milestone verification
     */
    function disputeMilestone(uint256 _milestoneId) external milestoneExists(_milestoneId) {
        Milestone storage milestone = milestones[_milestoneId];
        Project storage project = projects[milestone.projectId];
        
        require(msg.sender == project.producer || hasRole(GOVERNMENT_ROLE, msg.sender), "Unauthorized to dispute");
        require(milestone.status == MilestoneStatus.Failed || milestone.status == MilestoneStatus.Verified, "Cannot dispute pending milestone");
        
        milestone.status = MilestoneStatus.Disputed;
    }

    /**
     * @dev Resolve disputed milestone
     */
    function resolveDispute(uint256 _milestoneId, bool _approve) 
        external onlyAuditor milestoneExists(_milestoneId) {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.Disputed, "Milestone not disputed");

        if (_approve) {
            milestone.status = MilestoneStatus.Verified;
            if (!milestone.paid) {
                _processMilestonePayment(_milestoneId);
            }
        } else {
            milestone.status = MilestoneStatus.Failed;
        }
    }

    /**
     * @dev Emergency withdrawal (government only)
     */
    function emergencyWithdraw(uint256 _amount, address _recipient) 
        external onlyGovernment nonReentrant {
        require(_amount <= address(this).balance, "Insufficient balance");
        require(_recipient != address(0), "Invalid recipient");
        
        payable(_recipient).transfer(_amount);
        emit FundsWithdrawn(_amount, _recipient);
    }

    /**
     * @dev Pause contract (government only)
     */
    function pause() external onlyGovernment {
        _pause();
    }

    /**
     * @dev Unpause contract (government only)
     */
    function unpause() external onlyGovernment {
        _unpause();
    }

    // View functions
    function getProject(uint256 _projectId) external view projectExists(_projectId) returns (
        uint256 id,
        address producer,
        string memory name,
        string memory description,
        uint256 totalSubsidyAmount,
        uint256 disbursedAmount,
        uint256 createdAt,
        ProjectStatus status
    ) {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.producer,
            project.name,
            project.description,
            project.totalSubsidyAmount,
            project.disbursedAmount,
            project.createdAt,
            project.status
        );
    }

    function getMilestone(uint256 _milestoneId) external view milestoneExists(_milestoneId) returns (
        uint256 id,
        uint256 projectId,
        string memory description,
        uint256 subsidyAmount,
        uint256 targetValue,
        uint256 actualValue,
        string memory verificationSource,
        uint256 deadline,
        MilestoneStatus status,
        uint256 verifiedAt,
        address verifiedBy,
        bool paid
    ) {
        Milestone storage milestone = milestones[_milestoneId];
        return (
            milestone.id,
            milestone.projectId,
            milestone.description,
            milestone.subsidyAmount,
            milestone.targetValue,
            milestone.actualValue,
            milestone.verificationSource,
            milestone.deadline,
            milestone.status,
            milestone.verifiedAt,
            milestone.verifiedBy,
            milestone.paid
        );
    }

    function getProjectMilestones(uint256 _projectId) external view projectExists(_projectId) returns (uint256[] memory) {
        return projects[_projectId].milestoneIds;
    }

    function getProducerProjects(address _producer) external view returns (uint256[] memory) {
        return producerProjects[_producer];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getAvailableSubsidy() external view returns (uint256) {
        return totalSubsidyPool.sub(totalDisbursed);
    }

    // Receive function to accept Ether
    receive() external payable {
        totalSubsidyPool = totalSubsidyPool.add(msg.value);
        emit FundsAdded(msg.value, totalSubsidyPool);
    }
}
