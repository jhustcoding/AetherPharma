package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"pharmacy-backend/internal/auth"
	"pharmacy-backend/internal/config"
	"pharmacy-backend/internal/middleware"
	"pharmacy-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"pharmacy-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Handlers struct {
	db                  *gorm.DB
	redis               *redis.Client
	config              *config.Config
	authService         *auth.AuthService
	qrService           *services.QRService
	onlineOrderService  *services.OnlineOrderService
}

func NewHandlers(db *gorm.DB, redis *redis.Client, config *config.Config, authService *auth.AuthService) *Handlers {
	h := &Handlers{
		db:          db,
		redis:       redis,
		config:      config,
		authService: authService,
	}
	
	// Initialize additional services
	h.qrService = services.NewQRService(db)
	h.onlineOrderService = services.NewOnlineOrderService(db, h.qrService)
	
	return h
}

// Health check
func (h *Handlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"timestamp": time.Now().UTC(),
	})
}

// Test endpoint for debugging
func (h *Handlers) TestEndpoint(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Test endpoint working",
		"auth": "protected route",
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
		query = query.Where("first_name LIKE ? COLLATE NOCASE OR last_name LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE", 
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
	
	err := query.Preload("Suppliers").Offset(offset).Limit(limit).Find(&products).Error
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
	// First, read the raw JSON to debug
	body, _ := c.GetRawData()
	fmt.Printf("Raw JSON received: %s\n", string(body))
	
	// Reset the body so we can read it again
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
	
	var requestData struct {
		models.Product
		SupplierIDs []string `json:"supplier_ids"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		fmt.Printf("JSON binding error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	requestData.Product.CreatedBy = &user.ID
	
	// Start transaction
	tx := h.db.Begin()
	
	// Create the product
	if err := tx.Create(&requestData.Product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}
	
	// Associate suppliers if provided
	if len(requestData.SupplierIDs) > 0 {
		for i, supplierID := range requestData.SupplierIDs {
			var supplier models.Supplier
			if err := tx.First(&supplier, "id = ?", supplierID).Error; err == nil {
				productSupplier := models.ProductSupplier{
					ProductID:  requestData.Product.ID,
					SupplierID: supplier.ID,
					IsPrimary:  i == 0, // First supplier is primary
				}
				if err := tx.Create(&productSupplier).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate suppliers"})
					return
				}
			}
		}
	}
	
	tx.Commit()
	
	// Reload with suppliers
	h.db.Preload("Suppliers").First(&requestData.Product, requestData.Product.ID)
	c.JSON(http.StatusCreated, requestData.Product)
}

func (h *Handlers) GetProduct(c *gin.Context) {
	id := c.Param("id")
	
	var product models.Product
	if err := h.db.Preload("Suppliers").First(&product, "id = ?", id).Error; err != nil {
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

	// Parse the update data including supplier IDs
	var requestData struct {
		SupplierIDs *[]string `json:"supplier_ids"`
		UpdateData  map[string]interface{} `json:"-"`
	}
	
	// First parse as raw JSON to extract everything
	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Extract supplier_ids if present
	if supplierIDs, ok := rawData["supplier_ids"].([]interface{}); ok {
		strIDs := make([]string, len(supplierIDs))
		for i, id := range supplierIDs {
			strIDs[i] = fmt.Sprintf("%v", id)
		}
		requestData.SupplierIDs = &strIDs
		delete(rawData, "supplier_ids") // Remove from update data
	}
	
	// Update the timestamp and user who updated
	user, _ := middleware.GetCurrentUser(c)
	rawData["updated_by"] = user.ID
	rawData["updated_at"] = time.Now()

	// Start transaction
	tx := h.db.Begin()

	// Perform partial update using Updates method
	if err := tx.Model(&product).Updates(rawData).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	// Update suppliers if provided
	if requestData.SupplierIDs != nil {
		// Delete existing product-supplier relationships
		if err := tx.Where("product_id = ?", product.ID).Delete(&models.ProductSupplier{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update suppliers"})
			return
		}
		
		// Create new relationships
		for i, supplierID := range *requestData.SupplierIDs {
			var supplier models.Supplier
			if err := tx.First(&supplier, "id = ?", supplierID).Error; err == nil {
				productSupplier := models.ProductSupplier{
					ProductID:  product.ID,
					SupplierID: supplier.ID,
					IsPrimary:  i == 0, // First supplier is primary
				}
				if err := tx.Create(&productSupplier).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate suppliers"})
					return
				}
			}
		}
	}
	
	tx.Commit()

	// Fetch the updated product with suppliers to return
	if err := h.db.Preload("Suppliers").First(&product, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated product"})
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

// Supplier handlers
func (h *Handlers) GetSuppliers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	
	offset := (page - 1) * limit
	
	var suppliers []models.Supplier
	query := h.db.Model(&models.Supplier{})
	
	if search != "" {
		query = query.Where("name ILIKE ? OR contact_person ILIKE ? OR agent_name ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	
	var total int64
	query.Count(&total)
	
	err := query.Offset(offset).Limit(limit).Find(&suppliers).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suppliers"})
		return
	}
	
	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	c.JSON(http.StatusOK, gin.H{
		"suppliers": suppliers,
		"total": total,
		"page": page,
		"limit": limit,
	})
}

func (h *Handlers) CreateSupplier(c *gin.Context) {
	var supplier models.Supplier
	if err := c.ShouldBindJSON(&supplier); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	supplier.CreatedBy = &user.ID
	
	if err := h.db.Create(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create supplier"})
		return
	}

	c.JSON(http.StatusCreated, supplier)
}

func (h *Handlers) GetSupplier(c *gin.Context) {
	id := c.Param("id")
	
	var supplier models.Supplier
	if err := h.db.Preload("Products").First(&supplier, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch supplier"})
		return
	}

	c.JSON(http.StatusOK, supplier)
}

func (h *Handlers) UpdateSupplier(c *gin.Context) {
	id := c.Param("id")
	
	var supplier models.Supplier
	if err := h.db.First(&supplier, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch supplier"})
		return
	}

	if err := c.ShouldBindJSON(&supplier); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	supplier.UpdatedBy = &user.ID

	if err := h.db.Save(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update supplier"})
		return
	}

	c.JSON(http.StatusOK, supplier)
}

func (h *Handlers) DeleteSupplier(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Delete(&models.Supplier{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete supplier"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Supplier deleted successfully"})
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
	// Check if db is nil
	if h.db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is nil"})
		return
	}

	var totalSales float64
	var totalCustomers int64
	var totalProducts int64
	var lowStockCount int64

	// Get today's sales
	today := time.Now().Format("2006-01-02")
	if err := h.db.Model(&models.Sale{}).Where("DATE(created_at) = ?", today).Select("COALESCE(SUM(total), 0)").Scan(&totalSales).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get sales data: " + err.Error()})
		return
	}
	
	// Get counts
	if err := h.db.Model(&models.Customer{}).Count(&totalCustomers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get customer count: " + err.Error()})
		return
	}
	
	if err := h.db.Model(&models.Product{}).Where("is_active = ?", true).Count(&totalProducts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get product count: " + err.Error()})
		return
	}
	
	if err := h.db.Model(&models.Product{}).Where("stock <= min_stock AND is_active = ?", true).Count(&lowStockCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get low stock count: " + err.Error()})
		return
	}

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
	id := c.Param("id")
	productID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var stockUpdate struct {
		Quantity  int    `json:"quantity" binding:"required,min=1"`
		Operation string `json:"operation" binding:"required,oneof=add subtract set"`
		Notes     string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&stockUpdate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the product
	var product models.Product
	if err := h.db.First(&product, productID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch product"})
		return
	}

	// Calculate new stock based on operation
	var newStock int
	switch stockUpdate.Operation {
	case "add":
		newStock = product.Stock + stockUpdate.Quantity
	case "subtract":
		newStock = product.Stock - stockUpdate.Quantity
		if newStock < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot reduce stock below zero"})
			return
		}
	case "set":
		newStock = stockUpdate.Quantity
	}

	// Update the product stock
	if err := h.db.Model(&product).Update("stock", newStock).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stock"})
		return
	}

	// Create audit log entry
	resourceIDStr := productID.String()
	auditLog := models.AuditLog{
		Action:     "stock_update",
		Resource:   "products",
		ResourceID: &resourceIDStr,
		OldValues:  fmt.Sprintf(`{"stock": %d}`, product.Stock),
		NewValues:  fmt.Sprintf(`{"stock": %d}`, newStock),
	}

	// Get current user ID for audit trail
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uuid.UUID); ok {
			auditLog.UserID = &uid
		}
	}

	// Save audit log (don't fail the request if this fails)
	h.db.Create(&auditLog)

	// Return updated product
	product.Stock = newStock
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Stock updated successfully. New stock: %d", newStock),
		"product": product,
		"old_stock": product.Stock - (newStock - product.Stock), // Calculate old stock
		"new_stock": newStock,
	})
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
	// Test response with basic data
	response := gin.H{
		"totalRevenue":      825.0,
		"totalOrders":       3,
		"averageOrderValue": 275.0,
		"productPerformance": []map[string]interface{}{
			{"name": "Paracetamol 500mg", "unitsSold": 12, "revenue": 300.0, "category": "Pain Relief", "productId": "550e8400-e29b-41d4-a716-446655440001"},
			{"name": "Lisinopril 10mg", "unitsSold": 2, "revenue": 190.0, "category": "Cardiovascular", "productId": "550e8400-e29b-41d4-a716-446655440004"},
			{"name": "Vitamin C 1000mg", "unitsSold": 1, "revenue": 150.0, "category": "Vitamins", "productId": "550e8400-e29b-41d4-a716-446655440005"},
			{"name": "Amoxicillin 500mg", "unitsSold": 1, "revenue": 120.0, "category": "Antibiotics", "productId": "550e8400-e29b-41d4-a716-446655440002"},
			{"name": "Metformin 500mg", "unitsSold": 1, "revenue": 35.0, "category": "Diabetes", "productId": "550e8400-e29b-41d4-a716-446655440003"},
		},
		"dailySales": []map[string]interface{}{
			{"date": "2025-01-22", "revenue": 0, "orders": 0},
			{"date": "2025-01-23", "revenue": 275.0, "orders": 1},
			{"date": "2025-01-24", "revenue": 0, "orders": 0},
			{"date": "2025-01-25", "revenue": 165.0, "orders": 1},
			{"date": "2025-01-26", "revenue": 0, "orders": 0},
			{"date": "2025-01-27", "revenue": 385.0, "orders": 1},
		},
		"revenueGrowth":     12.5,
		"orderGrowth":       8.2,
		"aovChange":         3.8,
		"conversionRate":    65.4,
		"conversionChange":  2.1,
		"returnRate":        2.8,
		"returnRateChange":  -0.5,
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *Handlers) GetCustomerAnalytics(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *Handlers) GetAuditLogs(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

// Development-only endpoint to create test user
func (h *Handlers) CreateTestUser(c *gin.Context) {
	// Only allow in development mode
	if h.config.Environment == "production" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not available in production"})
		return
	}

	// Check if admin user already exists
	var existingUser models.User
	if err := h.db.Where("username = ?", "admin").First(&existingUser).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Admin user already exists"})
		return
	}

	// Create admin user with hashed password
	hashedPasswordBytes, err := bcrypt.GenerateFromPassword([]byte("admin123"), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	hashedPassword := string(hashedPasswordBytes)

	user := models.User{
		Username:     "admin",
		Email:        "admin@pharmacy.com",
		PasswordHash: hashedPassword,
		Role:         models.RoleAdmin,
		FirstName:    "Admin",
		LastName:     "User",
		IsActive:     true,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Admin user created successfully",
		"username": "admin",
		"password": "admin123",
	})
}

// File Upload Handler for Customer ID Documents
func (h *Handlers) UploadCustomerID(c *gin.Context) {
	customerID := c.Param("id")
	
	// Check if customer exists
	var customer models.Customer
	if err := h.db.First(&customer, "id = ?", customerID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customer"})
		return
	}

	// Parse multipart form
	err := c.Request.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	file, handler, err := c.Request.FormFile("id_document")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file type (allow images and PDFs)
	allowedTypes := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".pdf":  true,
	}
	
	ext := filepath.Ext(handler.Filename)
	if !allowedTypes[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPG, PNG, and PDF files are allowed"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadsDir := "uploads/customer_ids"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s_%d%s", customerID, time.Now().Unix(), ext)
	filepath := filepath.Join(uploadsDir, filename)

	// Create the file
	dst, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	defer dst.Close()

	// Copy uploaded file to destination
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update customer record with file path
	customer.IDDocumentPath = filepath
	if err := h.db.Save(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update customer record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ID document uploaded successfully",
		"file_path": filepath,
	})
}

// Calculate Discount based on customer eligibility
func (h *Handlers) CalculateDiscount(subtotal float64, customer *models.Customer) (float64, string, float64) {
	const seniorCitizenDiscount = 0.20 // 20% discount for senior citizens
	const pwdDiscount = 0.20           // 20% discount for PWD
	
	if customer == nil {
		return 0, "", 0
	}
	
	// Senior Citizen gets priority if both are applicable
	if customer.IsSeniorCitizen {
		discount := subtotal * seniorCitizenDiscount
		return discount, "senior_citizen", seniorCitizenDiscount * 100
	}
	
	if customer.IsPWD {
		discount := subtotal * pwdDiscount
		return discount, "pwd", pwdDiscount * 100
	}
	
	return 0, "", 0
}

// Get Discount Analytics
func (h *Handlers) GetDiscountAnalytics(c *gin.Context) {
	var analytics struct {
		TotalOrders           int64   `json:"total_orders"`
		SeniorCitizenOrders   int64   `json:"senior_citizen_orders"`
		PWDOrders            int64   `json:"pwd_orders"`
		TotalDiscount        float64 `json:"total_discount_amount"`
		SeniorCitizenDiscount float64 `json:"senior_citizen_discount_amount"`
		PWDDiscount          float64 `json:"pwd_discount_amount"`
		AverageDiscount      float64 `json:"average_discount"`
	}

	// Get total orders
	h.db.Model(&models.OnlineOrder{}).Count(&analytics.TotalOrders)

	// Get senior citizen orders count and discount amount
	h.db.Model(&models.OnlineOrder{}).Where("discount_type = ?", "senior_citizen").Count(&analytics.SeniorCitizenOrders)
	h.db.Model(&models.OnlineOrder{}).Where("discount_type = ?", "senior_citizen").Select("COALESCE(SUM(discount), 0)").Scan(&analytics.SeniorCitizenDiscount)

	// Get PWD orders count and discount amount
	h.db.Model(&models.OnlineOrder{}).Where("discount_type = ?", "pwd").Count(&analytics.PWDOrders)
	h.db.Model(&models.OnlineOrder{}).Where("discount_type = ?", "pwd").Select("COALESCE(SUM(discount), 0)").Scan(&analytics.PWDDiscount)

	// Calculate totals
	analytics.TotalDiscount = analytics.SeniorCitizenDiscount + analytics.PWDDiscount
	if analytics.TotalOrders > 0 {
		analytics.AverageDiscount = analytics.TotalDiscount / float64(analytics.TotalOrders)
	}

	c.JSON(http.StatusOK, analytics)
}

// Service handlers for medical services management

// GetServices returns a paginated list of services
func (h *Handlers) GetServices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	category := c.Query("category")
	activeOnly := c.DefaultQuery("active_only", "false") == "true"

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	var services []models.Service
	var total int64

	query := h.db.Model(&models.Service{})

	// Apply filters
	if search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if activeOnly {
		query = query.Where("is_active = ?", true)
	}

	// Get total count
	query.Count(&total)

	// Get paginated results
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("name ASC").Find(&services).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch services"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"services": services,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// GetService returns a specific service by ID
func (h *Handlers) GetService(c *gin.Context) {
	id := c.Param("id")
	serviceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

	var service models.Service
	if err := h.db.First(&service, serviceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch service"})
		return
	}

	c.JSON(http.StatusOK, service)
}

// CreateService creates a new service
func (h *Handlers) CreateService(c *gin.Context) {
	var service models.Service
	if err := c.ShouldBindJSON(&service); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate service category
	if !service.Category.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service category"})
		return
	}

	// Get current user ID for audit trail
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uuid.UUID); ok {
			service.CreatedBy = &uid
		}
	}

	if err := h.db.Create(&service).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create service"})
		return
	}

	c.JSON(http.StatusCreated, service)
}

// UpdateService updates an existing service
func (h *Handlers) UpdateService(c *gin.Context) {
	id := c.Param("id")
	serviceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

	var service models.Service
	if err := h.db.First(&service, serviceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch service"})
		return
	}

	var updateData models.Service
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate service category if provided
	if updateData.Category != "" && !updateData.Category.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service category"})
		return
	}

	// Get current user ID for audit trail
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uuid.UUID); ok {
			updateData.UpdatedBy = &uid
		}
	}

	// Update service
	if err := h.db.Model(&service).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update service"})
		return
	}

	// Fetch updated service
	if err := h.db.First(&service, serviceID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated service"})
		return
	}

	c.JSON(http.StatusOK, service)
}

// DeleteService deletes a service (soft delete)
func (h *Handlers) DeleteService(c *gin.Context) {
	id := c.Param("id")
	serviceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

	var service models.Service
	if err := h.db.First(&service, serviceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch service"})
		return
	}

	// Check if service is being used in any sale items
	var saleItemCount int64
	h.db.Model(&models.SaleItem{}).Where("service_id = ?", serviceID).Count(&saleItemCount)
	if saleItemCount > 0 {
		// Instead of deleting, deactivate the service
		service.IsActive = false
		if err := h.db.Save(&service).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate service"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Service deactivated successfully (has existing sales)"})
		return
	}

	if err := h.db.Delete(&service).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete service"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Service deleted successfully"})
}

// GetServiceCategories returns all available service categories
func (h *Handlers) GetServiceCategories(c *gin.Context) {
	categories := []struct {
		Value string `json:"value"`
		Label string `json:"label"`
	}{
		{string(models.ServiceCategoryVaccination), "Vaccination"},
		{string(models.ServiceCategoryHealthScreening), "Health Screening"},
		{string(models.ServiceCategoryConsultation), "Consultation"},
		{string(models.ServiceCategoryLabTest), "Lab Test"},
		{string(models.ServiceCategoryWoundCare), "Wound Care"},
		{string(models.ServiceCategoryInjection), "Injection"},
		{string(models.ServiceCategoryOther), "Other"},
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}