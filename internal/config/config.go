package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment string
	Server      ServerConfig
	Database    DatabaseConfig
	CloudDB     DatabaseConfig  // Secondary database (cloud)
	LocalDB     DatabaseConfig  // Local database (for sync/backup)
	ReadReplica DatabaseConfig  // Read replica configuration
	Redis       RedisConfig
	Security    SecurityConfig
	CORS        CORSConfig
	Logging     LoggingConfig
	HIPAA       HIPAAConfig
	Sync        SyncConfig
	Monitoring  MonitoringConfig
	Backup      BackupConfig
}

type ServerConfig struct {
	Host string
	Port string
	Mode string // gin mode: debug, release, test
}

type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	Name            string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	Enabled         bool
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
	SSL      bool
}

type SecurityConfig struct {
	EncryptionKey        string
	JWTSecret           string
	JWTExpiration       time.Duration
	JWTExpirationHours  int
	BCryptCost          int
	MaxLoginAttempts    int
	LoginLockoutMinutes int
	RateLimitRPS        int
	RateLimitBurst      int
}

type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

type LoggingConfig struct {
	Level  string
	Format string
}

type HIPAAConfig struct {
	Mode               bool
	AuditLogging       bool
	DataRetentionDays  int
}

type SyncConfig struct {
	Enabled        bool
	Interval       time.Duration
	BackupEnabled  bool
	BackupInterval time.Duration
}

type MonitoringConfig struct {
	HealthCheckEnabled bool
	MetricsEnabled     bool
	TracingEnabled     bool
}

type BackupConfig struct {
	S3Bucket          string
	S3Region          string
	EncryptionEnabled bool
}

