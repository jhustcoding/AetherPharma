package database

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"pharmacy-backend/internal/config"
	"pharmacy-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DatabaseManager struct {
	config      *config.Config
	primary     *gorm.DB
	cloudDB     *gorm.DB
	localDB     *gorm.DB
	readReplica *gorm.DB
	syncEnabled bool
	mu          sync.RWMutex
}

type DatabaseStats struct {
	PrimaryConnections    int
	CloudConnections      int
	LocalConnections      int
	ReplicaConnections    int
	LastSyncTime          time.Time
	SyncStatus            string
	HealthStatus          map[string]bool
}

func NewDatabaseManager(cfg *config.Config) (*DatabaseManager, error) {
	dm := &DatabaseManager{
		config:      cfg,
		syncEnabled: cfg.Sync.Enabled,
	}

	// Connect to primary database
	primary, err := dm.connectToDatabase("primary", cfg.GetPrimaryDSN(), cfg.Database)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to primary database: %w", err)
	}
	dm.primary = primary
	log.Printf("✅ Connected to primary database: %s:%s/%s", 
		cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)

	// Connect to cloud database if configured
	if cfg.HasCloudDB() {
		cloudDB, err := dm.connectToDatabase("cloud", cfg.GetCloudDSN(), cfg.CloudDB)
		if err != nil {
			log.Printf("⚠️  Failed to connect to cloud database: %v", err)
		} else {
			dm.cloudDB = cloudDB
			log.Printf("✅ Connected to cloud database: %s:%s/%s", 
				cfg.CloudDB.Host, cfg.CloudDB.Port, cfg.CloudDB.Name)
		}
	}

	// Connect to local database if configured
	if cfg.HasLocalDB() {
		localDB, err := dm.connectToDatabase("local", cfg.GetLocalDSN(), cfg.LocalDB)
		if err != nil {
			log.Printf("⚠️  Failed to connect to local database: %v", err)
		} else {
			dm.localDB = localDB
			log.Printf("✅ Connected to local database: %s:%s/%s", 
				cfg.LocalDB.Host, cfg.LocalDB.Port, cfg.LocalDB.Name)
		}
	}

	// Connect to read replica if configured
	if cfg.HasReadReplica() {
		readReplica, err := dm.connectToDatabase("replica", cfg.GetReadReplicaDSN(), cfg.ReadReplica)
		if err != nil {
			log.Printf("⚠️  Failed to connect to read replica: %v", err)
		} else {
			dm.readReplica = readReplica
			log.Printf("✅ Connected to read replica: %s:%s/%s", 
				cfg.ReadReplica.Host, cfg.ReadReplica.Port, cfg.ReadReplica.Name)
		}
	}

	// Run migrations on all databases
	if err := dm.runMigrations(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Start sync service if enabled
	if dm.syncEnabled {
		go dm.startSyncService()
		log.Println("✅ Database synchronization service started")
	}

	return dm, nil
}

func (dm *DatabaseManager) connectToDatabase(name, dsn string, dbConfig config.DatabaseConfig) (*gorm.DB, error) {
	// Configure logger based on environment
	var logLevel logger.LogLevel
	if dm.config.IsDevelopment() {
		logLevel = logger.Info
	} else {
		logLevel = logger.Warn
	}

	// Open database connection
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open %s database: %w", name, err)
	}

	// Get underlying SQL DB for connection configuration
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get SQL DB instance for %s: %w", name, err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(dbConfig.MaxOpenConns)
	sqlDB.SetMaxIdleConns(dbConfig.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(dbConfig.ConnMaxLifetime)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping %s database: %w", name, err)
	}

	return db, nil
}

func (dm *DatabaseManager) runMigrations() error {
	databases := map[string]*gorm.DB{
		"primary": dm.primary,
	}

	// Add other databases to migration list
	if dm.cloudDB != nil {
		databases["cloud"] = dm.cloudDB
	}
	if dm.localDB != nil {
		databases["local"] = dm.localDB
	}
	// Note: Skip read replica for migrations as it should be read-only

	for name, db := range databases {
		log.Printf("🔄 Running migrations on %s database...", name)
		if err := Migrate(db); err != nil {
			return fmt.Errorf("failed to migrate %s database: %w", name, err)
		}
		log.Printf("✅ Migrations completed on %s database", name)
	}

	return nil
}

// GetPrimary returns the primary database connection
func (dm *DatabaseManager) GetPrimary() *gorm.DB {
	return dm.primary
}

