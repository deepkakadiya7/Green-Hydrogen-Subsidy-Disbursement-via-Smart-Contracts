-- Green Hydrogen Subsidy System Database Schema
-- PostgreSQL Database

-- Create database (run as admin)
-- CREATE DATABASE green_hydrogen_subsidy;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User roles enum
CREATE TYPE user_role AS ENUM ('government', 'producer', 'auditor', 'oracle');

-- Project status enum (mirrors smart contract)
CREATE TYPE project_status AS ENUM ('pending', 'active', 'completed', 'suspended', 'cancelled');

-- Milestone status enum (mirrors smart contract)
CREATE TYPE milestone_status AS ENUM ('pending', 'verified', 'failed', 'disputed');

-- Data source types for oracle
CREATE TYPE data_source_type AS ENUM ('iot_device', 'government_db', 'third_party_verifier', 'manual');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Security fields
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    
    -- Audit fields
    version INTEGER DEFAULT 1
);

-- Projects table (off-chain data complementing blockchain)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY, -- Matches blockchain project ID
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    producer_id INTEGER REFERENCES users(id),
    producer_address VARCHAR(42) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_subsidy_amount DECIMAL(20, 8) NOT NULL,
    disbursed_amount DECIMAL(20, 8) DEFAULT 0,
    status project_status NOT NULL DEFAULT 'pending',
    
    -- Blockchain references
    creation_tx_hash VARCHAR(66),
    creation_block_number INTEGER,
    contract_address VARCHAR(42),
    
    -- Additional metadata
    location VARCHAR(255),
    technology_type VARCHAR(100),
    expected_completion DATE,
    environmental_impact_data JSONB,
    compliance_certificates JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    
    -- Audit
    version INTEGER DEFAULT 1
);

-- Milestones table (off-chain data complementing blockchain)
CREATE TABLE milestones (
    id INTEGER PRIMARY KEY, -- Matches blockchain milestone ID
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id),
    description TEXT NOT NULL,
    subsidy_amount DECIMAL(20, 8) NOT NULL,
    target_value INTEGER NOT NULL,
    actual_value INTEGER DEFAULT 0,
    verification_source VARCHAR(255) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status milestone_status NOT NULL DEFAULT 'pending',
    
    -- Verification data
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    verified_by INTEGER REFERENCES users(id),
    verification_notes TEXT,
    verification_data JSONB,
    
    -- Blockchain references
    creation_tx_hash VARCHAR(66),
    verification_tx_hash VARCHAR(66),
    payment_tx_hash VARCHAR(66),
    block_number INTEGER,
    
    -- Additional metadata
    measurement_unit VARCHAR(50) DEFAULT 'kg',
    quality_requirements JSONB,
    documentation_required JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    
    -- Audit
    version INTEGER DEFAULT 1
);

-- Oracle data points table
CREATE TABLE oracle_data (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    data_id VARCHAR(66) UNIQUE NOT NULL, -- Blockchain data ID
    source VARCHAR(255) NOT NULL,
    source_type data_source_type NOT NULL,
    value BIGINT NOT NULL,
    metadata JSONB,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    verified_by INTEGER REFERENCES users(id),
    reliability_score INTEGER DEFAULT 0,
    
    -- Blockchain references
    submission_tx_hash VARCHAR(66),
    verification_tx_hash VARCHAR(66),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Audit
    version INTEGER DEFAULT 1
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    resource_type VARCHAR(50), -- 'project', 'milestone', 'user', etc.
    resource_id VARCHAR(50),
    
    -- Details
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Blockchain context
    transaction_hash VARCHAR(66),
    block_number INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Security
    checksum VARCHAR(64) -- For log integrity verification
);

-- Payment transactions table (for legacy integration tracking)
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    milestone_id INTEGER REFERENCES milestones(id),
    project_id INTEGER REFERENCES projects(id),
    
    -- Payment details
    amount DECIMAL(20, 8) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'blockchain', 'bank_transfer', 'check'
    
    -- Legacy system references
    bank_reference VARCHAR(255),
    bank_transaction_id VARCHAR(255),
    swift_code VARCHAR(11),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Blockchain references
    blockchain_tx_hash VARCHAR(66),
    blockchain_block_number INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit
    version INTEGER DEFAULT 1
);

-- Dispute cases table
CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    milestone_id INTEGER REFERENCES milestones(id) NOT NULL,
    project_id INTEGER REFERENCES projects(id) NOT NULL,
    
    -- Dispute details
    reason TEXT NOT NULL,
    submitted_by INTEGER REFERENCES users(id) NOT NULL,
    assigned_to INTEGER REFERENCES users(id), -- Auditor assigned
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    resolved_by INTEGER REFERENCES users(id),
    
    -- Evidence
    evidence_documents JSONB,
    supporting_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit
    version INTEGER DEFAULT 1
);

