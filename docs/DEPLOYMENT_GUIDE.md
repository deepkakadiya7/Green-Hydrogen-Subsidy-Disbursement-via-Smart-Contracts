# Deployment Guide

## Green Hydrogen Subsidy Disbursement System

This guide covers the deployment of the complete Green Hydrogen Subsidy system including smart contracts, backend API, and database setup.

---

## Prerequisites

### System Requirements

- **Node.js**: Version 18.x or higher
- **PostgreSQL**: Version 13.x or higher
- **Docker**: Version 20.x or higher (optional but recommended)
- **Git**: Latest version

### Required Accounts/Services

- **Ethereum Node**: Local (Hardhat) or remote (Infura/Alchemy)
- **Database**: PostgreSQL instance
- **Email Service**: SMTP server for notifications
- **Cloud Storage**: For document storage (AWS S3, Azure Blob, etc.)

---

## Environment Setup

### 1. Clone and Setup Project

```bash
git clone <repository-url>
cd green-hydrogen-subsidy-system
npm install
npm run setup
```

### 2. Environment Configuration

Copy the environment template and configure variables:

```bash
cp backend/.env.example backend/.env
```

**Critical Environment Variables:**

```env
# Security (MUST CHANGE IN PRODUCTION)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
ENCRYPTION_SECRET=your-encryption-secret-key-32-chars

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=green_hydrogen_subsidy
DB_USER=api_user
DB_PASSWORD=secure_database_password

# Blockchain
BLOCKCHAIN_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BLOCKCHAIN_PRIVATE_KEY=0x...your-private-key
SUBSIDY_CONTRACT_ADDRESS=0x...deployed-contract-address
ORACLE_CONTRACT_ADDRESS=0x...oracle-contract-address

# External APIs
BANKING_API_KEY=your_banking_integration_key
GOVERNMENT_API_KEY=your_government_data_key
IOT_PLATFORM_API_KEY=your_iot_platform_key
```

---

## Database Setup

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE green_hydrogen_subsidy;

-- Create user
CREATE USER api_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE green_hydrogen_subsidy TO api_user;

-- Switch to the database
\c green_hydrogen_subsidy

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO api_user;
```

### 3. Run Database Schema

```bash
cd database
psql -U api_user -d green_hydrogen_subsidy -f schema.sql
```

---

## Smart Contract Deployment

### 1. Local Development (Hardhat Network)

```bash
cd contracts

# Start local blockchain
npx hardhat node

# In another terminal, deploy contracts
npm run deploy:contracts
```

### 2. Testnet Deployment (Sepolia)

```bash
cd contracts

# Configure environment
export INFURA_PROJECT_ID=your_infura_project_id
export PRIVATE_KEY=your_private_key

# Deploy to testnet
npm run deploy:contracts:testnet
```

### 3. Mainnet Deployment

⚠️ **WARNING**: Only deploy to mainnet after thorough testing and security audits.

```bash
cd contracts

# Set mainnet configuration
export ETHEREUM_NETWORK=mainnet
export INFURA_PROJECT_ID=your_mainnet_project_id
export PRIVATE_KEY=your_mainnet_private_key

# Deploy with extra confirmation
npx hardhat run scripts/deploy.js --network mainnet
```

### 4. Verify Deployed Contracts

```bash
# Verify on Etherscan
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS

# Test contract functions
npx hardhat console --network mainnet
```

---

## Backend Deployment

### 1. Production Dependencies

```bash
cd backend
npm ci --only=production
```

### 2. Database Migrations

```bash
# Run any pending migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 3. Start Backend Services

#### Option A: Direct Node.js

```bash
cd backend
NODE_ENV=production npm start
```

#### Option B: PM2 (Recommended for production)

```bash
npm install -g pm2

cd backend
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

#### Option C: Docker

```bash
# Build image
docker build -t green-hydrogen-backend .

# Run container
docker run -d \
  --name gh-backend \
  -p 5000:5000 \
  --env-file .env \
  green-hydrogen-backend
```

---

## Frontend Deployment (Optional)

### 1. Build Frontend

```bash
cd frontend
npm ci
npm run build
```

### 2. Serve Static Files

#### Option A: Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Option B: Docker

```bash
docker build -t green-hydrogen-frontend .
docker run -d -p 3000:3000 green-hydrogen-frontend
```

---

## Monitoring and Logging

### 1. Log Management

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/green-hydrogen

# Add configuration
/path/to/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 0644 app app
}
```

