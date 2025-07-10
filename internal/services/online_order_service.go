package services

import (
	"context"
	"fmt"
	"time"

	"pharmacy-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OnlineOrderService struct {
	db        *gorm.DB
	qrService *QRService
}

func NewOnlineOrderService(db *gorm.DB, qrService *QRService) *OnlineOrderService {
	return &OnlineOrderService{
		db:        db,
		qrService: qrService,
	}
}

// Shopping Cart Management

// AddToCart adds an item to the shopping cart
func (s *OnlineOrderService) AddToCart(ctx context.Context, req AddToCartRequest) (*models.ShoppingCart, error) {
	// Validate product exists and has stock
	var product models.Product
	if err := s.db.First(&product, req.ProductID).Error; err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}

	if product.Stock < req.Quantity {
		return nil, fmt.Errorf("insufficient stock: available %d, requested %d", product.Stock, req.Quantity)
	}

	// Check if item already exists in cart
	var existingItem models.ShoppingCart
	query := s.db.Where("product_id = ?", req.ProductID)
	
	if req.CustomerID != nil {
		query = query.Where("customer_id = ?", *req.CustomerID)
	} else {
		query = query.Where("session_id = ?", req.SessionID)
	}

	if err := query.First(&existingItem).Error; err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("failed to check existing cart item: %w", err)
	}

	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour) // Cart items expire after 24 hours

	// Update existing item or create new one
	if existingItem.ID != uuid.Nil {
		existingItem.Quantity += req.Quantity
		existingItem.UnitPrice = product.Price
		existingItem.ExpiresAt = expiresAt
		existingItem.UpdatedAt = now

		if req.Dosage != nil {
			existingItem.Dosage = req.Dosage
		}
		if req.Instructions != nil {
			existingItem.Instructions = req.Instructions
		}
		if req.Duration != nil {
			existingItem.Duration = req.Duration
		}

		if err := s.db.Save(&existingItem).Error; err != nil {
			return nil, fmt.Errorf("failed to update cart item: %w", err)
		}
		return &existingItem, nil
	}

	// Create new cart item
	cartItem := &models.ShoppingCart{
		CustomerID:   req.CustomerID,
		SessionID:    req.SessionID,
		ProductID:    req.ProductID,
		Quantity:     req.Quantity,
		UnitPrice:    product.Price,
		Dosage:       req.Dosage,
		Instructions: req.Instructions,
		Duration:     req.Duration,
		AddedAt:      now,
		ExpiresAt:    expiresAt,
	}

	if err := s.db.Create(cartItem).Error; err != nil {
		return nil, fmt.Errorf("failed to add item to cart: %w", err)
	}

	return cartItem, nil
}

// GetCart retrieves the shopping cart for a customer or session
func (s *OnlineOrderService) GetCart(ctx context.Context, customerID *uuid.UUID, sessionID *string) ([]models.ShoppingCart, error) {
	query := s.db.Preload("Product").Where("expires_at > ?", time.Now().UTC())
	
	if customerID != nil {
		query = query.Where("customer_id = ?", *customerID)
	} else if sessionID != nil {
		query = query.Where("session_id = ?", *sessionID)
	} else {
		return nil, fmt.Errorf("either customer_id or session_id must be provided")
	}

	var cartItems []models.ShoppingCart
	if err := query.Order("added_at DESC").Find(&cartItems).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve cart: %w", err)
	}

	return cartItems, nil
}

// UpdateCartItem updates quantity or prescription details of a cart item
func (s *OnlineOrderService) UpdateCartItem(ctx context.Context, cartItemID uuid.UUID, req UpdateCartItemRequest) error {
	var cartItem models.ShoppingCart
	if err := s.db.First(&cartItem, cartItemID).Error; err != nil {
		return fmt.Errorf("cart item not found: %w", err)
	}

	if req.Quantity > 0 {
		// Validate stock
		var product models.Product
		if err := s.db.First(&product, cartItem.ProductID).Error; err != nil {
			return fmt.Errorf("product not found: %w", err)
		}

		if product.Stock < req.Quantity {
			return fmt.Errorf("insufficient stock: available %d, requested %d", product.Stock, req.Quantity)
		}

		cartItem.Quantity = req.Quantity
	}

	if req.Dosage != nil {
		cartItem.Dosage = req.Dosage
	}
	if req.Instructions != nil {
		cartItem.Instructions = req.Instructions
	}
	if req.Duration != nil {
		cartItem.Duration = req.Duration
	}

	return s.db.Save(&cartItem).Error
}

