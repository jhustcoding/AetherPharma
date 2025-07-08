# Dual PostgreSQL Database Setup Guide

## 🗃️ **YES - Multiple PostgreSQL Databases Supported!**

Your pharmacy backend now supports **multiple PostgreSQL configurations** including:
- **Local + Cloud** databases
- **Primary + Read Replica** setup
- **Development + Production** environments
- **Automatic synchronization** between databases
- **Failover and redundancy**

## 🏗️ **Supported Architecture Patterns**

### **1. Development vs Production Pattern**
```
Development Environment:
┌─────────────────────┐
│   LOCAL PostgreSQL │
│   localhost:5432    │
│   pharmacy_dev      │
└─────────────────────┘

Production Environment:
┌─────────────────────┐
│   CLOUD PostgreSQL │
│   AWS RDS/Cloud SQL │
│   pharmacy_prod     │
└─────────────────────┘
```

### **2. Dual Database Pattern (Local + Cloud)**
```
┌─────────────────────┐    ┌─────────────────────┐
│   LOCAL (Primary)   │◄──►│   CLOUD (Backup)    │
│   localhost:5432    │    │   AWS RDS           │
│   Fast Local Access│    │   Secure Cloud      │
│   Real-time Ops     │    │   Analytics/Reports │
└─────────────────────┘    └─────────────────────┘
           │ Sync │
           └──────┘
```

### **3. Primary + Read Replica Pattern**
```
┌─────────────────────┐    ┌─────────────────────┐
│   PRIMARY (Write)   │───►│   REPLICA (Read)    │
│   Write Operations  │    │   Read Operations   │
│   POS Transactions  │    │   Analytics/Reports │
│   Order Processing  │    │   Dashboard Queries │
└─────────────────────┘    └─────────────────────┘
```

### **4. Multi-Region Pattern**
```
┌─────────────────────┐    ┌─────────────────────┐
│   LOCAL/REGION-1    │◄──►│   CLOUD/REGION-2    │
│   Asia-Pacific      │    │   North America     │
│   Low Latency       │    │   Disaster Recovery │
│   Main Operations   │    │   Backup Site       │
└─────────────────────┘    └─────────────────────┘
```

## ⚙️ **Configuration Setup**

### **Environment Files**

#### **Local Development (.env.local)**
```bash
# Primary Database (Local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_local_password
DB_NAME=pharmacy_local
DB_SSL_MODE=disable

# Cloud Database (Optional - for testing sync)
CLOUD_DB_HOST=your-test-db.amazonaws.com
CLOUD_DB_PORT=5432
CLOUD_DB_USER=pharmacy_user
CLOUD_DB_PASSWORD=your_cloud_password
CLOUD_DB_NAME=pharmacy_test
CLOUD_DB_SSL_MODE=require

# Sync Configuration
DB_SYNC_ENABLED=true
DB_SYNC_INTERVAL=300  # 5 minutes
```

#### **Production (.env.production)**
```bash
# Primary Database (Cloud PostgreSQL)
DB_HOST=pharmacy-prod.cluster-xyz.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=pharmacy_admin
DB_PASSWORD=your_secure_cloud_password
DB_NAME=pharmacy_production
DB_SSL_MODE=require

# Local Database (Backup/Edge)
LOCAL_DB_HOST=10.0.1.100
LOCAL_DB_PORT=5432
LOCAL_DB_USER=pharmacy_local
LOCAL_DB_PASSWORD=your_local_password
LOCAL_DB_NAME=pharmacy_local_backup
LOCAL_DB_SSL_MODE=disable

# Read Replica
READ_REPLICA_ENABLED=true
READ_REPLICA_HOST=pharmacy-prod-read.cluster-xyz.us-east-1.rds.amazonaws.com
READ_REPLICA_PORT=5432
READ_REPLICA_USER=pharmacy_reader
READ_REPLICA_PASSWORD=your_replica_password
READ_REPLICA_NAME=pharmacy_production
```

## 🐘 **PostgreSQL Database Setup**

### **1. Local PostgreSQL Installation**

#### **Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create pharmacy database and user
sudo -u postgres psql
CREATE DATABASE pharmacy_local;
CREATE USER pharmacy_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pharmacy_local TO pharmacy_user;
\q
```

#### **macOS (using Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql
brew services start postgresql

# Create database
createdb pharmacy_local
psql pharmacy_local
CREATE USER pharmacy_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pharmacy_local TO pharmacy_user;
\q
```

#### **Windows:**
```bash
# Download and install PostgreSQL from postgresql.org
# Use pgAdmin or command line:
psql -U postgres
CREATE DATABASE pharmacy_local;
CREATE USER pharmacy_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pharmacy_local TO pharmacy_user;
\q
```

### **2. Cloud PostgreSQL Setup**

