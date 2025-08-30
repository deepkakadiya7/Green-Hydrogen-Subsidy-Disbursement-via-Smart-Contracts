const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenHydrogenSubsidy", function () {
  let subsidyContract;
  let dataOracle;
  let government, auditor, oracle, producer, other;

  beforeEach(async function () {
    [government, auditor, oracle, producer, other] = await ethers.getSigners();

    // Deploy DataOracle
    const DataOracle = await ethers.getContractFactory("DataOracle");
    dataOracle = await DataOracle.connect(government).deploy();
    await dataOracle.deployed();

    // Deploy GreenHydrogenSubsidy
    const GreenHydrogenSubsidy = await ethers.getContractFactory("GreenHydrogenSubsidy");
    subsidyContract = await GreenHydrogenSubsidy.connect(government).deploy();
    await subsidyContract.deployed();

    // Setup roles
    await subsidyContract.grantRole(await subsidyContract.GOVERNMENT_ROLE(), government.address);
    await subsidyContract.grantRole(await subsidyContract.AUDITOR_ROLE(), auditor.address);
    await subsidyContract.grantRole(await subsidyContract.ORACLE_ROLE(), oracle.address);

    // Add funds to the contract
    await subsidyContract.connect(government).addFunds({ value: ethers.utils.parseEther("10") });
  });

  describe("Contract Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      expect(await subsidyContract.nextProjectId()).to.equal(1);
      expect(await subsidyContract.nextMilestoneId()).to.equal(1);
      expect(await subsidyContract.totalSubsidyPool()).to.equal(ethers.utils.parseEther("10"));
      expect(await subsidyContract.totalDisbursed()).to.equal(0);
    });

    it("Should grant correct roles to deployer", async function () {
      const adminRole = await subsidyContract.DEFAULT_ADMIN_ROLE();
      const govRole = await subsidyContract.GOVERNMENT_ROLE();
      
      expect(await subsidyContract.hasRole(adminRole, government.address)).to.be.true;
      expect(await subsidyContract.hasRole(govRole, government.address)).to.be.true;
    });
  });

  describe("Project Registration", function () {
    it("Should register a new project successfully", async function () {
      const tx = await subsidyContract.connect(government).registerProject(
        producer.address,
        "Green H2 Plant Alpha",
        "Large scale green hydrogen production facility",
        ethers.utils.parseEther("5")
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ProjectRegistered");
      
      expect(event.args.projectId).to.equal(1);
      expect(event.args.producer).to.equal(producer.address);
      expect(event.args.name).to.equal("Green H2 Plant Alpha");
      expect(event.args.totalSubsidy).to.equal(ethers.utils.parseEther("5"));

      // Check producer role was granted
      expect(await subsidyContract.hasRole(await subsidyContract.PRODUCER_ROLE(), producer.address)).to.be.true;
    });

    it("Should fail to register project with invalid parameters", async function () {
      await expect(
        subsidyContract.connect(government).registerProject(
          ethers.constants.AddressZero,
          "Test Project",
          "Description",
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("Invalid producer address");

      await expect(
        subsidyContract.connect(government).registerProject(
          producer.address,
          "",
          "Description",
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("Project name cannot be empty");

      await expect(
        subsidyContract.connect(government).registerProject(
          producer.address,
          "Test Project",
          "Description",
          0
        )
      ).to.be.revertedWith("Subsidy amount must be greater than 0");
    });

    it("Should fail to register project exceeding subsidy pool", async function () {
      await expect(
        subsidyContract.connect(government).registerProject(
          producer.address,
          "Expensive Project",
          "Description",
          ethers.utils.parseEther("15") // More than available 10 ETH
        )
      ).to.be.revertedWith("Insufficient subsidy pool");
    });

    it("Should reject registration from non-government address", async function () {
      await expect(
        subsidyContract.connect(other).registerProject(
          producer.address,
          "Unauthorized Project",
          "Description",
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("Only government can perform this action");
    });
  });

  describe("Milestone Management", function () {
    beforeEach(async function () {
      // Register a project first
      await subsidyContract.connect(government).registerProject(
        producer.address,
        "Test Project",
        "Test Description",
        ethers.utils.parseEther("5")
      );
    });

    it("Should add milestone successfully", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
      
      const tx = await subsidyContract.connect(government).addMilestone(
        1, // projectId
        "Produce 1000kg of green hydrogen",
        ethers.utils.parseEther("1"),
        1000, // target value in kg
        "hydrogen-meter-001",
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "MilestoneAdded");
      
      expect(event.args.projectId).to.equal(1);
      expect(event.args.milestoneId).to.equal(1);
      expect(event.args.description).to.equal("Produce 1000kg of green hydrogen");
      expect(event.args.subsidyAmount).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should activate project when first milestone is added", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      
      await subsidyContract.connect(government).addMilestone(
        1,
        "First milestone",
        ethers.utils.parseEther("1"),
        1000,
        "hydrogen-meter-001",
        deadline
      );

      const project = await subsidyContract.getProject(1);
      expect(project.status).to.equal(1); // Active status
    });

    it("Should fail to add milestone with invalid parameters", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        subsidyContract.connect(government).addMilestone(
          999, // non-existent project
          "Test milestone",
          ethers.utils.parseEther("1"),
          1000,
          "hydrogen-meter-001",
          deadline
        )
      ).to.be.revertedWith("Project does not exist");

      await expect(
        subsidyContract.connect(government).addMilestone(
          1,
          "", // empty description
          ethers.utils.parseEther("1"),
          1000,
          "hydrogen-meter-001",
          deadline
        )
      ).to.be.revertedWith("Description cannot be empty");
    });
  });

  describe("Milestone Verification and Payment", function () {
    beforeEach(async function () {
      // Register project and add milestone
      await subsidyContract.connect(government).registerProject(
        producer.address,
        "Test Project",
        "Test Description",
        ethers.utils.parseEther("5")
      );

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await subsidyContract.connect(government).addMilestone(
        1,
        "Produce 1000kg of green hydrogen",
        ethers.utils.parseEther("2"),
        1000,
        "hydrogen-meter-001",
        deadline
      );
    });

    it("Should verify and pay milestone successfully", async function () {
      const initialBalance = await producer.getBalance();
      
      await subsidyContract.connect(oracle).verifyMilestone(1, 1500, true); // Produced 1500kg (exceeds target)

      const milestone = await subsidyContract.getMilestone(1);
      expect(milestone.status).to.equal(1); // Verified
      expect(milestone.paid).to.be.true;
      expect(milestone.actualValue).to.equal(1500);

      const finalBalance = await producer.getBalance();
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("2"));
    });

    it("Should fail verification if target not met", async function () {
      await subsidyContract.connect(oracle).verifyMilestone(1, 500, false); // Only 500kg produced

      const milestone = await subsidyContract.getMilestone(1);
      expect(milestone.status).to.equal(2); // Failed
      expect(milestone.paid).to.be.false;
    });

    it("Should handle milestone disputes", async function () {
      // Verify milestone
      await subsidyContract.connect(oracle).verifyMilestone(1, 1500, true);

      // Producer disputes (for some reason)
      await subsidyContract.connect(producer).disputeMilestone(1);
      
      let milestone = await subsidyContract.getMilestone(1);
      expect(milestone.status).to.equal(3); // Disputed

      // Auditor resolves dispute in favor
      await subsidyContract.connect(auditor).resolveDispute(1, true);
      
      milestone = await subsidyContract.getMilestone(1);
      expect(milestone.status).to.equal(1); // Verified
    });

    it("Should prevent unauthorized verification", async function () {
      await expect(
        subsidyContract.connect(other).verifyMilestone(1, 1000, true)
      ).to.be.revertedWith("Unauthorized verifier");
    });
  });

  describe("Project Status Management", function () {
    beforeEach(async function () {
      await subsidyContract.connect(government).registerProject(
        producer.address,
        "Test Project",
        "Test Description",
        ethers.utils.parseEther("3")
      );
    });

    it("Should update project status", async function () {
      await subsidyContract.connect(government).updateProjectStatus(1, 3); // Suspended

      const project = await subsidyContract.getProject(1);
      expect(project.status).to.equal(3);
    });

    it("Should prevent unauthorized status updates", async function () {
      await expect(
        subsidyContract.connect(other).updateProjectStatus(1, 3)
      ).to.be.revertedWith("Only government can perform this action");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency withdrawal by government", async function () {
      const initialBalance = await government.getBalance();
      const withdrawAmount = ethers.utils.parseEther("1");

      await subsidyContract.connect(government).emergencyWithdraw(withdrawAmount, government.address);

      const finalBalance = await government.getBalance();
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should pause and unpause contract", async function () {
      await subsidyContract.connect(government).pause();
      
      await expect(
        subsidyContract.connect(government).registerProject(
          producer.address,
          "Test",
          "Test",
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("Pausable: paused");

      await subsidyContract.connect(government).unpause();
      
      // Should work after unpause
      await expect(
        subsidyContract.connect(government).registerProject(
          producer.address,
          "Test",
          "Test",
          ethers.utils.parseEther("1")
        )
      ).to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await subsidyContract.connect(government).registerProject(
        producer.address,
        "Test Project",
        "Test Description",
        ethers.utils.parseEther("3")
      );

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await subsidyContract.connect(government).addMilestone(
        1,
        "Test Milestone",
        ethers.utils.parseEther("1"),
        1000,
        "test-source",
        deadline
      );
    });

    it("Should retrieve project details correctly", async function () {
      const project = await subsidyContract.getProject(1);
      
      expect(project.id).to.equal(1);
      expect(project.producer).to.equal(producer.address);
      expect(project.name).to.equal("Test Project");
      expect(project.totalSubsidyAmount).to.equal(ethers.utils.parseEther("3"));
      expect(project.status).to.equal(1); // Active
    });

    it("Should retrieve milestone details correctly", async function () {
      const milestone = await subsidyContract.getMilestone(1);
      
      expect(milestone.id).to.equal(1);
      expect(milestone.projectId).to.equal(1);
      expect(milestone.description).to.equal("Test Milestone");
      expect(milestone.subsidyAmount).to.equal(ethers.utils.parseEther("1"));
      expect(milestone.targetValue).to.equal(1000);
      expect(milestone.status).to.equal(0); // Pending
    });

    it("Should retrieve producer projects", async function () {
      const projects = await subsidyContract.getProducerProjects(producer.address);
      expect(projects.length).to.equal(1);
      expect(projects[0]).to.equal(1);
    });

    it("Should retrieve project milestones", async function () {
      const milestones = await subsidyContract.getProjectMilestones(1);
      expect(milestones.length).to.equal(1);
      expect(milestones[0]).to.equal(1);
    });

    it("Should show correct contract balance and available subsidy", async function () {
      const balance = await subsidyContract.getContractBalance();
      const available = await subsidyContract.getAvailableSubsidy();
      
      expect(balance).to.equal(ethers.utils.parseEther("10"));
      expect(available).to.equal(ethers.utils.parseEther("10"));
    });
  });
});
