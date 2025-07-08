package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

type Config struct {
	// Server Configuration
	Port         string
	Environment  string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration

	// Database Configuration
	DatabaseURL      string
	DatabaseHost     string
	DatabasePort     string
	DatabaseUser     string
	DatabasePassword string
	DatabaseName     string
	DatabaseSSLMode  string

	// Redis Configuration
	RedisURL      string
	RedisPassword string
	RedisDB       int

	// Security Configuration
	JWTSecret           string
	JWTExpirationHours  int
	EncryptionKey       string
	BCryptCost          int
	RateLimitRPS        int
	RateLimitBurst      int
	MaxLoginAttempts    int
	LoginLockoutMinutes int

	// CORS Configuration
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string

	// Medical Compliance
	HIPAAMode          bool
	AuditLogging       bool
	DataRetentionYears int

	// External APIs
	DrugInteractionAPIKey string
	FDAAPIKey            string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		logrus.Warn("No .env file found, using environment variables")
	}

	config := &Config{
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		ReadTimeout: parseDuration(getEnv("READ_TIMEOUT", "30s")),
		WriteTimeout: parseDuration(getEnv("WRITE_TIMEOUT", "30s")),

		// Database
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		DatabaseHost:     getEnv("DB_HOST", "localhost"),
		DatabasePort:     getEnv("DB_PORT", "5432"),
		DatabaseUser:     getEnv("DB_USER", "pharmacy_user"),
		DatabasePassword: getEnv("DB_PASSWORD", ""),
		DatabaseName:     getEnv("DB_NAME", "pharmacy_db"),
		DatabaseSSLMode:  getEnv("DB_SSL_MODE", "require"),

		// Redis
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       parseInt(getEnv("REDIS_DB", "0")),

		// Security
		JWTSecret:           getEnv("JWT_SECRET", ""),
		JWTExpirationHours:  parseInt(getEnv("JWT_EXPIRATION_HOURS", "24")),
		EncryptionKey:       getEnv("ENCRYPTION_KEY", ""),
		BCryptCost:          parseInt(getEnv("BCRYPT_COST", "12")),
		RateLimitRPS:        parseInt(getEnv("RATE_LIMIT_RPS", "10")),
		RateLimitBurst:      parseInt(getEnv("RATE_LIMIT_BURST", "20")),
		MaxLoginAttempts:    parseInt(getEnv("MAX_LOGIN_ATTEMPTS", "5")),
		LoginLockoutMinutes: parseInt(getEnv("LOGIN_LOCKOUT_MINUTES", "15")),

		// CORS
		AllowedOrigins: parseStringSlice(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		AllowedMethods: parseStringSlice(getEnv("ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS")),
		AllowedHeaders: parseStringSlice(getEnv("ALLOWED_HEADERS", "Origin,Content-Type,Accept,Authorization,X-Requested-With")),

		// Compliance
		HIPAAMode:          parseBool(getEnv("HIPAA_MODE", "true")),
		AuditLogging:       parseBool(getEnv("AUDIT_LOGGING", "true")),
		DataRetentionYears: parseInt(getEnv("DATA_RETENTION_YEARS", "7")),

		// External APIs
		DrugInteractionAPIKey: getEnv("DRUG_INTERACTION_API_KEY", ""),
		FDAAPIKey:            getEnv("FDA_API_KEY", ""),
	}

	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return config, nil
}

func (c *Config) Validate() error {
	if c.Environment == "production" {
		if c.JWTSecret == "" {
			return fmt.Errorf("JWT_SECRET is required in production")
		}
		if len(c.JWTSecret) < 32 {
			return fmt.Errorf("JWT_SECRET must be at least 32 characters in production")
		}
		if c.EncryptionKey == "" {
			return fmt.Errorf("ENCRYPTION_KEY is required in production")
		}
		if len(c.EncryptionKey) != 32 {
			return fmt.Errorf("ENCRYPTION_KEY must be exactly 32 characters")
		}
		if c.DatabasePassword == "" {
			return fmt.Errorf("DB_PASSWORD is required in production")
		}
		if c.DatabaseSSLMode == "disable" {
			return fmt.Errorf("SSL must be enabled in production")
		}
	}

	if c.BCryptCost < 10 || c.BCryptCost > 15 {
		return fmt.Errorf("BCRYPT_COST must be between 10 and 15")
	}

	if c.JWTExpirationHours < 1 || c.JWTExpirationHours > 168 { // Max 1 week
		return fmt.Errorf("JWT_EXPIRATION_HOURS must be between 1 and 168")
	}

	return nil
}

func (c *Config) GetDatabaseDSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}

	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DatabaseHost,
		c.DatabasePort,
		c.DatabaseUser,
		c.DatabasePassword,
		c.DatabaseName,
		c.DatabaseSSLMode,
	)
}

func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseInt(s string) int {
	value, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return value
}

func parseBool(s string) bool {
	value, err := strconv.ParseBool(s)
	if err != nil {
		return false
	}
	return value
}

func parseDuration(s string) time.Duration {
	duration, err := time.ParseDuration(s)
	if err != nil {
		return 30 * time.Second
	}
	return duration
}

func parseStringSlice(s string) []string {
	if s == "" {
		return []string{}
	}
	
	var result []string
	for _, item := range parseCommaSeparated(s) {
		if trimmed := trimSpace(item); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func parseCommaSeparated(s string) []string {
	var result []string
	current := ""
	
	for _, char := range s {
		if char == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(char)
		}
	}
	
	if current != "" {
		result = append(result, current)
	}
	
	return result
}

func trimSpace(s string) string {
	// Simple trim implementation
	start := 0
	end := len(s) - 1
	
	for start <= end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n') {
		start++
	}
	
	for end >= start && (s[end] == ' ' || s[end] == '\t' || s[end] == '\n') {
		end--
	}
	
	if start > end {
		return ""
	}
	
	return s[start : end+1]
}