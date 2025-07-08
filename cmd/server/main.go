package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pharmacy-backend/internal/api"
	"pharmacy-backend/internal/auth"
	"pharmacy-backend/internal/config"
	"pharmacy-backend/internal/database"
	"pharmacy-backend/internal/middleware"
	"pharmacy-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Initialize logger
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.WithError(err).Fatal("Failed to load configuration")
	}

	// Set log level based on environment
	if cfg.IsDevelopment() {
		logger.SetLevel(logrus.DebugLevel)
		gin.SetMode(gin.DebugMode)
	} else {
		logger.SetLevel(logrus.InfoLevel)
		gin.SetMode(gin.ReleaseMode)
	}

	logger.WithField("environment", cfg.Environment).Info("Starting pharmacy backend server")

	// Initialize encryption
	if err := utils.InitializeEncryption(cfg.EncryptionKey); err != nil {
		logger.WithError(err).Fatal("Failed to initialize encryption")
	}

	// Connect to PostgreSQL
	db, err := connectDatabase(cfg, logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to connect to database")
	}

	// Run database migrations
	if err := database.Migrate(db); err != nil {
		logger.WithError(err).Fatal("Failed to run database migrations")
	}

	// Connect to Redis
	redisClient := connectRedis(cfg, logger)

	// Initialize services
	authService := auth.NewAuthService(db, redisClient, cfg)

	// Initialize middleware
	securityMiddleware := middleware.NewSecurityMiddleware(authService, db, redisClient, cfg)

	// Initialize API handlers
	apiHandlers := api.NewHandlers(db, redisClient, cfg, authService)

	// Setup router
	router := setupRouter(securityMiddleware, apiHandlers)

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	// Start server in a goroutine
	go func() {
		logger.WithField("port", cfg.Port).Info("Starting HTTP server")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Failed to start server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.WithError(err).Fatal("Server forced to shutdown")
	}

	logger.Info("Server exited")
}

func connectDatabase(cfg *config.Config, logger *logrus.Logger) (*gorm.DB, error) {
	// Configure GORM logger
	gormLogger := logger.New()
	if cfg.IsDevelopment() {
		gormLogger.SetLevel(logger.Info)
	} else {
		gormLogger.SetLevel(logger.Warn)
	}

	// Open database connection
	db, err := gorm.Open(postgres.Open(cfg.GetDatabaseDSN()), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB to configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Test the connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Successfully connected to PostgreSQL database")
	return db, nil
}

func connectRedis(cfg *config.Config, logger *logrus.Logger) *redis.Client {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		logger.WithError(err).Fatal("Failed to parse Redis URL")
	}

	if cfg.RedisPassword != "" {
		opts.Password = cfg.RedisPassword
	}
	opts.DB = cfg.RedisDB

	client := redis.NewClient(opts)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		logger.WithError(err).Fatal("Failed to connect to Redis")
	}

	logger.Info("Successfully connected to Redis")
	return client
}

func setupRouter(middleware *middleware.SecurityMiddleware, handlers *api.Handlers) *gin.Engine {
	router := gin.New()

	// Apply global middleware
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.CORS())
	router.Use(middleware.RateLimit())
	router.Use(middleware.ValidateJSON())
	router.Use(middleware.HIPAACompliance())
	router.Use(middleware.AuditLog())

	// Health check endpoint (no auth required)
	router.GET("/health", handlers.HealthCheck)
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Pharmacy Management System API",
			"version": "1.0.0",
			"status":  "healthy",
		})
	})

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Authentication routes (no auth required)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh", handlers.RefreshToken)
			auth.POST("/logout", middleware.Auth(), handlers.Logout)
			auth.POST("/change-password", middleware.Auth(), handlers.ChangePassword)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.Auth())
		{
			// User management (admin only)
			users := protected.Group("/users")
			users.Use(middleware.AdminOnly())
			{
				users.GET("", handlers.GetUsers)
				users.POST("", handlers.CreateUser)
				users.GET("/:id", handlers.GetUser)
				users.PUT("/:id", handlers.UpdateUser)
				users.DELETE("/:id", handlers.DeleteUser)
			}

			// Customer management
			customers := protected.Group("/customers")
			{
				customers.GET("", middleware.RequirePermission("customers", "read"), handlers.GetCustomers)
				customers.POST("", middleware.RequirePermission("customers", "create"), handlers.CreateCustomer)
				customers.GET("/:id", middleware.RequirePermission("customers", "read"), handlers.GetCustomer)
				customers.PUT("/:id", middleware.RequirePermission("customers", "update"), handlers.UpdateCustomer)
				customers.DELETE("/:id", middleware.RequirePermission("customers", "delete"), handlers.DeleteCustomer)
				customers.GET("/:id/history", middleware.RequirePermission("customers", "read"), handlers.GetCustomerPurchaseHistory)
				customers.GET("/:id/interactions/:medication", middleware.RequirePermission("customers", "read"), handlers.CheckMedicationInteractions)
			}

			// Product/Inventory management
			products := protected.Group("/products")
			{
				products.GET("", middleware.RequirePermission("products", "read"), handlers.GetProducts)
				products.POST("", middleware.RequirePermission("products", "create"), handlers.CreateProduct)
				products.GET("/:id", middleware.RequirePermission("products", "read"), handlers.GetProduct)
				products.PUT("/:id", middleware.RequirePermission("products", "update"), handlers.UpdateProduct)
				products.DELETE("/:id", middleware.RequirePermission("products", "delete"), handlers.DeleteProduct)
				products.POST("/:id/stock", middleware.RequirePermission("products", "update"), handlers.UpdateStock)
				products.GET("/low-stock", middleware.RequirePermission("products", "read"), handlers.GetLowStockProducts)
				products.GET("/expiring", middleware.RequirePermission("products", "read"), handlers.GetExpiringProducts)
			}

			// Sales management
			sales := protected.Group("/sales")
			{
				sales.GET("", middleware.RequirePermission("sales", "read"), handlers.GetSales)
				sales.POST("", middleware.RequirePermission("sales", "create"), handlers.CreateSale)
				sales.GET("/:id", middleware.RequirePermission("sales", "read"), handlers.GetSale)
				sales.POST("/:id/refund", middleware.RequirePermission("sales", "refund"), handlers.RefundSale)
				sales.GET("/reports/daily", middleware.RequirePermission("sales", "read"), handlers.GetDailySalesReport)
				sales.GET("/reports/summary", middleware.RequirePermission("sales", "read"), handlers.GetSalesSummary)
			}

			// Analytics
			analytics := protected.Group("/analytics")
			analytics.Use(middleware.RequirePermission("analytics", "read"))
			{
				analytics.GET("/dashboard", handlers.GetDashboardAnalytics)
				analytics.GET("/inventory-movement", handlers.GetInventoryMovementAnalysis)
				analytics.GET("/sales", handlers.GetSalesAnalytics)
				analytics.GET("/customers", handlers.GetCustomerAnalytics)
			}

			// Audit logs (admin only)
			audit := protected.Group("/audit")
			audit.Use(middleware.AdminOnly())
			{
				audit.GET("/logs", handlers.GetAuditLogs)
			}
		}
	}

	return router
}