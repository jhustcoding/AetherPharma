package main

import (
	"context"
	"fmt"
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
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func main() {
	// Initialize logger
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	
	// Load configuration
	cfg, err := config.LoadConfig()
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
	if err := utils.InitializeEncryption(cfg.Security.EncryptionKey); err != nil {
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

	// Create default admin user
	if err := database.CreateDefaultAdmin(db); err != nil {
		logger.WithError(err).Fatal("Failed to create default admin user")
	}

	// Seed sample data in development
	if cfg.IsDevelopment() {
		if err := database.SeedSampleData(db); err != nil {
			logger.WithError(err).Warn("Failed to seed sample data")
		}
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
	// Bind to all interfaces if host is empty or localhost
	host := cfg.Server.Host
	if host == "" || host == "localhost" {
		host = "0.0.0.0"
	}
	addr := host + ":" + cfg.Server.Port
	
	server := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.WithFields(logrus.Fields{
			"address": addr,
			"host": host,
			"port": cfg.Server.Port,
		}).Info("Starting HTTP server")
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
	var gormLogger gormlogger.Interface
	if cfg.IsDevelopment() {
		gormLogger = gormlogger.Default.LogMode(gormlogger.Info)
	} else {
		gormLogger = gormlogger.Default.LogMode(gormlogger.Warn)
	}

	var db *gorm.DB
	var err error

	// Use SQLite for development if PostgreSQL is not available
	if cfg.IsDevelopment() && (cfg.Database.Host == "localhost" || cfg.Database.Host == "") {
		// Try SQLite for local development
		db, err = gorm.Open(sqlite.Open("pharmacy.db"), &gorm.Config{
			Logger: gormLogger,
			NowFunc: func() time.Time {
				return time.Now().UTC()
			},
		})
		if err == nil {
			logger.Info("Successfully connected to SQLite database")
			return db, nil
		}
		logger.WithError(err).Warn("Failed to connect to SQLite, trying PostgreSQL")
	}

	// Open PostgreSQL database connection
	db, err = gorm.Open(postgres.Open(cfg.GetPrimaryDSN()), &gorm.Config{
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
	// Build Redis URL
	redisURL := fmt.Sprintf("redis://%s:%s/%d", cfg.Redis.Host, cfg.Redis.Port, cfg.Redis.DB)
	
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		logger.WithError(err).Fatal("Failed to parse Redis URL")
	}

	if cfg.Redis.Password != "" {
		opts.Password = cfg.Redis.Password
	}

	client := redis.NewClient(opts)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		if cfg.IsDevelopment() {
			logger.WithError(err).Warn("Failed to connect to Redis (development mode, continuing without Redis)")
			return nil
		}
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
			auth.POST("/create-test-user", handlers.CreateTestUser) // Development only
		}

		// QR Code routes (some public for scanning)
		qr := v1.Group("/qr")
		{
			// Public QR scanning (no auth required for mobile apps)
			qr.POST("/scan", handlers.ScanQR)
			qr.GET("/track/:number", handlers.TrackOrder) // Public order tracking
			
			// Protected QR operations
			qr.POST("/products/:id/generate", middleware.Auth(), middleware.RequirePermission("products", "update"), handlers.GenerateProductQR)
			qr.POST("/customers/:id/generate", middleware.Auth(), middleware.RequirePermission("customers", "update"), handlers.GenerateCustomerQR)
			qr.GET("/scan-history", middleware.Auth(), middleware.AdminOnly(), handlers.GetQRScanHistory)
		}

		// Shopping Cart routes (supports both auth and guest users)
		cart := v1.Group("/cart")
		{
			cart.POST("/add", handlers.AddToCart)           // Auth optional
			cart.GET("", handlers.GetCart)                  // Auth optional
			cart.PUT("/:id", handlers.UpdateCartItem)       // Auth optional
			cart.DELETE("/:id", handlers.RemoveFromCart)    // Auth optional
			cart.DELETE("", handlers.ClearCart)             // Auth optional
		}

		// Public Products browsing (for ordering system)
		v1.GET("/products/browse", handlers.GetProducts) // Public product browsing

		// Online Orders routes
		orders := v1.Group("/orders")
		{
			// Public order creation and tracking
			orders.POST("", handlers.CreateOnlineOrder)                    // Auth optional (guest orders)
			orders.GET("/track/:number", handlers.TrackOrder)              // Public tracking
			orders.GET("/number/:number", handlers.GetOnlineOrderByNumber) // Public lookup
			
			// Protected order management
			protected := orders.Group("")
			protected.Use(middleware.Auth())
			{
				protected.GET("", handlers.GetOnlineOrders)                              // List orders
				protected.GET("/:id", handlers.GetOnlineOrder)                          // Get specific order
				protected.PUT("/:id/status", middleware.RequirePermission("sales", "update"), handlers.UpdateOrderStatus) // Update status
				protected.GET("/customer/:customer_id", middleware.RequirePermission("customers", "read"), handlers.GetCustomerOnlineOrders) // Customer orders
			}
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.Auth())
		{
			// Test endpoint for debugging auth issues
			protected.GET("/test", handlers.TestEndpoint)
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
				customers.POST("/:id/upload-id", middleware.RequirePermission("customers", "update"), handlers.UploadCustomerID)
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

			// Supplier management
			suppliers := protected.Group("/suppliers")
			{
				suppliers.GET("", middleware.RequirePermission("products", "read"), handlers.GetSuppliers)
				suppliers.POST("", middleware.RequirePermission("products", "create"), handlers.CreateSupplier)
				suppliers.GET("/:id", middleware.RequirePermission("products", "read"), handlers.GetSupplier)
				suppliers.PUT("/:id", middleware.RequirePermission("products", "update"), handlers.UpdateSupplier)
				suppliers.DELETE("/:id", middleware.RequirePermission("products", "delete"), handlers.DeleteSupplier)
			}

			// Service management (medical services)
			services := protected.Group("/services")
			{
				services.GET("", middleware.RequirePermission("products", "read"), handlers.GetServices)
				services.POST("", middleware.RequirePermission("products", "create"), handlers.CreateService)
				services.GET("/:id", middleware.RequirePermission("products", "read"), handlers.GetService)
				services.PUT("/:id", middleware.RequirePermission("products", "update"), handlers.UpdateService)
				services.DELETE("/:id", middleware.RequirePermission("products", "delete"), handlers.DeleteService)
				services.GET("/categories", middleware.RequirePermission("products", "read"), handlers.GetServiceCategories)
			}

			// Sales management (POS sales)
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
				analytics.GET("/discounts", handlers.GetDiscountAnalytics)
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