// RemoveFromCart removes an item from the shopping cart
func (s *OnlineOrderService) RemoveFromCart(ctx context.Context, cartItemID uuid.UUID) error {
	return s.db.Delete(&models.ShoppingCart{}, cartItemID).Error
}

// ClearCart removes all items from the cart
func (s *OnlineOrderService) ClearCart(ctx context.Context, customerID *uuid.UUID, sessionID *string) error {
	query := s.db.Model(&models.ShoppingCart{})
	
	if customerID != nil {
		query = query.Where("customer_id = ?", *customerID)
	} else if sessionID != nil {
		query = query.Where("session_id = ?", *sessionID)
	} else {
		return fmt.Errorf("either customer_id or session_id must be provided")
	}

	return query.Delete(&models.ShoppingCart{}).Error
}

// Order Management

// CreateOrder creates an order from the shopping cart
func (s *OnlineOrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*models.OnlineOrder, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get cart items
	cartItems, err := s.getCartForOrder(tx, req.CustomerID, req.SessionID)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	if len(cartItems) == 0 {
		tx.Rollback()
		return nil, fmt.Errorf("cart is empty")
	}

	// Calculate totals
	subtotal, prescriptionRequired, err := s.calculateOrderTotals(cartItems)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Generate order number
	orderNumber := s.generateOrderNumber()

	// Create order
	order := &models.OnlineOrder{
		CustomerID:           req.CustomerID,
		GuestEmail:           req.GuestEmail,
		GuestPhone:           req.GuestPhone,
		GuestName:            req.GuestName,
		OrderNumber:          orderNumber,
		Status:               models.OrderStatusPending,
		OrderType:            req.OrderType,
		Subtotal:             subtotal,
		Tax:                  subtotal * 0.12, // 12% VAT in Philippines
		DeliveryFee:          req.DeliveryFee,
		Discount:             req.Discount,
		PrescriptionRequired: prescriptionRequired,
		CustomerNotes:        req.CustomerNotes,
	}

	// Set delivery address if encrypted
	if req.DeliveryAddress != "" {
		if err := order.DeliveryAddress.Set(req.DeliveryAddress); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to encrypt delivery address: %w", err)
		}
	}

	order.DeliveryCity = req.DeliveryCity
	order.DeliveryState = req.DeliveryState
	order.DeliveryZipCode = req.DeliveryZipCode
	order.DeliveryNotes = req.DeliveryNotes

	// Calculate total
	order.Total = order.Subtotal + order.Tax + order.DeliveryFee - order.Discount

	// Set expected delivery date
	if req.OrderType == models.OrderTypeDelivery {
		expectedDate := time.Now().AddDate(0, 0, 3) // 3 days for delivery
		order.ExpectedDeliveryDate = &expectedDate
	}

	// Save order
	if err := tx.Create(order).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Create order items
	for _, cartItem := range cartItems {
		orderItem := &models.OnlineOrderItem{
			OrderID:      order.ID,
			ProductID:    cartItem.ProductID,
			Quantity:     cartItem.Quantity,
			UnitPrice:    cartItem.UnitPrice,
			TotalPrice:   float64(cartItem.Quantity) * cartItem.UnitPrice,
			Dosage:       cartItem.Dosage,
			Instructions: cartItem.Instructions,
			Duration:     cartItem.Duration,
			Status:       models.ItemStatusPending,
		}

		if err := tx.Create(orderItem).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to create order item: %w", err)
		}
	}

	// Generate QR code for order tracking
	qrCode, err := s.qrService.GenerateOrderQR(ctx, order.ID, req.CreatedBy)
	if err != nil {
		// Don't fail the order if QR generation fails
		fmt.Printf("Failed to generate QR code for order %s: %v", order.ID, err)
	} else {
		order.QRCode = qrCode.Code
		if err := tx.Save(order).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update order with QR code: %w", err)
		}
	}

	// Create initial status history
	statusHistory := &models.OrderStatusHistory{
		OrderID:        order.ID,
		NewStatus:      models.OrderStatusPending,
		Reason:         "Order created",
		UpdatedByUser:  req.CreatedBy,
		IsSystemUpdate: true,
	}
	if err := tx.Create(statusHistory).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create status history: %w", err)
	}

	// Clear cart after successful order creation
	if err := s.clearCartInTx(tx, req.CustomerID, req.SessionID); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to clear cart: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit order creation: %w", err)
	}

	// Load complete order with relationships
	if err := s.db.Preload("OrderItems.Product").Preload("Customer").
		First(order, order.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load complete order: %w", err)
	}

	return order, nil
}

