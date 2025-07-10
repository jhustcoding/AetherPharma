package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"pharmacy-backend/internal/auth"
	"pharmacy-backend/internal/config"
	"pharmacy-backend/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/secure"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

const (
	UserContextKey = "user"
	RequestIDKey   = "request_id"
)

type SecurityMiddleware struct {
	authService *auth.AuthService
	db          *gorm.DB
	redis       *redis.Client
	config      *config.Config
	logger      *logrus.Logger
	limiter     *rate.Limiter
}

func NewSecurityMiddleware(authService *auth.AuthService, db *gorm.DB, redis *redis.Client, config *config.Config) *SecurityMiddleware {
	// Create rate limiter
	limiter := rate.NewLimiter(rate.Limit(config.RateLimitRPS), config.RateLimitBurst)

	return &SecurityMiddleware{
		authService: authService,
		db:          db,
		redis:       redis,
		config:      config,
		logger:      logrus.New(),
		limiter:     limiter,
	}
}

// RequestID middleware adds a unique request ID to each request
func (m *SecurityMiddleware) RequestID() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		requestID := uuid.New().String()
		c.Set(RequestIDKey, requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	})
}

// Logger middleware with structured logging
func (m *SecurityMiddleware) Logger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		requestID, _ := param.Keys[RequestIDKey].(string)
		
		m.logger.WithFields(logrus.Fields{
			"request_id":   requestID,
			"timestamp":    param.TimeStamp.Format(time.RFC3339),
			"status":       param.StatusCode,
			"latency":      param.Latency.String(),
			"client_ip":    param.ClientIP,
			"method":       param.Method,
			"path":         param.Path,
			"user_agent":   param.Request.UserAgent(),
			"response_size": param.BodySize,
		}).Info("HTTP Request")

		return ""
	})
}

// Recovery middleware with detailed error logging
func (m *SecurityMiddleware) Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		requestID, _ := c.Get(RequestIDKey)
		
		m.logger.WithFields(logrus.Fields{
			"request_id": requestID,
			"panic":      recovered,
			"path":       c.Request.URL.Path,
			"method":     c.Request.Method,
			"client_ip":  c.ClientIP(),
		}).Error("Panic recovered")

		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error":      "Internal server error",
			"request_id": requestID,
		})
	})
}

// CORS middleware with secure configuration
func (m *SecurityMiddleware) CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = m.config.AllowedOrigins
	config.AllowMethods = m.config.AllowedMethods
	config.AllowHeaders = m.config.AllowedHeaders
	config.AllowCredentials = true
	config.ExposeHeaders = []string{"X-Request-ID", "X-Total-Count"}
	config.MaxAge = 12 * time.Hour

	return cors.New(config)
}

// Security headers middleware
func (m *SecurityMiddleware) SecurityHeaders() gin.HandlerFunc {
	secureConfig := secure.DefaultConfig()
	secureConfig.SSLRedirect = m.config.IsProduction()
	secureConfig.STSSeconds = 31536000
	secureConfig.STSIncludeSubdomains = true
	secureConfig.FrameDeny = true
	secureConfig.ContentTypeNosniff = true
	secureConfig.BrowserXssFilter = true
	secureConfig.ContentSecurityPolicy = "default-src 'self'"
	secureConfig.ReferrerPolicy = "strict-origin-when-cross-origin"

	return secure.New(secureConfig)
}

// Rate limiting middleware
func (m *SecurityMiddleware) RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create per-IP rate limiter
		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", clientIP)
		
		// Check Redis for rate limit data
		ctx := context.Background()
		
		// Get current count
		current, err := m.redis.Get(ctx, key).Int()
		if err != nil && err != redis.Nil {
			m.logger.WithError(err).Error("Failed to get rate limit data")
			c.Next()
			return
		}

		// Check if limit exceeded
		if current >= m.config.RateLimitRPS {
			remaining := m.config.RateLimitRPS - current
			if remaining < 0 {
				remaining = 0
			}

			c.Header("X-RateLimit-Limit", strconv.Itoa(m.config.RateLimitRPS))
			c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))

			m.auditLog(c, "rate_limit_exceeded", "rate_limit", "", false, "Rate limit exceeded")

			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"retry_after": 60,
			})
			return
		}

		// Increment counter
		pipe := m.redis.Pipeline()
		pipe.Incr(ctx, key)
		pipe.Expire(ctx, key, time.Minute)
		if _, err := pipe.Exec(ctx); err != nil {
			m.logger.WithError(err).Error("Failed to update rate limit data")
		}

		// Set rate limit headers
		remaining := m.config.RateLimitRPS - current - 1
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(m.config.RateLimitRPS))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))

		c.Next()
	}
}