// GetForRead returns the best database for read operations
func (dm *DatabaseManager) GetForRead() *gorm.DB {
	dm.mu.RLock()
	defer dm.mu.RUnlock()

	// Use read replica if available and healthy
	if dm.readReplica != nil && dm.isHealthy(dm.readReplica) {
		return dm.readReplica
	}

	// Fallback to primary
	return dm.primary
}

// GetForWrite returns the primary database for write operations
func (dm *DatabaseManager) GetForWrite() *gorm.DB {
	return dm.primary
}

// GetCloudDB returns the cloud database connection
func (dm *DatabaseManager) GetCloudDB() *gorm.DB {
	return dm.cloudDB
}

// GetLocalDB returns the local database connection
func (dm *DatabaseManager) GetLocalDB() *gorm.DB {
	return dm.localDB
}

// ExecuteOnAll executes a function on all available databases
func (dm *DatabaseManager) ExecuteOnAll(fn func(*gorm.DB) error) error {
	databases := []*gorm.DB{dm.primary}
	
	if dm.cloudDB != nil {
		databases = append(databases, dm.cloudDB)
	}
	if dm.localDB != nil {
		databases = append(databases, dm.localDB)
	}

	for i, db := range databases {
		if err := fn(db); err != nil {
			return fmt.Errorf("failed to execute on database %d: %w", i, err)
		}
	}

	return nil
}

// SyncData synchronizes data between databases
func (dm *DatabaseManager) SyncData() error {
	if !dm.syncEnabled {
		return fmt.Errorf("sync is not enabled")
	}

	dm.mu.Lock()
	defer dm.mu.Unlock()

	log.Println("🔄 Starting database synchronization...")

	// Sync from primary to cloud
	if dm.cloudDB != nil {
		if err := dm.syncDatabasePair(dm.primary, dm.cloudDB, "primary->cloud"); err != nil {
			log.Printf("❌ Failed to sync primary to cloud: %v", err)
		} else {
			log.Println("✅ Synced primary to cloud")
		}
	}

	// Sync from primary to local
	if dm.localDB != nil {
		if err := dm.syncDatabasePair(dm.primary, dm.localDB, "primary->local"); err != nil {
			log.Printf("❌ Failed to sync primary to local: %v", err)
		} else {
			log.Println("✅ Synced primary to local")
		}
	}

	log.Println("✅ Database synchronization completed")
	return nil
}

func (dm *DatabaseManager) syncDatabasePair(source, target *gorm.DB, direction string) error {
	// Start transaction on target
	tx := target.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Sync each table
	tables := []interface{}{
		&models.User{},
		&models.Customer{},
		&models.Product{},
		&models.Sale{},
		&models.SaleItem{},
		&models.StockMovement{},
		&models.PurchaseHistory{},
		&models.Supplier{},
		&models.OnlineOrder{},
		&models.OnlineOrderItem{},
		&models.ShoppingCart{},
		&models.OrderStatusHistory{},
		&models.QRCode{},
		&models.QRScanLog{},
		&models.PrescriptionUpload{},
		&models.AuditLog{},
	}

	for _, model := range tables {
		if err := dm.syncTable(source, tx, model); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to sync table %T: %w", model, err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit sync transaction: %w", err)
	}

	return nil
}

func (dm *DatabaseManager) syncTable(source, target *gorm.DB, model interface{}) error {
	// This is a simplified sync - in production, you'd want more sophisticated logic
	// like incremental sync, conflict resolution, etc.
	
	// Get the table name
	stmt := &gorm.Statement{DB: target}
	err := stmt.Parse(model)
	if err != nil {
		return fmt.Errorf("failed to parse model: %w", err)
	}
	tableName := stmt.Schema.Table

	// Clear target table (be careful with this in production!)
	if err := target.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", tableName)).Error; err != nil {
		return fmt.Errorf("failed to truncate table %s: %w", tableName, err)
	}

	// Copy data from source to target
	var records []map[string]interface{}
	if err := source.Table(tableName).Find(&records).Error; err != nil {
		return fmt.Errorf("failed to read from source table %s: %w", tableName, err)
	}

	if len(records) > 0 {
		if err := target.Table(tableName).Create(records).Error; err != nil {
			return fmt.Errorf("failed to insert into target table %s: %w", tableName, err)
		}
	}

	return nil
}