#### **AWS RDS:**
```bash
# Create RDS instance using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier pharmacy-prod \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username pharmacy_admin \
    --master-user-password your_secure_password \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxx \
    --publicly-accessible \
    --storage-encrypted

# Create read replica
aws rds create-db-instance-read-replica \
    --db-instance-identifier pharmacy-prod-read \
    --source-db-instance-identifier pharmacy-prod
```

#### **Google Cloud SQL:**
```bash
# Create Cloud SQL instance
gcloud sql instances create pharmacy-prod \
    --database-version=POSTGRES_13 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database
gcloud sql databases create pharmacy_production --instance=pharmacy-prod

# Create user
gcloud sql users create pharmacy_admin \
    --instance=pharmacy-prod \
    --password=your_secure_password
```

#### **Azure Database for PostgreSQL:**
```bash
# Create Azure PostgreSQL server
az postgres server create \
    --resource-group myResourceGroup \
    --name pharmacy-prod \
    --location westus \
    --admin-user pharmacy_admin \
    --admin-password your_secure_password \
    --sku-name B_Gen5_1 \
    --version 11
```

## 🚀 **Backend Integration**

### **Updated main.go**
```go
package main

import (
    "log"
    "pharmacy-backend/internal/config"
    "pharmacy-backend/internal/database"
    "pharmacy-backend/internal/api"
)

func main() {
    // Load configuration
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Initialize database manager (handles multiple DBs)
    dbManager, err := database.NewDatabaseManager(cfg)
    if err != nil {
        log.Fatal("Failed to initialize database manager:", err)
    }
    defer dbManager.Close()

    // Your existing code using dbManager.GetPrimary() for main DB
    // dbManager.GetForRead() for read operations
    // dbManager.GetForWrite() for write operations
}
```

### **Using Multiple Databases in Services**
```go
// Example: Customer service with dual database support
type CustomerService struct {
    dbManager *database.DatabaseManager
}

// Read operations (uses read replica if available)
func (s *CustomerService) GetCustomers() ([]models.Customer, error) {
    db := s.dbManager.GetForRead()  // Uses read replica or primary
    var customers []models.Customer
    return customers, db.Find(&customers).Error
}

// Write operations (always uses primary)
func (s *CustomerService) CreateCustomer(customer *models.Customer) error {
    db := s.dbManager.GetForWrite()  // Always uses primary
    return db.Create(customer).Error
}

// Cloud-specific operations
func (s *CustomerService) BackupToCloud() error {
    return s.dbManager.WithCloudDB(func(db *gorm.DB) error {
        // Perform cloud-specific operations
        return nil
    })
}
```

## 🔄 **Database Synchronization**

### **Automatic Sync (Built-in)**
```go
// Configured via environment variables:
DB_SYNC_ENABLED=true
DB_SYNC_INTERVAL=300  # 5 minutes

// The system automatically syncs:
// Primary → Cloud Database
// Primary → Local Backup
// Every 5 minutes (configurable)
```

### **Manual Sync Operations**
```bash
# API endpoints for manual sync
POST /api/v1/admin/sync/trigger    # Trigger immediate sync
GET  /api/v1/admin/sync/status     # Check sync status
GET  /api/v1/admin/databases/stats # Database statistics
```

### **Custom Sync Logic**
```go
// Manual sync with custom logic
func syncCustomers() error {
    return dbManager.ExecuteOnAll(func(db *gorm.DB) error {
        // Custom sync logic for each database
        return nil
    })
}
```

## 📊 **Monitoring and Health Checks**

### **Database Health API**
```bash
# Check database health
GET /api/v1/health/databases

Response:
{
    "databases": {
        "primary": true,
        "cloud": true,
        "local": false,
        "replica": true
    },
    "stats": {
        "primary_connections": 15,
        "cloud_connections": 8,
        "replica_connections": 23,
        "sync_status": "enabled",
        "last_sync": "2024-01-15T10:30:00Z"
    }
}
```

### **Connection Statistics**
```go
stats, _ := dbManager.GetStats()
fmt.Printf("Primary connections: %d\n", stats.PrimaryConnections)
fmt.Printf("Cloud connections: %d\n", stats.CloudConnections)
fmt.Printf("Sync status: %s\n", stats.SyncStatus)
```

## 🔧 **Configuration Options**

### **Database Connection Settings**
```bash
# Connection Pool Settings
DB_MAX_OPEN_CONNS=100      # Maximum open connections
DB_MAX_IDLE_CONNS=10       # Maximum idle connections
DB_CONN_MAX_LIFETIME=3600  # Connection lifetime in seconds

# Cloud Database Settings
CLOUD_DB_SSL_MODE=require  # SSL mode for cloud connections
CLOUD_DB_TIMEOUT=30        # Connection timeout

# Sync Settings
DB_SYNC_ENABLED=true       # Enable/disable sync
DB_SYNC_INTERVAL=300       # Sync interval in seconds
DB_BACKUP_ENABLED=true     # Enable backups
DB_BACKUP_INTERVAL=3600    # Backup interval in seconds
```

