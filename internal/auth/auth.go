package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"pharmacy-backend/internal/config"
	"pharmacy-backend/internal/models"
	"pharmacy-backend/internal/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAccountLocked     = errors.New("account is locked due to multiple failed login attempts")
	ErrAccountDisabled   = errors.New("account is disabled")
	ErrTokenExpired      = errors.New("token has expired")
	ErrTokenInvalid      = errors.New("token is invalid")
	ErrUserNotFound      = errors.New("user not found")
	ErrPermissionDenied  = errors.New("permission denied")
)

type AuthService struct {
	db     *gorm.DB
	redis  *redis.Client
	config *config.Config
	logger *logrus.Logger
}

type JWTClaims struct {
	UserID    uuid.UUID       `json:"user_id"`
	Username  string          `json:"username"`
	Email     string          `json:"email"`
	Role      models.UserRole `json:"role"`
	SessionID string          `json:"session_id"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginResponse struct {
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresIn    int           `json:"expires_in"`
	User         *models.User  `json:"user"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

func NewAuthService(db *gorm.DB, redis *redis.Client, config *config.Config) *AuthService {
	return &AuthService{
		db:     db,
		redis:  redis,
		config: config,
		logger: logrus.New(),
	}
}

// Login authenticates a user and returns JWT tokens
func (s *AuthService) Login(ctx context.Context, req LoginRequest, clientIP, userAgent string) (*LoginResponse, error) {
	// Input sanitization
	req.Username = utils.SanitizeInput(req.Username)
	
	// Find user by username or email
	var user models.User
	if err := s.db.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logFailedLogin(req.Username, clientIP, "user not found")
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if account is disabled
	if !user.IsActive {
		s.logFailedLogin(req.Username, clientIP, "account disabled")
		return nil, ErrAccountDisabled
	}

	// Check if account is locked
	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		s.logFailedLogin(req.Username, clientIP, "account locked")
		return nil, ErrAccountLocked
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		// Increment failed login attempts
		if err := s.incrementFailedLoginAttempts(ctx, &user, clientIP); err != nil {
			s.logger.WithError(err).Error("Failed to increment login attempts")
		}
		s.logFailedLogin(req.Username, clientIP, "invalid password")
		return nil, ErrInvalidCredentials
	}

	// Reset failed login attempts on successful login
	if err := s.resetFailedLoginAttempts(ctx, &user); err != nil {
		s.logger.WithError(err).Error("Failed to reset login attempts")
	}

	// Generate tokens
	accessToken, refreshToken, expiresIn, err := s.generateTokens(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Update last login time
	user.LastLoginAt = &time.Time{}
	*user.LastLoginAt = time.Now()
	if err := s.db.Save(&user).Error; err != nil {
		s.logger.WithError(err).Error("Failed to update last login time")
	}

	// Log successful login
	s.logSuccessfulLogin(user.Username, clientIP, userAgent)

	// Remove password hash from response
	user.PasswordHash = ""

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
		User:         &user,
	}, nil
}

// Logout invalidates the user's tokens
func (s *AuthService) Logout(ctx context.Context, userID uuid.UUID, sessionID string) error {
	// Add tokens to blacklist
	key := fmt.Sprintf("blacklist:session:%s", sessionID)
	expiration := time.Duration(s.config.Security.JWTExpirationHours) * time.Hour
	
	if err := s.redis.Set(ctx, key, "1", expiration).Err(); err != nil {
		return fmt.Errorf("failed to blacklist session: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"session_id": sessionID,
	}).Info("User logged out")

	return nil
}

// RefreshToken generates new access token using refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	claims, err := s.validateToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Check if session is blacklisted
	if blacklisted, err := s.isSessionBlacklisted(ctx, claims.SessionID); err != nil {
		return nil, fmt.Errorf("failed to check blacklist: %w", err)
	} else if blacklisted {
		return nil, ErrTokenInvalid
	}

	// Get user
	var user models.User
	if err := s.db.First(&user, claims.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if user is still active
	if !user.IsActive {
		return nil, ErrAccountDisabled
	}

	// Generate new tokens
	accessToken, newRefreshToken, expiresIn, err := s.generateTokens(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Blacklist old refresh token
	key := fmt.Sprintf("blacklist:session:%s", claims.SessionID)
	expiration := time.Duration(s.config.Security.JWTExpirationHours) * time.Hour
	if err := s.redis.Set(ctx, key, "1", expiration).Err(); err != nil {
		s.logger.WithError(err).Error("Failed to blacklist old refresh token")
	}

	// Remove password hash from response
	user.PasswordHash = ""

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    expiresIn,
		User:         &user,
	}, nil
}

// ValidateToken validates and parses a JWT token
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	return s.validateToken(tokenString)
}

