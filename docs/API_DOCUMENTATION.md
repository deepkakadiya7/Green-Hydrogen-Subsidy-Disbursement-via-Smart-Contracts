# API Documentation

## Green Hydrogen Subsidy Disbursement System API

### Overview

The Green Hydrogen Subsidy API provides endpoints for managing green hydrogen projects, milestones, and automated subsidy disbursements through smart contracts.

**Base URL**: `http://localhost:5000/api`

### Authentication

All API endpoints (except authentication) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### User Roles

- **government**: Government administrators who manage projects and subsidies
- **producer**: Green hydrogen producers who receive subsidies
- **auditor**: Independent auditors who verify milestones and resolve disputes
- **oracle**: Data oracle services that provide external verification

---

## Authentication Endpoints

### POST /auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "government",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }
}
```

### GET /auth/profile

Get current user profile information.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "role": "government",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

---

## Project Management

### POST /projects

Register a new green hydrogen project.

**Access**: Government only

**Request Body:**
```json
{
  "producerAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "name": "Green H2 Plant Alpha",
  "description": "Large scale green hydrogen production facility using renewable energy",
  "totalSubsidyAmount": 5.0
}
```

**Response:**
```json
{
  "message": "Project registered successfully",
  "project": {
    "id": 1,
    "transactionHash": "0x...",
    "blockNumber": 12345
  }
}
```

### GET /projects

Get projects (filtered by user role).

**Query Parameters:**
- `producer` (optional): Filter by producer address
- `status` (optional): Filter by project status
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "producer": "0xabcd...",
      "name": "Green H2 Plant Alpha",
      "description": "Large scale production facility",
      "totalSubsidyAmount": "5.0",
      "disbursedAmount": "2.0",
      "createdAt": "2024-01-15T10:30:00Z",
      "status": "Active"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /projects/:id

Get specific project by ID.

**Response:**
```json
{
  "project": {
    "id": 1,
    "producer": "0xabcd...",
    "name": "Green H2 Plant Alpha",
    "description": "Large scale production facility",
    "totalSubsidyAmount": "5.0",
    "disbursedAmount": "2.0",
    "createdAt": "2024-01-15T10:30:00Z",
    "status": "Active",
    "milestones": [
      {
        "id": 1,
        "description": "Produce 1000kg of green hydrogen",
        "targetValue": 1000,
        "actualValue": 1200,
        "status": "Verified",
        "subsidyAmount": "2.0"
      }
    ]
  }
}
```

---

## Milestone Management

### POST /milestones

Add a new milestone to a project.

**Access**: Government only

**Request Body:**
```json
{
  "projectId": 1,
  "description": "Produce 1000kg of green hydrogen using renewable energy",
  "subsidyAmount": 2.0,
  "targetValue": 1000,
  "verificationSource": "hydrogen-meter-001",
  "deadline": "2024-06-15T23:59:59Z"
}
```

**Response:**
```json
{
  "message": "Milestone added successfully",
  "milestone": {
    "id": 1,
    "projectId": 1,
    "transactionHash": "0x...",
    "blockNumber": 12346
  }
}
```

### POST /milestones/:id/verify

Verify a milestone completion.

**Access**: Oracle, Auditor only

**Request Body:**
```json
{
  "actualValue": 1200,
  "success": true,
  "verificationNotes": "Production target exceeded by 20%"
}
```

**Response:**
```json
{
  "message": "Milestone verified successfully",
  "milestone": {
    "id": 1,
    "actualValue": 1200,
    "success": true,
    "transactionHash": "0x...",
    "blockNumber": 12347
  },
  "events": [
    {
      "event": "MilestoneVerified",
      "args": {...}
    },
    {
      "event": "SubsidyDisbursed",
      "args": {...}
    }
  ]
}
```

### POST /milestones/:id/dispute

Dispute a milestone verification.

**Access**: Producer (own projects), Government

**Request Body:**
```json
{
  "reason": "The verification data appears to be incorrect. Our internal measurements show different values."
}
```

### GET /milestones/pending

Get pending milestones ready for verification.

**Access**: Oracle, Auditor only

**Response:**
```json
{
  "milestones": [
    {
      "id": 2,
      "projectId": 1,
      "description": "Second phase production milestone",
      "targetValue": 2000,
      "deadline": "2024-07-15T23:59:59Z",
      "verificationSource": "hydrogen-meter-001"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Oracle Data Management

### POST /oracle/data

Submit production data from external sources.

**Access**: Oracle only

**Request Body:**
```json
{
  "source": "hydrogen-meter-001",
  "value": 150,
  "metadata": "Daily production measurement from certified IoT device"
}
```

**Response:**
```json
{
  "message": "Data submitted successfully",
  "data": {
    "dataId": "0x...",
    "source": "hydrogen-meter-001",
    "value": 150,
    "transactionHash": "0x..."
  }
}
```

### GET /oracle/data/:source

Get verified data for a specific source within a time range.

**Query Parameters:**
- `fromDate`: Start date (ISO 8601)
- `toDate`: End date (ISO 8601)

**Response:**
```json
{
  "source": "hydrogen-meter-001",
  "period": {
    "fromDate": "2024-01-01T00:00:00Z",
    "toDate": "2024-01-31T23:59:59Z"
  },
  "data": {
    "dataIds": ["0x...", "0x..."],
    "values": [150, 165, 140, 180]
  }
}
```

---

## Integration Endpoints

### POST /integration/banking/transfer

Trigger payment to legacy banking system.

**Access**: Government only

**Request Body:**
```json
{
  "accountNumber": "1234567890",
  "amount": 50000.00,
  "reference": "Subsidy payment for milestone completion"
}
```

---

## Audit and Monitoring

### GET /audit/logs

Retrieve audit logs for compliance and monitoring.

**Access**: Government, Auditor only

**Query Parameters:**
- `action` (optional): Filter by action type
- `userId` (optional): Filter by user ID
- `fromDate` (optional): Start date filter
- `toDate` (optional): End date filter
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "PROJECT_REGISTERED",
      "userId": 1,
      "resourceType": "project",
      "resourceId": "1",
      "timestamp": "2024-01-15T10:30:00Z",
      "metadata": {...}
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### GET /blockchain/status

Get blockchain connection and contract status.

**Response:**
```json
{
  "connected": true,
  "network": "localhost",
  "chainId": 1337,
  "blockNumber": 12350,
  "signerAddress": "0x...",
  "signerBalance": "10.5"
}
```

### GET /contracts/info

Get smart contract information and statistics.

**Response:**
```json
{
  "subsidyContract": "0x...",
  "oracleContract": "0x...",
  "contractBalance": "8.5",
  "availableSubsidy": "6.5",
  "totalDisbursed": "2.0"
}
```

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "details": "Additional error details (development only)"
}
```

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- General API requests: 100 requests per 15 minutes per IP
- Sensitive operations: 10 requests per hour per IP
- Authentication attempts: 5 attempts per hour per IP

---

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## Webhook Integration

For real-time updates, the system supports webhooks for:
- Project status changes
- Milestone verifications
- Payment completions
- Dispute resolutions

Configure webhook URLs in your environment variables or through the admin interface.

---

## Testing

Use the provided Postman collection or test with curl:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"government@example.com","password":"password123"}'

# Get projects (with token)
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer <your_token>"
```

---

## Support

For API support and integration assistance, contact the development team or refer to the system documentation.