### **Performance Tuning**
```bash
# Primary Database (High Performance)
DB_MAX_OPEN_CONNS=200
DB_MAX_IDLE_CONNS=50

# Read Replica (Analytics Optimized)
READ_REPLICA_MAX_OPEN_CONNS=100
READ_REPLICA_MAX_IDLE_CONNS=25

# Local Database (Resource Limited)
LOCAL_DB_MAX_OPEN_CONNS=50
LOCAL_DB_MAX_IDLE_CONNS=10
```

## 🛡️ **Security Considerations**

### **Network Security**
```bash
# Cloud Database Security Groups
# Allow only your server IPs
Security Group Rules:
- Type: PostgreSQL, Port: 5432, Source: Your-Server-IP/32
- Type: PostgreSQL, Port: 5432, Source: Your-VPC-CIDR

# Local Database Firewall
sudo ufw allow from your-server-ip to any port 5432
```

### **SSL/TLS Configuration**
```bash
# Cloud connections (always use SSL)
CLOUD_DB_SSL_MODE=require
CLOUD_DB_SSL_CERT=/path/to/client-cert.pem
CLOUD_DB_SSL_KEY=/path/to/client-key.pem
CLOUD_DB_SSL_ROOT_CERT=/path/to/ca-cert.pem

# Local connections (optional SSL)
LOCAL_DB_SSL_MODE=prefer  # or disable for development
```

### **Encryption at Rest**
```bash
# AWS RDS Encryption
--storage-encrypted
--kms-key-id arn:aws:kms:region:account:key/key-id

# Google Cloud SQL Encryption
--disk-encryption-key projects/KEY_PROJECT_ID/locations/LOCATION/keyRings/RING_NAME/cryptoKeys/KEY_NAME
```

## 📋 **Common Use Cases**

### **1. Development Setup (Local Only)**
```bash
ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=pharmacy_dev
```

### **2. Production with Backup (Cloud + Local)**
```bash
ENV=production
# Primary: Cloud Database
DB_HOST=cloud-db.example.com
# Backup: Local Database
LOCAL_DB_HOST=localhost
LOCAL_DB_NAME=pharmacy_backup
DB_SYNC_ENABLED=true
```

### **3. High Availability (Primary + Replica)**
```bash
ENV=production
# Write Database
DB_HOST=primary-db.example.com
# Read Database
READ_REPLICA_ENABLED=true
READ_REPLICA_HOST=replica-db.example.com
```

### **4. Multi-Region Setup**
```bash
ENV=production
# Region 1 (Primary)
DB_HOST=region1-db.example.com
# Region 2 (Disaster Recovery)
CLOUD_DB_HOST=region2-db.example.com
DB_SYNC_ENABLED=true
DB_SYNC_INTERVAL=60  # 1 minute for critical data
```

## 🚨 **Troubleshooting**

### **Connection Issues**
```bash
# Test database connectivity
pg_isready -h localhost -p 5432 -U postgres
pg_isready -h your-cloud-db.com -p 5432 -U pharmacy_user

# Check logs
tail -f /var/log/postgresql/postgresql-13-main.log
```

### **Sync Issues**
```bash
# Check sync status via API
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/v1/admin/sync/status

# Manual sync trigger
curl -X POST -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/v1/admin/sync/trigger
```

### **Performance Issues**
```bash
# Monitor database connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check connection pool status
SELECT count(*) as total_connections FROM pg_stat_activity;
```

## 📈 **Benefits of Dual Database Setup**

### **Performance Benefits:**
- **Read/Write Split**: Analytics on replica, transactions on primary
- **Geographic Distribution**: Local access for low latency
- **Load Distribution**: Spread queries across multiple databases

### **Reliability Benefits:**
- **High Availability**: Automatic failover to backup database
- **Disaster Recovery**: Geographic redundancy
- **Data Protection**: Multiple copies of critical data

### **Operational Benefits:**
- **Flexible Deployment**: Different environments for dev/prod
- **Cost Optimization**: Local for frequent access, cloud for backup
- **Compliance**: Meet data residency requirements

## 🎯 **Next Steps**

1. **Choose Your Pattern**: Select the database pattern that fits your needs
2. **Set Environment Variables**: Configure your `.env` files
3. **Install PostgreSQL**: Set up local and/or cloud databases
4. **Test Connections**: Verify all databases are accessible
5. **Enable Sync**: Configure synchronization if needed
6. **Monitor Health**: Set up monitoring and alerts

Your pharmacy backend now supports any combination of local and cloud PostgreSQL databases with automatic synchronization and failover capabilities! 🚀