### 2. Health Checks

```bash
# API health check
curl http://localhost:5000/health

# Blockchain status
curl http://localhost:5000/api/blockchain/status \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Performance Monitoring

Consider integrating with:
- **APM Tools**: New Relic, DataDog, or AppDynamics
- **Log Aggregation**: ELK Stack or Splunk
- **Metrics**: Prometheus + Grafana

---

## Security Hardening

### 1. Server Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Configure firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 5000  # API (restrict in production)

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### 2. Database Security

```sql
-- Limit database access
ALTER DATABASE green_hydrogen_subsidy SET log_connections = on;
ALTER DATABASE green_hydrogen_subsidy SET log_disconnections = on;

-- Create read-only user for reporting
CREATE USER reporter WITH PASSWORD 'reporting_password';
GRANT CONNECT ON DATABASE green_hydrogen_subsidy TO reporter;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporter;
```

### 3. SSL/TLS Configuration

```bash
# Install SSL certificate (Let's Encrypt)
sudo apt install certbot
sudo certbot --nginx -d your-domain.com
```

---

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
cat > /opt/backup/backup_database.sh << EOF
#!/bin/bash
BACKUP_DIR="/opt/backup/database"
DB_NAME="green_hydrogen_subsidy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump -U api_user $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup/backup_database.sh

# Setup cron job
crontab -e
# Add: 0 2 * * * /opt/backup/backup_database.sh
```

### 2. Smart Contract Backup

```bash
# Backup contract artifacts and deployment info
cp -r contracts/artifacts /opt/backup/contracts/
cp contracts/deployments.json /opt/backup/contracts/
```

---

## Scaling Considerations

### 1. Load Balancing

```nginx
upstream backend_servers {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    location /api {
        proxy_pass http://backend_servers;
    }
}
```

### 2. Database Scaling

- **Read Replicas**: For read-heavy workloads
- **Connection Pooling**: Use pgBouncer
- **Partitioning**: Partition audit_logs by date

### 3. Caching

```bash
# Install Redis for caching
sudo apt install redis-server

# Configure Redis in environment
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=3600
```

---

## Monitoring Setup

### 1. Application Monitoring

```javascript
// Add to backend monitoring
const monitoring = require('./monitoring');

app.use(monitoring.middleware);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    database: await checkDatabaseHealth(),
    blockchain: await checkBlockchainHealth(),
    timestamp: new Date().toISOString()
  };
  res.json(health);
});
```

### 2. Alert Configuration

```bash
# Setup alerts for critical events
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text": "🚨 Green Hydrogen System Alert: [ALERT_MESSAGE]"}'
```

---

## Troubleshooting

### Common Issues

1. **Smart Contract Deployment Fails**
   ```bash
   # Check network configuration
   npx hardhat console --network localhost
   
   # Verify private key and balance
   await ethers.provider.getBalance("YOUR_ADDRESS")
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   psql -U api_user -h localhost -d green_hydrogen_subsidy
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **API Authentication Errors**
   ```bash
   # Check JWT secret configuration
   node -e "console.log(require('jsonwebtoken').verify('TOKEN', 'SECRET'))"
   ```

### Log Locations

- **Application Logs**: `backend/logs/`
- **Database Logs**: `/var/log/postgresql/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `/var/log/syslog`

---

## Production Checklist

### Pre-deployment

- [ ] Security audit completed
- [ ] Smart contracts tested on testnet
- [ ] Database schema validated
- [ ] API endpoints tested
- [ ] Integration tests passed
- [ ] Performance tests completed
- [ ] Backup procedures tested

### Deployment

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database created and migrated
- [ ] Smart contracts deployed and verified
- [ ] Backend services started
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Alerts set up

### Post-deployment

- [ ] Integration tests on production
- [ ] Performance monitoring active
- [ ] Backup schedule confirmed
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] Incident response plan ready

---

## Support and Maintenance

### Regular Maintenance Tasks

- **Daily**: Check system health and logs
- **Weekly**: Review performance metrics and alerts
- **Monthly**: Security patches and dependency updates
- **Quarterly**: Security audit and penetration testing

### Emergency Contacts

- **Development Team**: dev-team@greenhydrogen.gov
- **Infrastructure Team**: infra@greenhydrogen.gov
- **Security Team**: security@greenhydrogen.gov

### Documentation Updates

Keep this documentation updated as the system evolves. Update version numbers, API changes, and operational procedures.