-- System configuration table
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_projects_producer_id ON projects(producer_id);
CREATE INDEX idx_projects_producer_address ON projects(producer_address);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_deadline ON milestones(deadline);
CREATE INDEX idx_milestones_verification_source ON milestones(verification_source);

CREATE INDEX idx_oracle_data_source ON oracle_data(source);
CREATE INDEX idx_oracle_data_data_timestamp ON oracle_data(data_timestamp);
CREATE INDEX idx_oracle_data_is_verified ON oracle_data(is_verified);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);

CREATE INDEX idx_payment_transactions_milestone_id ON payment_transactions(milestone_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);

CREATE INDEX idx_disputes_milestone_id ON disputes(milestone_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_assigned_to ON disputes(assigned_to);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action, user_id, resource_type, resource_id, new_values, created_at)
        VALUES ('CREATE', NEW.created_by, TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (action, user_id, resource_type, resource_id, old_values, new_values, created_at)
        VALUES ('UPDATE', NEW.created_by, TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action, resource_type, resource_id, old_values, created_at)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers (optional - can be resource intensive)
-- CREATE TRIGGER audit_projects_trigger AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
-- CREATE TRIGGER audit_milestones_trigger AFTER INSERT OR UPDATE OR DELETE ON milestones FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
('max_project_subsidy', '1000000', 'Maximum subsidy amount per project in ETH (wei)'),
('milestone_verification_timeout', '2592000', 'Milestone verification timeout in seconds (30 days)'),
('oracle_data_retention', '31536000', 'Oracle data retention period in seconds (1 year)'),
('audit_log_retention', '94608000', 'Audit log retention period in seconds (3 years)'),
('payment_processing_enabled', 'true', 'Whether automatic payment processing is enabled'),
('maintenance_mode', 'false', 'System maintenance mode flag');

-- Create views for common queries
CREATE VIEW project_summary AS
SELECT 
    p.id,
    p.name,
    p.producer_address,
    u.name AS producer_name,
    p.status,
    p.total_subsidy_amount,
    p.disbursed_amount,
    (p.total_subsidy_amount - p.disbursed_amount) AS remaining_subsidy,
    COUNT(m.id) AS total_milestones,
    COUNT(CASE WHEN m.status = 'verified' THEN 1 END) AS completed_milestones,
    COUNT(CASE WHEN m.status = 'pending' THEN 1 END) AS pending_milestones,
    p.created_at
FROM projects p
LEFT JOIN users u ON p.producer_id = u.id
LEFT JOIN milestones m ON p.id = m.project_id
GROUP BY p.id, u.name;

CREATE VIEW milestone_summary AS
SELECT 
    m.id,
    m.project_id,
    p.name AS project_name,
    m.description,
    m.status,
    m.target_value,
    m.actual_value,
    m.subsidy_amount,
    m.deadline,
    m.verified_at,
    u.name AS verified_by_name,
    (m.deadline < CURRENT_TIMESTAMP AND m.status = 'pending') AS is_overdue
FROM milestones m
JOIN projects p ON m.project_id = p.id
LEFT JOIN users u ON m.verified_by = u.id;

-- Create function for secure data access
CREATE OR REPLACE FUNCTION get_user_accessible_projects(user_id INTEGER, user_role user_role)
RETURNS TABLE(project_id INTEGER) AS $$
BEGIN
    IF user_role = 'government' OR user_role = 'auditor' THEN
        -- Government and auditors can see all projects
        RETURN QUERY SELECT p.id FROM projects p;
    ELSIF user_role = 'producer' THEN
        -- Producers can only see their own projects
        RETURN QUERY SELECT p.id FROM projects p WHERE p.producer_id = user_id;
    ELSE
        -- Other roles have no default project access
        RETURN QUERY SELECT p.id FROM projects p WHERE FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for audit log integrity
CREATE OR REPLACE FUNCTION calculate_audit_checksum(log_entry JSONB)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(log_entry::TEXT, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Projects access policy
CREATE POLICY project_access_policy ON projects
    USING (
        id IN (SELECT project_id FROM get_user_accessible_projects(current_user_id(), current_user_role()))
    );

-- Milestones access policy  
CREATE POLICY milestone_access_policy ON milestones
    USING (
        project_id IN (SELECT project_id FROM get_user_accessible_projects(current_user_id(), current_user_role()))
    );

-- Disputes access policy
CREATE POLICY dispute_access_policy ON disputes
    USING (
        project_id IN (SELECT project_id FROM get_user_accessible_projects(current_user_id(), current_user_role()))
        OR assigned_to = current_user_id()
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO api_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO api_user;

-- Create database backup function
CREATE OR REPLACE FUNCTION create_backup()
RETURNS TEXT AS $$
DECLARE
    backup_name TEXT;
BEGIN
    backup_name := 'gh_subsidy_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
    -- This would typically call pg_dump or similar
    RETURN backup_name;
END;
$$ LANGUAGE plpgsql;