// GetOrder retrieves an order by ID
func (s *OnlineOrderService) GetOrder(ctx context.Context, orderID uuid.UUID) (*models.OnlineOrder, error) {
	var order models.OnlineOrder
	if err := s.db.Preload("OrderItems.Product").Preload("Customer").
		Preload("OrderHistory.User").Preload("Pharmacist").
		First(&order, orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}
	return &order, nil
}

// GetOrderByNumber retrieves an order by order number
func (s *OnlineOrderService) GetOrderByNumber(ctx context.Context, orderNumber string) (*models.OnlineOrder, error) {
	var order models.OnlineOrder
	if err := s.db.Preload("OrderItems.Product").Preload("Customer").
		Where("order_number = ?", orderNumber).First(&order).Error; err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}
	return &order, nil
}

// UpdateOrderStatus updates the status of an order
func (s *OnlineOrderService) UpdateOrderStatus(ctx context.Context, orderID uuid.UUID, newStatus models.OrderStatus, reason string, userID *uuid.UUID) error {
	// Get current order
	var order models.OnlineOrder
	if err := s.db.First(&order, orderID).Error; err != nil {
		return fmt.Errorf("order not found: %w", err)
	}

	previousStatus := order.Status

	// Update order status
	order.Status = newStatus
	order.UpdatedAt = time.Now().UTC()

	// Set specific timestamps based on status
	switch newStatus {
	case models.OrderStatusPaid:
		now := time.Now().UTC()
		order.PaidAt = &now
	case models.OrderStatusDelivered:
		now := time.Now().UTC()
		order.ActualDeliveryDate = &now
	}

	if err := s.db.Save(&order).Error; err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	// Create status history entry
	statusHistory := &models.OrderStatusHistory{
		OrderID:        orderID,
		PreviousStatus: &previousStatus,
		NewStatus:      newStatus,
		Reason:         reason,
		UpdatedByUser:  userID,
		IsSystemUpdate: userID == nil,
	}

	if err := s.db.Create(statusHistory).Error; err != nil {
		return fmt.Errorf("failed to create status history: %w", err)
	}

	return nil
}

// GetCustomerOrders retrieves orders for a specific customer
func (s *OnlineOrderService) GetCustomerOrders(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]models.OnlineOrder, error) {
	var orders []models.OnlineOrder
	err := s.db.Preload("OrderItems.Product").
		Where("customer_id = ?", customerID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&orders).Error
	return orders, err
}