// GetStats returns database statistics
func (dm *DatabaseManager) GetStats() (*DatabaseStats, error) {
	stats := &DatabaseStats{
		HealthStatus: make(map[string]bool),
	}

	// Get connection stats
	if sqlDB, err := dm.primary.DB(); err == nil {
		dbStats := sqlDB.Stats()
		stats.PrimaryConnections = dbStats.OpenConnections
		stats.HealthStatus["primary"] = dm.isHealthy(dm.primary)
	}

	if dm.cloudDB != nil {
		if sqlDB, err := dm.cloudDB.DB(); err == nil {
			dbStats := sqlDB.Stats()
			stats.CloudConnections = dbStats.OpenConnections
			stats.HealthStatus["cloud"] = dm.isHealthy(dm.cloudDB)
		}
	}

	if dm.localDB != nil {
		if sqlDB, err := dm.localDB.DB(); err == nil {
			dbStats := sqlDB.Stats()
			stats.LocalConnections = dbStats.OpenConnections
			stats.HealthStatus["local"] = dm.isHealthy(dm.localDB)
		}
	}

	if dm.readReplica != nil {
		if sqlDB, err := dm.readReplica.DB(); err == nil {
			dbStats := sqlDB.Stats()
			stats.ReplicaConnections = dbStats.OpenConnections
			stats.HealthStatus["replica"] = dm.isHealthy(dm.readReplica)
		}
	}

	// Sync status
	if dm.syncEnabled {
		stats.SyncStatus = "enabled"
	} else {
		stats.SyncStatus = "disabled"
	}

	return stats, nil
}

// HealthCheck performs health checks on all databases
func (dm *DatabaseManager) HealthCheck() map[string]bool {
	health := make(map[string]bool)
	
	health["primary"] = dm.isHealthy(dm.primary)
	
	if dm.cloudDB != nil {
		health["cloud"] = dm.isHealthy(dm.cloudDB)
	}
	
	if dm.localDB != nil {
		health["local"] = dm.isHealthy(dm.localDB)
	}
	
	if dm.readReplica != nil {
		health["replica"] = dm.isHealthy(dm.readReplica)
	}
	
	return health
}

func (dm *DatabaseManager) isHealthy(db *gorm.DB) bool {
	if db == nil {
		return false
	}
	
	sqlDB, err := db.DB()
	if err != nil {
		return false
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	return sqlDB.PingContext(ctx) == nil
}

// Close closes all database connections
func (dm *DatabaseManager) Close() error {
	var errors []error

	if dm.primary != nil {
		if sqlDB, err := dm.primary.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				errors = append(errors, fmt.Errorf("failed to close primary DB: %w", err))
			}
		}
	}

	if dm.cloudDB != nil {
		if sqlDB, err := dm.cloudDB.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				errors = append(errors, fmt.Errorf("failed to close cloud DB: %w", err))
			}
		}
	}

	if dm.localDB != nil {
		if sqlDB, err := dm.localDB.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				errors = append(errors, fmt.Errorf("failed to close local DB: %w", err))
			}
		}
	}

	if dm.readReplica != nil {
		if sqlDB, err := dm.readReplica.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				errors = append(errors, fmt.Errorf("failed to close read replica: %w", err))
			}
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors closing databases: %v", errors)
	}

	return nil
}

// Private methods

func (dm *DatabaseManager) startSyncService() {
	ticker := time.NewTicker(dm.config.Sync.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := dm.SyncData(); err != nil {
				log.Printf("❌ Sync failed: %v", err)
			}
		}
	}
}

// Utility functions for switching database contexts

// WithCloudDB executes a function with cloud database context
func (dm *DatabaseManager) WithCloudDB(fn func(*gorm.DB) error) error {
	if dm.cloudDB == nil {
		return fmt.Errorf("cloud database not configured")
	}
	return fn(dm.cloudDB)
}

// WithLocalDB executes a function with local database context
func (dm *DatabaseManager) WithLocalDB(fn func(*gorm.DB) error) error {
	if dm.localDB == nil {
		return fmt.Errorf("local database not configured")
	}
	return fn(dm.localDB)
}

// WithReadReplica executes a function with read replica context
func (dm *DatabaseManager) WithReadReplica(fn func(*gorm.DB) error) error {
	if dm.readReplica == nil {
		return fmt.Errorf("read replica not configured")
	}
	return fn(dm.readReplica)
}

// GetBestReadDB returns the best database for read operations based on health and load
func (dm *DatabaseManager) GetBestReadDB() *gorm.DB {
	// Priority: Read Replica > Primary
	if dm.readReplica != nil && dm.isHealthy(dm.readReplica) {
		return dm.readReplica
	}
	return dm.primary
}