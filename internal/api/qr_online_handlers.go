package api

import (
	"net/http"
	"strconv"
	"time"

	"pharmacy-backend/internal/middleware"
	"pharmacy-backend/internal/models"
	"pharmacy-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// QR Code Handlers

// GenerateProductQR generates a QR code for a product
func (h *Handlers) GenerateProductQR(c *gin.Context) {
	productIDStr := c.Param("id")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	
	qrCode, err := h.qrService.GenerateProductQR(c.Request.Context(), productID, &user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"qr_code": qrCode,
		"qr_image_url": "/api/v1/qr/" + qrCode.Code + "/image", // Endpoint for QR image
	})
}

// GenerateCustomerQR generates a QR code for a customer
func (h *Handlers) GenerateCustomerQR(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := uuid.Parse(customerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid customer ID"})
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	
	qrCode, err := h.qrService.GenerateCustomerQR(c.Request.Context(), customerID, &user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"qr_code": qrCode,
		"qr_image_url": "/api/v1/qr/" + qrCode.Code + "/image",
	})
}

// ScanQR scans a QR code and returns the associated data
func (h *Handlers) ScanQR(c *gin.Context) {
	var req struct {
		Code       string `json:"code" binding:"required"`
		ScanMethod string `json:"scan_method"`
		Location   string `json:"location"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user if authenticated
	user, _ := middleware.GetCurrentUser(c)
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}

	// Create scan context
	scanContext := services.ScanContext{
		UserID:     userID,
		IPAddress:  c.ClientIP(),
		UserAgent:  c.Request.UserAgent(),
		ScanMethod: req.ScanMethod,
		Location:   req.Location,
	}

	// Get session ID if available
	if sessionID := c.GetHeader("X-Session-ID"); sessionID != "" {
		scanContext.SessionID = &sessionID
	}

	result, err := h.qrService.ScanQR(c.Request.Context(), req.Code, scanContext)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"scan_result": result,
		"entity": result.Entity,
		"scan_time": result.ScanTime,
	})
}

// GetQRScanHistory retrieves QR scan history for analytics
func (h *Handlers) GetQRScanHistory(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	entityType := c.Query("entity_type")
	
	var startDate, endDate time.Time
	if start := c.Query("start_date"); start != "" {
		startDate, _ = time.Parse("2006-01-02", start)
	}
	if end := c.Query("end_date"); end != "" {
		endDate, _ = time.Parse("2006-01-02", end)
	}

	filters := services.ScanHistoryFilters{
		StartDate:  startDate,
		EndDate:    endDate,
		EntityType: entityType,
		Limit:      limit,
		Offset:     offset,
	}

	if successStr := c.Query("success"); successStr != "" {
		if success, err := strconv.ParseBool(successStr); err == nil {
			filters.Success = &success
		}
	}

	scanLogs, err := h.qrService.GetScanHistory(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve scan history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"scan_logs": scanLogs,
		"limit": limit,
		"offset": offset,
	})
}

// Shopping Cart Handlers

// AddToCart adds an item to the shopping cart
func (h *Handlers) AddToCart(c *gin.Context) {
	var req services.AddToCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get customer ID from auth if available
	if user, exists := middleware.GetCurrentUser(c); exists {
		req.CustomerID = &user.ID
	} else {
		// For guest users, require session ID
		sessionID := c.GetHeader("X-Session-ID")
		if sessionID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required for guest users"})
			return
		}
		req.SessionID = &sessionID
	}

	cartItem, err := h.onlineOrderService.AddToCart(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, cartItem)
}

// GetCart retrieves the shopping cart
func (h *Handlers) GetCart(c *gin.Context) {
	var customerID *uuid.UUID
	var sessionID *string

	// Get customer ID from auth if available
	if user, exists := middleware.GetCurrentUser(c); exists {
		customerID = &user.ID
	} else {
		// For guest users, require session ID
		if sid := c.GetHeader("X-Session-ID"); sid != "" {
			sessionID = &sid
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Authentication or Session ID required"})
			return
		}
	}

	cartItems, err := h.onlineOrderService.GetCart(c.Request.Context(), customerID, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Calculate cart summary
	var totalItems int
	var totalAmount float64
	for _, item := range cartItems {
		totalItems += item.Quantity
		totalAmount += float64(item.Quantity) * item.UnitPrice
	}

	c.JSON(http.StatusOK, gin.H{
		"cart_items": cartItems,
		"summary": gin.H{
			"total_items": totalItems,
			"total_amount": totalAmount,
			"item_count": len(cartItems),
		},
	})
}

// UpdateCartItem updates a cart item
func (h *Handlers) UpdateCartItem(c *gin.Context) {
	cartItemIDStr := c.Param("id")
	cartItemID, err := uuid.Parse(cartItemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cart item ID"})
		return
	}

	var req services.UpdateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.onlineOrderService.UpdateCartItem(c.Request.Context(), cartItemID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cart item updated successfully"})
}

// RemoveFromCart removes an item from the cart
func (h *Handlers) RemoveFromCart(c *gin.Context) {
	cartItemIDStr := c.Param("id")
	cartItemID, err := uuid.Parse(cartItemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cart item ID"})
		return
	}

	err = h.onlineOrderService.RemoveFromCart(c.Request.Context(), cartItemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item removed from cart"})
}

// ClearCart clears all items from the cart
func (h *Handlers) ClearCart(c *gin.Context) {
	var customerID *uuid.UUID
	var sessionID *string

	// Get customer ID from auth if available
	if user, exists := middleware.GetCurrentUser(c); exists {
		customerID = &user.ID
	} else {
		// For guest users, require session ID
		if sid := c.GetHeader("X-Session-ID"); sid != "" {
			sessionID = &sid
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Authentication or Session ID required"})
			return
		}
	}

	err := h.onlineOrderService.ClearCart(c.Request.Context(), customerID, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cart cleared successfully"})
}

// Online Order Handlers

// CreateOnlineOrder creates an order from the cart
func (h *Handlers) CreateOnlineOrder(c *gin.Context) {
	var req services.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get customer ID from auth if available
	if user, exists := middleware.GetCurrentUser(c); exists {
		req.CustomerID = &user.ID
		req.CreatedBy = &user.ID
	} else {
		// For guest users, require session ID and guest info
		sessionID := c.GetHeader("X-Session-ID")
		if sessionID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required for guest orders"})
			return
		}
		req.SessionID = &sessionID

		// Validate guest information
		if req.GuestEmail == nil || req.GuestPhone == nil || req.GuestName == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Guest information required for anonymous orders"})
			return
		}
	}

	order, err := h.onlineOrderService.CreateOrder(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"order": order,
		"message": "Order created successfully",
		"qr_code": order.QRCode,
	})
}

// GetOnlineOrder retrieves an order by ID
func (h *Handlers) GetOnlineOrder(c *gin.Context) {
	orderIDStr := c.Param("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	order, err := h.onlineOrderService.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Check permissions - customers can only see their own orders
	if user, exists := middleware.GetCurrentUser(c); exists {
		if user.Role == models.RoleAssistant || user.Role == models.RolePharmacist {
			// Staff can see all orders
		} else if order.CustomerID == nil || *order.CustomerID != user.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
	}

	c.JSON(http.StatusOK, order)
}

// GetOnlineOrderByNumber retrieves an order by order number
func (h *Handlers) GetOnlineOrderByNumber(c *gin.Context) {
	orderNumber := c.Param("number")
	
	order, err := h.onlineOrderService.GetOrderByNumber(c.Request.Context(), orderNumber)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, order)
}

// TrackOrder provides order tracking information
func (h *Handlers) TrackOrder(c *gin.Context) {
	orderNumber := c.Param("number")
	
	order, err := h.onlineOrderService.GetOrderByNumber(c.Request.Context(), orderNumber)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Create tracking response
	tracking := gin.H{
		"order_number": order.OrderNumber,
		"status": order.Status,
		"order_type": order.OrderType,
		"created_at": order.CreatedAt,
		"expected_delivery": order.ExpectedDeliveryDate,
		"actual_delivery": order.ActualDeliveryDate,
		"tracking_number": order.TrackingNumber,
	}

	// Load status history
	var statusHistory []models.OrderStatusHistory
	if err := h.db.Where("order_id = ?", order.ID).
		Preload("User").Order("created_at ASC").
		Find(&statusHistory).Error; err == nil {
		tracking["status_history"] = statusHistory
	}

	c.JSON(http.StatusOK, gin.H{
		"tracking": tracking,
		"order": order,
	})
}

// UpdateOrderStatus updates the status of an order
func (h *Handlers) UpdateOrderStatus(c *gin.Context) {
	orderIDStr := c.Param("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
		Reason string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := middleware.GetCurrentUser(c)

	err = h.onlineOrderService.UpdateOrderStatus(
		c.Request.Context(),
		orderID,
		models.OrderStatus(req.Status),
		req.Reason,
		&user.ID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order status updated successfully"})
}

// GetOnlineOrders lists orders with filtering
func (h *Handlers) GetOnlineOrders(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	filters := services.OrderSearchFilters{
		Status:    c.Query("status"),
		OrderType: c.Query("order_type"),
		Limit:     limit,
		Offset:    offset,
	}

	// Parse dates
	if start := c.Query("start_date"); start != "" {
		filters.StartDate, _ = time.Parse("2006-01-02", start)
	}
	if end := c.Query("end_date"); end != "" {
		filters.EndDate, _ = time.Parse("2006-01-02", end)
	}

	// Customer filter
	if customerIDStr := c.Query("customer_id"); customerIDStr != "" {
		if customerID, err := uuid.Parse(customerIDStr); err == nil {
			filters.CustomerID = &customerID
		}
	}

	// Prescription filter
	if prescStr := c.Query("prescription_required"); prescStr != "" {
		if prescRequired, err := strconv.ParseBool(prescStr); err == nil {
			filters.PrescriptionRequired = &prescRequired
		}
	}

	// Check permissions - customers can only see their own orders
	if user, exists := middleware.GetCurrentUser(c); exists {
		if user.Role == models.RoleAssistant || user.Role == models.RolePharmacist || user.Role == models.RoleManager || user.Role == models.RoleAdmin {
			// Staff can see all orders (no additional filter needed)
		} else {
			// Regular customers can only see their own orders
			filters.CustomerID = &user.ID
		}
	}

	orders, total, err := h.onlineOrderService.SearchOrders(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve orders"})
		return
	}

	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"total": total,
		"limit": limit,
		"offset": offset,
	})
}

// GetCustomerOnlineOrders retrieves orders for a specific customer
func (h *Handlers) GetCustomerOnlineOrders(c *gin.Context) {
	customerIDStr := c.Param("customer_id")
	customerID, err := uuid.Parse(customerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid customer ID"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	orders, err := h.onlineOrderService.GetCustomerOrders(c.Request.Context(), customerID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve customer orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"customer_id": customerID,
	})
}

// Add services to handlers (update the existing NewHandlers function)
func (h *Handlers) initializeAdditionalServices() {
	h.qrService = services.NewQRService(h.db)
	h.onlineOrderService = services.NewOnlineOrderService(h.db, h.qrService)
}