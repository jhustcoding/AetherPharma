package api

import (
	"net/http"
	"strconv"
	"time"

	"pharmacy-backend/internal/auth"
	"pharmacy-backend/internal/config"
	"pharmacy-backend/internal/middleware"
	"pharmacy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Handlers struct {
	db          *gorm.DB
	redis       *redis.Client
	config      *config.Config
	authService *auth.AuthService
}

func NewHandlers(db *gorm.DB, redis *redis.Client, config *config.Config, authService *auth.AuthService) *Handlers {
	return &Handlers{
		db:          db,
		redis:       redis,
		config:      config,
		authService: authService,
	}
}

// Health check
func (h *Handlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"timestamp": time.Now().UTC(),
	})
}

// Authentication handlers
func (h *Handlers) Login(c *gin.Context) {
	var req auth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Login(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		status := http.StatusUnauthorized
		if err == auth.ErrAccountLocked {
			status = http.StatusLocked
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handlers) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handlers) Logout(c *gin.Context) {
	claims, _ := c.Get("claims")
	jwtClaims := claims.(*auth.JWTClaims)

	err := h.authService.Logout(c.Request.Context(), jwtClaims.UserID, jwtClaims.SessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
}

func (h *Handlers) ChangePassword(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	
	var req auth.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.ChangePassword(c.Request.Context(), user.ID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// Customer handlers
func (h *Handlers) GetCustomers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	
	offset := (page - 1) * limit
	
	var customers []models.Customer
	query := h.db.Model(&models.Customer{})
	
	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	
	var total int64
	query.Count(&total)
	
	err := query.Offset(offset).Limit(limit).Find(&customers).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers"})
		return
	}
	
	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	c.JSON(http.StatusOK, gin.H{
		"customers": customers,
		"total": total,
		"page": page,
		"limit": limit,
	})
}

func (h *Handlers) CreateCustomer(c *gin.Context) {
	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	customer.CreatedBy = &user.ID
	
	if err := h.db.Create(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
		return
	}

	c.JSON(http.StatusCreated, customer)
}

func (h *Handlers) GetCustomer(c *gin.Context) {
	id := c.Param("id")
	
	var customer models.Customer
	if err := h.db.Preload("Sales").Preload("PurchaseHistory").First(&customer, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customer"})
		return
	}

	c.JSON(http.StatusOK, customer)
}

func (h *Handlers) UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	
	var customer models.Customer
	if err := h.db.First(&customer, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customer"})
		return
	}

	if err := c.ShouldBindJSON(&customer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	customer.UpdatedBy = &user.ID

	if err := h.db.Save(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update customer"})
		return
	}

	c.JSON(http.StatusOK, customer)
}

func (h *Handlers) DeleteCustomer(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Delete(&models.Customer{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete customer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Customer deleted successfully"})
}

// Product handlers
func (h *Handlers) GetProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	category := c.Query("category")
	
	offset := (page - 1) * limit
	
	var products []models.Product
	query := h.db.Model(&models.Product{}).Where("is_active = ?", true)
	
	if search != "" {
		query = query.Where("name ILIKE ? OR sku ILIKE ? OR generic_name ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	
	if category != "" {
		query = query.Where("category = ?", category)
	}
	
	var total int64
	query.Count(&total)
	
	err := query.Offset(offset).Limit(limit).Find(&products).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}
	
	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total": total,
		"page": page,
		"limit": limit,
	})
}

func (h *Handlers) CreateProduct(c *gin.Context) {
	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	product.CreatedBy = &user.ID
	
	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, product)
}

func (h *Handlers) GetProduct(c *gin.Context) {
	id := c.Param("id")
	
	var product models.Product
	if err := h.db.First(&product, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch product"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (h *Handlers) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	
	var product models.Product
	if err := h.db.First(&product, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch product"})
		return
	}

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	product.UpdatedBy = &user.ID

	if err := h.db.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (h *Handlers) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Delete(&models.Product{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

func (h *Handlers) GetLowStockProducts(c *gin.Context) {
	var products []models.Product
	if err := h.db.Where("stock <= min_stock AND is_active = ?", true).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch low stock products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"products": products})
}

func (h *Handlers) GetExpiringProducts(c *gin.Context) {
	thirtyDaysFromNow := time.Now().AddDate(0, 0, 30)
	
	var products []models.Product
	if err := h.db.Where("expiry_date <= ? AND is_active = ?", thirtyDaysFromNow, true).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expiring products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"products": products})
}

// Sales handlers
func (h *Handlers) GetSales(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	offset := (page - 1) * limit
	
	var sales []models.Sale
	var total int64
	
	h.db.Model(&models.Sale{}).Count(&total)
	
	err := h.db.Preload("Customer").Preload("SaleItems.Product").Preload("Pharmacist").
		Offset(offset).Limit(limit).Order("created_at DESC").Find(&sales).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sales"})
		return
	}
	
	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	c.JSON(http.StatusOK, gin.H{
		"sales": sales,
		"total": total,
		"page": page,
		"limit": limit,
	})
}

func (h *Handlers) CreateSale(c *gin.Context) {
	var sale models.Sale
	if err := c.ShouldBindJSON(&sale); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	sale.PharmacistID = &user.ID
	sale.CreatedBy = &user.ID
	
	// Generate sale number
	sale.SaleNumber = "SALE-" + time.Now().Format("20060102") + "-" + uuid.New().String()[:8]

	if err := h.db.Create(&sale).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sale"})
		return
	}

	c.JSON(http.StatusCreated, sale)
}

func (h *Handlers) GetSale(c *gin.Context) {
	id := c.Param("id")
	
	var sale models.Sale
	if err := h.db.Preload("Customer").Preload("SaleItems.Product").Preload("Pharmacist").
		First(&sale, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sale"})
		return
	}

	c.JSON(http.StatusOK, sale)
}

// Analytics handlers
func (h *Handlers) GetDashboardAnalytics(c *gin.Context) {
	var totalSales float64
	var totalCustomers int64
	var totalProducts int64
	var lowStockCount int64

	// Get today's sales
	today := time.Now().Format("2006-01-02")
	h.db.Model(&models.Sale{}).Where("DATE(created_at) = ?", today).Select("COALESCE(SUM(total), 0)").Scan(&totalSales)
	
	// Get counts
	h.db.Model(&models.Customer{}).Count(&totalCustomers)
	h.db.Model(&models.Product{}).Where("is_active = ?", true).Count(&totalProducts)
	h.db.Model(&models.Product{}).Where("stock <= min_stock AND is_active = ?", true).Count(&lowStockCount)

	c.JSON(http.StatusOK, gin.H{
		"today_sales": totalSales,
		"total_customers": totalCustomers,
		"total_products": totalProducts,
		"low_stock_alerts": lowStockCount,
	})
}

// User management handlers (placeholder)
func (h *Handlers) GetUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Select("id, username, email, first_name, last_name, role, is_active, created_at").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func (h *Handlers) CreateUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) UpdateUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) DeleteUser(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

// Placeholder handlers for other endpoints
func (h *Handlers) GetCustomerPurchaseHistory(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) CheckMedicationInteractions(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) UpdateStock(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) RefundSale(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetDailySalesReport(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetSalesSummary(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetInventoryMovementAnalysis(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetSalesAnalytics(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetCustomerAnalytics(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetAuditLogs(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}