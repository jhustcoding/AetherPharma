-- PostgreSQL initialization script
-- This ensures the UUID extension is properly loaded

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure proper permissions
GRANT ALL PRIVILEGES ON DATABASE pharmacy_db TO pharmacy_user;