// Authentication middleware
func (m *SecurityMiddleware) Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			return
		}

		// Extract token from Bearer header
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			return
		}

		token := parts[1]
		claims, err := m.authService.ValidateToken(token)
		if err != nil {
			m.auditLog(c, "authentication_failed", "auth", "", false, err.Error())
			
			status := http.StatusUnauthorized
			message := "Invalid token"
			
			if err == auth.ErrTokenExpired {
				message = "Token expired"
			}

			c.AbortWithStatusJSON(status, gin.H{
				"error": message,
			})
			return
		}

		// Check if session is blacklisted
		ctx := context.Background()
		key := fmt.Sprintf("blacklist:session:%s", claims.SessionID)
		if blacklisted, err := m.redis.Get(ctx, key).Result(); err == nil && blacklisted == "1" {
			m.auditLog(c, "blacklisted_token", "auth", claims.UserID.String(), false, "Blacklisted token used")
			
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Token has been revoked",
			})
			return
		}

		// Get user details
		var user models.User
		if err := m.db.First(&user, claims.UserID).Error; err != nil {
			m.auditLog(c, "user_not_found", "auth", claims.UserID.String(), false, "User not found")
			
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "User not found",
			})
			return
		}

		// Check if user is active
		if !user.IsActive {
			m.auditLog(c, "inactive_user", "auth", user.ID.String(), false, "Inactive user attempted access")
			
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Account is disabled",
			})
			return
		}

		// Set user in context
		c.Set(UserContextKey, &user)
		c.Set("claims", claims)

		c.Next()
	}
}

// Authorization middleware
func (m *SecurityMiddleware) RequirePermission(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			return
		}

		userModel := user.(*models.User)
		
		if !m.authService.CheckPermission(userModel.Role, resource, action) {
			m.auditLog(c, "permission_denied", resource, userModel.ID.String(), false, 
				fmt.Sprintf("User %s attempted %s on %s", userModel.Username, action, resource))
			
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
			})
			return
		}

		c.Next()
	}
}

// Admin only middleware
func (m *SecurityMiddleware) AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			return
		}

		userModel := user.(*models.User)
		
		if userModel.Role != models.RoleAdmin {
			m.auditLog(c, "admin_access_denied", "admin", userModel.ID.String(), false, 
				fmt.Sprintf("Non-admin user %s attempted admin access", userModel.Username))
			
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			return
		}

		c.Next()
	}
}

// HIPAA compliance middleware
func (m *SecurityMiddleware) HIPAACompliance() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !m.config.HIPAAMode {
			c.Next()
			return
		}

		// Add HIPAA-specific headers
		c.Header("X-HIPAA-Compliant", "true")
		c.Header("X-Data-Classification", "PHI")

		// Log access to medical data
		if m.containsMedicalData(c.Request.URL.Path) {
			user, exists := c.Get(UserContextKey)
			userID := ""
			if exists {
				userID = user.(*models.User).ID.String()
			}

			m.auditLog(c, "medical_data_access", "medical_data", userID, true, 
				fmt.Sprintf("Access to medical data endpoint: %s", c.Request.URL.Path))
		}

		c.Next()
	}
}

// Audit logging middleware
func (m *SecurityMiddleware) AuditLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !m.config.AuditLogging {
			c.Next()
			return
		}

		start := time.Now()
		
		c.Next()
		
		duration := time.Since(start)
		
		// Log significant operations
		if m.isSignificantOperation(c.Request.Method, c.Request.URL.Path) {
			user, exists := c.Get(UserContextKey)
			userID := ""
			if exists {
				userID = user.(*models.User).ID.String()
			}

			action := fmt.Sprintf("%s %s", c.Request.Method, c.Request.URL.Path)
			resource := m.extractResource(c.Request.URL.Path)
			
			m.auditLog(c, action, resource, userID, c.Writer.Status() < 400, "")
		}
	}
}

// Input validation middleware
func (m *SecurityMiddleware) ValidateJSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			contentType := c.GetHeader("Content-Type")
			if strings.Contains(contentType, "application/json") {
				// Limit request body size (10MB)
				c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20)
			}
		}
		c.Next()
	}
}

// Helper methods

func (m *SecurityMiddleware) auditLog(c *gin.Context, action, resource, userID string, success bool, errorMessage string) {
	requestID, _ := c.Get(RequestIDKey)
	
	auditLog := models.AuditLog{
		UserID:      parseUUID(userID),
		Action:      action,
		Resource:    resource,
		ResourceID:  nil, // Could be extracted from URL
		IPAddress:   c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
		RequestID:   requestID.(*string),
		Success:     success,
		ErrorMessage: &errorMessage,
	}

	if err := m.db.Create(&auditLog).Error; err != nil {
		m.logger.WithError(err).Error("Failed to create audit log")
	}
}

func (m *SecurityMiddleware) containsMedicalData(path string) bool {
	medicalPaths := []string{
		"/api/customers",
		"/api/prescriptions",
		"/api/medical-records",
	}
	
	for _, medicalPath := range medicalPaths {
		if strings.Contains(path, medicalPath) {
			return true
		}
	}
	return false
}

func (m *SecurityMiddleware) isSignificantOperation(method, path string) bool {
	// Log all write operations and sensitive read operations
	if method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" {
		return true
	}
	
	sensitiveEndpoints := []string{
		"/api/customers",
		"/api/sales",
		"/api/products",
		"/api/users",
		"/api/analytics",
	}
	
	for _, endpoint := range sensitiveEndpoints {
		if strings.Contains(path, endpoint) {
			return true
		}
	}
	
	return false
}

func (m *SecurityMiddleware) extractResource(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) >= 3 && parts[1] == "api" {
		return parts[2]
	}
	return "unknown"
}

func parseUUID(s string) *uuid.UUID {
	if s == "" {
		return nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return nil
	}
	return &id
}

// GetCurrentUser extracts the current user from context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get(UserContextKey)
	if !exists {
		return nil, false
	}
	return user.(*models.User), true
}

// GetRequestID extracts the request ID from context
func GetRequestID(c *gin.Context) string {
	requestID, exists := c.Get(RequestIDKey)
	if !exists {
		return ""
	}
	return requestID.(string)
}