func LoadConfig() (*Config, error) {
	// Load environment file based on ENV variable
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	// Try to load environment-specific file
	envFile := fmt.Sprintf(".env.%s", env)
	if _, err := os.Stat(envFile); err == nil {
		err = godotenv.Load(envFile)
		if err != nil {
			return nil, fmt.Errorf("error loading %s file: %v", envFile, err)
		}
	} else {
		// Fallback to .env file
		err = godotenv.Load()
		if err != nil {
			// Don't fail if .env doesn't exist - use environment variables
			fmt.Printf("Warning: .env file not found in %s mode, using environment variables only\n", env)
		}
	}

	config := &Config{
		Environment: env,
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "localhost"),
			Port: getEnv("SERVER_PORT", "8080"),
			Mode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "postgres"),
			Password:        getEnv("DB_PASSWORD", ""),
			Name:            getEnv("DB_NAME", "pharmacy"),
			SSLMode:         getEnv("DB_SSL_MODE", "disable"),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 100),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: time.Duration(getEnvAsInt("DB_CONN_MAX_LIFETIME", 3600)) * time.Second,
			Enabled:         true,
		},
		CloudDB: DatabaseConfig{
			Host:            getEnv("CLOUD_DB_HOST", ""),
			Port:            getEnv("CLOUD_DB_PORT", "5432"),
			User:            getEnv("CLOUD_DB_USER", ""),
			Password:        getEnv("CLOUD_DB_PASSWORD", ""),
			Name:            getEnv("CLOUD_DB_NAME", ""),
			SSLMode:         getEnv("CLOUD_DB_SSL_MODE", "require"),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 100),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: time.Duration(getEnvAsInt("DB_CONN_MAX_LIFETIME", 3600)) * time.Second,
			Enabled:         getEnv("CLOUD_DB_HOST", "") != "",
		},
		LocalDB: DatabaseConfig{
			Host:            getEnv("LOCAL_DB_HOST", ""),
			Port:            getEnv("LOCAL_DB_PORT", "5432"),
			User:            getEnv("LOCAL_DB_USER", ""),
			Password:        getEnv("LOCAL_DB_PASSWORD", ""),
			Name:            getEnv("LOCAL_DB_NAME", ""),
			SSLMode:         getEnv("LOCAL_DB_SSL_MODE", "disable"),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 100),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: time.Duration(getEnvAsInt("DB_CONN_MAX_LIFETIME", 3600)) * time.Second,
			Enabled:         getEnv("LOCAL_DB_HOST", "") != "",
		},
		ReadReplica: DatabaseConfig{
			Host:            getEnv("READ_REPLICA_HOST", ""),
			Port:            getEnv("READ_REPLICA_PORT", "5432"),
			User:            getEnv("READ_REPLICA_USER", ""),
			Password:        getEnv("READ_REPLICA_PASSWORD", ""),
			Name:            getEnv("READ_REPLICA_NAME", ""),
			SSLMode:         getEnv("READ_REPLICA_SSL_MODE", "require"),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 50),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: time.Duration(getEnvAsInt("DB_CONN_MAX_LIFETIME", 3600)) * time.Second,
			Enabled:         getEnvAsBool("READ_REPLICA_ENABLED", false),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
			SSL:      getEnvAsBool("REDIS_SSL", false),
		},
		Security: SecurityConfig{
			EncryptionKey:        getEnv("ENCRYPTION_KEY", ""),
			JWTSecret:           getEnv("JWT_SECRET", ""),
			JWTExpiration:       time.Duration(getEnvAsInt("JWT_EXPIRATION", 3600)) * time.Second,
			JWTExpirationHours:  getEnvAsInt("JWT_EXPIRATION_HOURS", 24),
			BCryptCost:          getEnvAsInt("BCRYPT_COST", 12),
			MaxLoginAttempts:    getEnvAsInt("MAX_LOGIN_ATTEMPTS", 5),
			LoginLockoutMinutes: getEnvAsInt("LOGIN_LOCKOUT_MINUTES", 15),
			RateLimitRPS:        getEnvAsInt("RATE_LIMIT_RPS", 100),
			RateLimitBurst:      getEnvAsInt("RATE_LIMIT_BURST", 200),
		},
		CORS: CORSConfig{
			AllowedOrigins: parseCommaSeparated(getEnv("CORS_ALLOWED_ORIGINS", "*")),
			AllowedMethods: parseCommaSeparated(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS")),
			AllowedHeaders: parseCommaSeparated(getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization,X-Requested-With")),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
		HIPAA: HIPAAConfig{
			Mode:              getEnvAsBool("HIPAA_MODE", false),
			AuditLogging:      getEnvAsBool("AUDIT_LOGGING", true),
			DataRetentionDays: getEnvAsInt("DATA_RETENTION_DAYS", 2555), // 7 years
		},
		Sync: SyncConfig{
			Enabled:        getEnvAsBool("DB_SYNC_ENABLED", false),
			Interval:       time.Duration(getEnvAsInt("DB_SYNC_INTERVAL", 300)) * time.Second,
			BackupEnabled:  getEnvAsBool("DB_BACKUP_ENABLED", false),
			BackupInterval: time.Duration(getEnvAsInt("DB_BACKUP_INTERVAL", 3600)) * time.Second,
		},
		Monitoring: MonitoringConfig{
			HealthCheckEnabled: getEnvAsBool("HEALTH_CHECK_ENABLED", true),
			MetricsEnabled:     getEnvAsBool("METRICS_ENABLED", false),
			TracingEnabled:     getEnvAsBool("TRACING_ENABLED", false),
		},
		Backup: BackupConfig{
			S3Bucket:          getEnv("S3_BACKUP_BUCKET", ""),
			S3Region:          getEnv("S3_REGION", "us-east-1"),
			EncryptionEnabled: getEnvAsBool("BACKUP_ENCRYPTION", true),
		},
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %v", err)
	}

	return config, nil
}

func (c *Config) Validate() error {
	// Required fields validation
	if c.Database.Password == "" && c.Environment == "production" {
		return fmt.Errorf("database password is required in production")
	}

	if c.Security.EncryptionKey == "" {
		return fmt.Errorf("encryption key is required")
	}

	if len(c.Security.EncryptionKey) != 32 {
		return fmt.Errorf("encryption key must be 32 characters long")
	}

	if c.Security.JWTSecret == "" {
		return fmt.Errorf("JWT secret is required")
	}

	// Validate dual database setup
	if c.CloudDB.Enabled && c.LocalDB.Enabled {
		fmt.Println("✅ Dual database configuration detected:")
		fmt.Printf("   Primary: %s:%s/%s\n", c.Database.Host, c.Database.Port, c.Database.Name)
		if c.CloudDB.Host != "" {
			fmt.Printf("   Cloud:   %s:%s/%s\n", c.CloudDB.Host, c.CloudDB.Port, c.CloudDB.Name)
		}
		if c.LocalDB.Host != "" {
			fmt.Printf("   Local:   %s:%s/%s\n", c.LocalDB.Host, c.LocalDB.Port, c.LocalDB.Name)
		}
	}

	// Validate read replica
	if c.ReadReplica.Enabled {
		fmt.Printf("✅ Read replica enabled: %s:%s/%s\n", 
			c.ReadReplica.Host, c.ReadReplica.Port, c.ReadReplica.Name)
	}

	// Validate sync configuration
	if c.Sync.Enabled && (!c.CloudDB.Enabled && !c.LocalDB.Enabled) {
		return fmt.Errorf("sync is enabled but no secondary database is configured")
	}

	return nil
}

// GetPrimaryDSN returns the primary database connection string
func (c *Config) GetPrimaryDSN() string {
	return c.buildDSN(c.Database)
}

// GetCloudDSN returns the cloud database connection string
func (c *Config) GetCloudDSN() string {
	if !c.CloudDB.Enabled {
		return ""
	}
	return c.buildDSN(c.CloudDB)
}

// GetLocalDSN returns the local database connection string
func (c *Config) GetLocalDSN() string {
	if !c.LocalDB.Enabled {
		return ""
	}
	return c.buildDSN(c.LocalDB)
}

// GetReadReplicaDSN returns the read replica connection string
func (c *Config) GetReadReplicaDSN() string {
	if !c.ReadReplica.Enabled {
		return ""
	}
	return c.buildDSN(c.ReadReplica)
}

func (c *Config) buildDSN(db DatabaseConfig) string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		db.Host, db.Port, db.User, db.Password, db.Name, db.SSLMode)
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func parseCommaSeparated(value string) []string {
	if value == "" {
		return []string{}
	}
	
	var result []string
	for _, v := range strings.Split(value, ",") {
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// IsProduction returns true if running in production environment
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// IsDevelopment returns true if running in development environment
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// HasCloudDB returns true if cloud database is configured
func (c *Config) HasCloudDB() bool {
	return c.CloudDB.Enabled && c.CloudDB.Host != ""
}

// HasLocalDB returns true if local database is configured
func (c *Config) HasLocalDB() bool {
	return c.LocalDB.Enabled && c.LocalDB.Host != ""
}

// HasReadReplica returns true if read replica is configured
func (c *Config) HasReadReplica() bool {
	return c.ReadReplica.Enabled && c.ReadReplica.Host != ""
}