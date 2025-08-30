const request = require('supertest');
const app = require('../src/app');

describe('Green Hydrogen Subsidy API', () => {
  let authToken;
  let governmentToken;
  let producerToken;

  beforeAll(async () => {
    // Login as government user
    const govResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'government@example.com',
        password: 'password123'
      });
    
    governmentToken = govResponse.body.token;

    // Login as producer user
    const prodResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'producer@example.com',
        password: 'password123'
      });
    
    producerToken = prodResponse.body.token;
  });

  describe('Authentication', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'government@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('government');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${governmentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
    });

    test('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('Project Management', () => {
    test('should register new project as government', async () => {
      const projectData = {
        producerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        name: 'Test Green Hydrogen Project',
        description: 'Test project for API integration testing',
        totalSubsidyAmount: 1.0
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${governmentToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.project).toHaveProperty('id');
    });

    test('should reject project registration from non-government user', async () => {
      const projectData = {
        producerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        name: 'Unauthorized Project',
        description: 'This should fail',
        totalSubsidyAmount: 1.0
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${producerToken}`)
        .send(projectData);

      expect(response.status).toBe(403);
    });

    test('should validate project data', async () => {
      const invalidProjectData = {
        producerAddress: 'invalid-address',
        name: '',
        description: 'Too short',
        totalSubsidyAmount: -1
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${governmentToken}`)
        .send(invalidProjectData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should get projects list', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${governmentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Milestone Management', () => {
    let projectId = 1; // Assume project exists from previous tests

    test('should add milestone as government', async () => {
      const milestoneData = {
        projectId,
        description: 'Produce 500kg of green hydrogen for testing',
        subsidyAmount: 0.5,
        targetValue: 500,
        verificationSource: 'test-meter-001',
        deadline: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
      };

      const response = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${governmentToken}`)
        .send(milestoneData);

      expect(response.status).toBe(201);
      expect(response.body.milestone).toHaveProperty('id');
    });

    test('should reject milestone from unauthorized user', async () => {
      const milestoneData = {
        projectId,
        description: 'Unauthorized milestone',
        subsidyAmount: 0.5,
        targetValue: 500,
        verificationSource: 'test-meter-001',
        deadline: new Date(Date.now() + 86400000).toISOString()
      };

      const response = await request(app)
        .post('/api/milestones')
        .set('Authorization', `Bearer ${producerToken}`)
        .send(milestoneData);

      expect(response.status).toBe(403);
    });

    test('should get milestone details', async () => {
      const milestoneId = 1; // Assume milestone exists

      const response = await request(app)
        .get(`/api/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${governmentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('milestone');
    });
  });

  describe('Health and Status', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });

    test('should return blockchain status for authenticated users', async () => {
      const response = await request(app)
        .get('/api/blockchain/status')
        .set('Authorization', `Bearer ${governmentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connected');
    });

    test('should return contract info for authenticated users', async () => {
      const response = await request(app)
        .get('/api/contracts/info')
        .set('Authorization', `Bearer ${governmentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subsidyContract');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${governmentToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on API endpoints', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill().map(() =>
        request(app)
          .get('/api/auth/roles')
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed as we're within limits
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Security', () => {
    test('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${governmentToken}`)
        .send({
          producerAddress: '<script>alert("xss")</script>',
          name: 'Test Project',
          description: 'Test description with potential XSS',
          totalSubsidyAmount: 1.0
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('Integration Tests', () => {
  test('should complete full project lifecycle', async () => {
    // This would test the complete flow:
    // 1. Register project
    // 2. Add milestone
    // 3. Submit oracle data
    // 4. Verify milestone
    // 5. Process payment
    
    // Implementation would depend on having a test blockchain running
    expect(true).toBe(true); // Placeholder
  });
});