// ChangePassword changes a user's password
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, req ChangePasswordRequest) error {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), s.config.Security.BCryptCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	user.PasswordHash = string(hashedPassword)
	if err := s.db.Save(&user).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	s.logger.WithField("user_id", userID).Info("Password changed successfully")
	return nil
}

// CheckPermission checks if user has required permission for a resource
func (s *AuthService) CheckPermission(userRole models.UserRole, resource string, action string) bool {
	// Define role-based permissions
	permissions := map[models.UserRole]map[string][]string{
		models.RoleAdmin: {
			"users":     {"create", "read", "update", "delete"},
			"customers": {"create", "read", "update", "delete"},
			"products":  {"create", "read", "update", "delete"},
			"sales":     {"create", "read", "update", "delete", "refund"},
			"analytics": {"read"},
			"audit":     {"read"},
		},
		models.RoleManager: {
			"users":     {"read", "update"},
			"customers": {"create", "read", "update", "delete"},
			"products":  {"create", "read", "update", "delete"},
			"sales":     {"create", "read", "update", "refund"},
			"analytics": {"read"},
		},
		models.RolePharmacist: {
			"customers": {"create", "read", "update"},
			"products":  {"read", "update"},
			"sales":     {"create", "read"},
			"analytics": {"read"},
		},
		models.RoleAssistant: {
			"customers": {"read"},
			"products":  {"read"},
			"sales":     {"read"},
		},
	}

	if rolePerms, exists := permissions[userRole]; exists {
		if resourcePerms, exists := rolePerms[resource]; exists {
			for _, perm := range resourcePerms {
				if perm == action {
					return true
				}
			}
		}
	}

	return false
}

// Private methods

func (s *AuthService) generateTokens(user *models.User) (accessToken, refreshToken string, expiresIn int, err error) {
	sessionID := uuid.New().String()
	now := time.Now()
	expiresIn = s.config.Security.JWTExpirationHours * 3600

	// Access token claims
	accessClaims := JWTClaims{
		UserID:    user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.config.Security.JWTExpirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "pharmacy-backend",
			Subject:   user.ID.String(),
		},
	}

	// Generate access token
	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err = accessTokenObj.SignedString([]byte(s.config.Security.JWTSecret))
	if err != nil {
		return "", "", 0, err
	}

	// Refresh token claims (longer expiration)
	refreshClaims := JWTClaims{
		UserID:    user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.config.Security.JWTExpirationHours*7) * time.Hour)), // 7x longer
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "pharmacy-backend",
			Subject:   user.ID.String(),
		},
	}

	// Generate refresh token
	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = refreshTokenObj.SignedString([]byte(s.config.Security.JWTSecret))
	if err != nil {
		return "", "", 0, err
	}

	return accessToken, refreshToken, expiresIn, nil
}

func (s *AuthService) validateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.Security.JWTSecret), nil
	})

	if err != nil {
		return nil, ErrTokenInvalid
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}

	if claims.ExpiresAt.Before(time.Now()) {
		return nil, ErrTokenExpired
	}

	return claims, nil
}

func (s *AuthService) incrementFailedLoginAttempts(ctx context.Context, user *models.User, clientIP string) error {
	user.FailedLoginAttempts++

	// Lock account if too many failed attempts
	if user.FailedLoginAttempts >= s.config.Security.MaxLoginAttempts {
		lockDuration := time.Duration(s.config.Security.LoginLockoutMinutes) * time.Minute
		lockUntil := time.Now().Add(lockDuration)
		user.LockedUntil = &lockUntil

		s.logger.WithFields(logrus.Fields{
			"username":     user.Username,
			"client_ip":    clientIP,
			"lock_until":   lockUntil,
			"failed_attempts": user.FailedLoginAttempts,
		}).Warn("Account locked due to multiple failed login attempts")
	}

	return s.db.Save(user).Error
}

func (s *AuthService) resetFailedLoginAttempts(ctx context.Context, user *models.User) error {
	user.FailedLoginAttempts = 0
	user.LockedUntil = nil
	return s.db.Save(user).Error
}

func (s *AuthService) isSessionBlacklisted(ctx context.Context, sessionID string) (bool, error) {
	key := fmt.Sprintf("blacklist:session:%s", sessionID)
	result, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return false, nil
		}
		return false, err
	}
	return result == "1", nil
}

func (s *AuthService) logSuccessfulLogin(username, clientIP, userAgent string) {
	s.logger.WithFields(logrus.Fields{
		"username":   username,
		"client_ip":  clientIP,
		"user_agent": userAgent,
		"event":      "login_success",
	}).Info("Successful login")
}

func (s *AuthService) logFailedLogin(username, clientIP, reason string) {
	s.logger.WithFields(logrus.Fields{
		"username":  username,
		"client_ip": clientIP,
		"reason":    reason,
		"event":     "login_failed",
	}).Warn("Failed login attempt")
}