// SearchOrders searches orders with various filters
func (s *OnlineOrderService) SearchOrders(ctx context.Context, filters OrderSearchFilters) ([]models.OnlineOrder, int64, error) {
	query := s.db.Model(&models.OnlineOrder{}).Preload("Customer").Preload("OrderItems.Product")

	// Apply filters
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.OrderType != "" {
		query = query.Where("order_type = ?", filters.OrderType)
	}
	if !filters.StartDate.IsZero() {
		query = query.Where("created_at >= ?", filters.StartDate)
	}
	if !filters.EndDate.IsZero() {
		query = query.Where("created_at <= ?", filters.EndDate)
	}
	if filters.CustomerID != nil {
		query = query.Where("customer_id = ?", *filters.CustomerID)
	}
	if filters.PharmacistID != nil {
		query = query.Where("pharmacist_id = ?", *filters.PharmacistID)
	}
	if filters.PrescriptionRequired != nil {
		query = query.Where("prescription_required = ?", *filters.PrescriptionRequired)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	var orders []models.OnlineOrder
	err := query.Offset(filters.Offset).Limit(filters.Limit).
		Order("created_at DESC").Find(&orders).Error

	return orders, total, err
}

// Helper methods

func (s *OnlineOrderService) getCartForOrder(tx *gorm.DB, customerID *uuid.UUID, sessionID *string) ([]models.ShoppingCart, error) {
	query := tx.Preload("Product").Where("expires_at > ?", time.Now().UTC())
	
	if customerID != nil {
		query = query.Where("customer_id = ?", *customerID)
	} else if sessionID != nil {
		query = query.Where("session_id = ?", *sessionID)
	} else {
		return nil, fmt.Errorf("either customer_id or session_id must be provided")
	}

	var cartItems []models.ShoppingCart
	return cartItems, query.Find(&cartItems).Error
}

func (s *OnlineOrderService) calculateOrderTotals(cartItems []models.ShoppingCart) (float64, bool, error) {
	var subtotal float64
	var prescriptionRequired bool

	for _, item := range cartItems {
		// Check stock availability
		var product models.Product
		if err := s.db.First(&product, item.ProductID).Error; err != nil {
			return 0, false, fmt.Errorf("product %s not found", item.ProductID)
		}

		if product.Stock < item.Quantity {
			return 0, false, fmt.Errorf("insufficient stock for product %s: available %d, requested %d", 
				product.Name, product.Stock, item.Quantity)
		}

		subtotal += float64(item.Quantity) * item.UnitPrice

		if product.PrescriptionRequired {
			prescriptionRequired = true
		}
	}

	return subtotal, prescriptionRequired, nil
}

func (s *OnlineOrderService) generateOrderNumber() string {
	timestamp := time.Now().Format("20060102")
	randomID := uuid.New().String()[:8]
	return fmt.Sprintf("ORD-%s-%s", timestamp, randomID)
}

func (s *OnlineOrderService) clearCartInTx(tx *gorm.DB, customerID *uuid.UUID, sessionID *string) error {
	query := tx.Model(&models.ShoppingCart{})
	
	if customerID != nil {
		query = query.Where("customer_id = ?", *customerID)
	} else if sessionID != nil {
		query = query.Where("session_id = ?", *sessionID)
	} else {
		return fmt.Errorf("either customer_id or session_id must be provided")
	}

	return query.Delete(&models.ShoppingCart{}).Error
}

// Request/Response types

type AddToCartRequest struct {
	CustomerID   *uuid.UUID `json:"customer_id"`
	SessionID    *string    `json:"session_id"`
	ProductID    uuid.UUID  `json:"product_id" validate:"required"`
	Quantity     int        `json:"quantity" validate:"required,gt=0"`
	Dosage       *string    `json:"dosage"`
	Instructions *string    `json:"instructions"`
	Duration     *string    `json:"duration"`
}

type UpdateCartItemRequest struct {
	Quantity     int     `json:"quantity" validate:"gt=0"`
	Dosage       *string `json:"dosage"`
	Instructions *string `json:"instructions"`
	Duration     *string `json:"duration"`
}

type CreateOrderRequest struct {
	CustomerID       *uuid.UUID         `json:"customer_id"`
	SessionID        *string            `json:"session_id"`
	GuestEmail       *string            `json:"guest_email"`
	GuestPhone       *string            `json:"guest_phone"`
	GuestName        *string            `json:"guest_name"`
	OrderType        models.OrderType   `json:"order_type" validate:"required"`
	DeliveryAddress  string             `json:"delivery_address"`
	DeliveryCity     string             `json:"delivery_city"`
	DeliveryState    string             `json:"delivery_state"`
	DeliveryZipCode  string             `json:"delivery_zip_code"`
	DeliveryNotes    string             `json:"delivery_notes"`
	DeliveryFee      float64            `json:"delivery_fee"`
	Discount         float64            `json:"discount"`
	CustomerNotes    string             `json:"customer_notes"`
	CreatedBy        *uuid.UUID         `json:"created_by"`
}

type OrderSearchFilters struct {
	Status               string      `json:"status"`
	OrderType            string      `json:"order_type"`
	StartDate            time.Time   `json:"start_date"`
	EndDate              time.Time   `json:"end_date"`
	CustomerID           *uuid.UUID  `json:"customer_id"`
	PharmacistID         *uuid.UUID  `json:"pharmacist_id"`
	PrescriptionRequired *bool       `json:"prescription_required"`
	Limit                int         `json:"limit"`
	Offset               int         `json:"offset"`
}