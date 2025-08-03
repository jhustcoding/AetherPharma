package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"pharmacy-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type QRService struct {
	db *gorm.DB
}

func NewQRService(db *gorm.DB) *QRService {
	return &QRService{db: db}
}

// QRData represents the data structure encoded in QR codes
type QRData struct {
	Type       models.QRType `json:"type"`
	EntityID   uuid.UUID     `json:"entity_id"`
	EntityType string        `json:"entity_type"`
	Timestamp  time.Time     `json:"timestamp"`
	Version    string        `json:"version"`
	Extra      interface{}   `json:"extra,omitempty"`
}

// ProductQRData for product-specific QR codes
type ProductQRData struct {
	ProductID    uuid.UUID `json:"product_id"`
	SKU          string    `json:"sku"`
	Name         string    `json:"name"`
	Price        float64   `json:"price"`
	BatchNumber  string    `json:"batch_number"`
	ExpiryDate   models.CustomDate `json:"expiry_date"`
	PrescriptionRequired bool `json:"prescription_required"`
}

// CustomerQRData for customer-specific QR codes
type CustomerQRData struct {
	CustomerID   uuid.UUID `json:"customer_id"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	LoyaltyPoints int      `json:"loyalty_points"`
	MemberSince  time.Time `json:"member_since"`
}

// OrderQRData for order tracking QR codes
type OrderQRData struct {
	OrderID      uuid.UUID              `json:"order_id"`
	OrderNumber  string                 `json:"order_number"`
	Status       models.OrderStatus     `json:"status"`
	Total        float64                `json:"total"`
	OrderType    models.OrderType       `json:"order_type"`
	TrackingURL  string                 `json:"tracking_url,omitempty"`
}

// GenerateProductQR generates QR code for a product
func (s *QRService) GenerateProductQR(ctx context.Context, productID uuid.UUID, userID *uuid.UUID) (*models.QRCode, error) {
	// Get product details
	var product models.Product
	if err := s.db.First(&product, productID).Error; err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}

	// Create QR data
	qrData := QRData{
		Type:       models.QRTypeProduct,
		EntityID:   productID,
		EntityType: "product",
		Timestamp:  time.Now().UTC(),
		Version:    "1.0",
		Extra: ProductQRData{
			ProductID:    product.ID,
			SKU:          product.SKU,
			Name:         product.Name,
			Price:        product.Price,
			BatchNumber:  product.BatchNumber,
			ExpiryDate:   product.ExpiryDate,
			PrescriptionRequired: product.PrescriptionRequired,
		},
	}

	return s.generateQRCode(ctx, qrData, userID)
}

// GenerateCustomerQR generates QR code for a customer
func (s *QRService) GenerateCustomerQR(ctx context.Context, customerID uuid.UUID, userID *uuid.UUID) (*models.QRCode, error) {
	// Get customer details
	var customer models.Customer
	if err := s.db.First(&customer, customerID).Error; err != nil {
		return nil, fmt.Errorf("customer not found: %w", err)
	}

	// Create QR data
	qrData := QRData{
		Type:       models.QRTypeCustomer,
		EntityID:   customerID,
		EntityType: "customer",
		Timestamp:  time.Now().UTC(),
		Version:    "1.0",
		Extra: CustomerQRData{
			CustomerID:   customer.ID,
			Name:         customer.FirstName + " " + customer.LastName,
			Phone:        customer.Phone,
			LoyaltyPoints: customer.LoyaltyPoints,
			MemberSince:  customer.CreatedAt,
		},
	}

	return s.generateQRCode(ctx, qrData, userID)
}

// GenerateOrderQR generates QR code for an order
func (s *QRService) GenerateOrderQR(ctx context.Context, orderID uuid.UUID, userID *uuid.UUID) (*models.QRCode, error) {
	// Get order details
	var order models.OnlineOrder
	if err := s.db.First(&order, orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	// Create QR data
	qrData := QRData{
		Type:       models.QRTypeOrder,
		EntityID:   orderID,
		EntityType: "order",
		Timestamp:  time.Now().UTC(),
		Version:    "1.0",
		Extra: OrderQRData{
			OrderID:     order.ID,
			OrderNumber: order.OrderNumber,
			Status:      order.Status,
			Total:       order.Total,
			OrderType:   order.OrderType,
			TrackingURL: fmt.Sprintf("/orders/%s/track", order.ID),
		},
	}

	return s.generateQRCode(ctx, qrData, userID)
}

// ScanQR scans and validates a QR code
func (s *QRService) ScanQR(ctx context.Context, code string, scanContext ScanContext) (*QRScanResult, error) {
	// Find QR code in database
	var qrCode models.QRCode
	if err := s.db.Where("code = ? AND is_active = ?", code, true).First(&qrCode).Error; err != nil {
		// Log failed scan
		s.logScan(ctx, uuid.Nil, scanContext, false, "QR code not found")
		return nil, fmt.Errorf("invalid QR code")
	}

	// Check if expired
	if qrCode.ExpiresAt != nil && qrCode.ExpiresAt.Before(time.Now()) {
		s.logScan(ctx, qrCode.ID, scanContext, false, "QR code expired")
		return nil, fmt.Errorf("QR code expired")
	}

	// Parse QR data
	var qrData QRData
	if err := json.Unmarshal([]byte(qrCode.Data), &qrData); err != nil {
		s.logScan(ctx, qrCode.ID, scanContext, false, "Invalid QR data format")
		return nil, fmt.Errorf("invalid QR code format")
	}

	// Update scan statistics
	if err := s.updateScanStats(ctx, &qrCode); err != nil {
		// Log but don't fail the scan
		fmt.Printf("Failed to update scan stats: %v", err)
	}

	// Log successful scan
	s.logScan(ctx, qrCode.ID, scanContext, true, "")

	// Create scan result
	result := &QRScanResult{
		QRCode:    &qrCode,
		Data:      &qrData,
		EntityID:  qrData.EntityID,
		EntityType: qrData.EntityType,
		Type:      qrData.Type,
		ScanTime:  time.Now().UTC(),
	}

	// Load entity details based on type
	if err := s.loadEntityDetails(ctx, result); err != nil {
		return nil, fmt.Errorf("failed to load entity details: %w", err)
	}

	return result, nil
}

// GetQRCodesByEntity retrieves QR codes for a specific entity
func (s *QRService) GetQRCodesByEntity(ctx context.Context, entityID uuid.UUID, entityType string) ([]models.QRCode, error) {
	var qrCodes []models.QRCode
	err := s.db.Where("entity_id = ? AND entity_type = ? AND is_active = ?", 
		entityID, entityType, true).Find(&qrCodes).Error
	return qrCodes, err
}

// DeactivateQRCode deactivates a QR code
func (s *QRService) DeactivateQRCode(ctx context.Context, qrCodeID uuid.UUID, reason string, userID *uuid.UUID) error {
	return s.db.Model(&models.QRCode{}).Where("id = ?", qrCodeID).Updates(map[string]interface{}{
		"is_active": false,
		"updated_at": time.Now().UTC(),
	}).Error
}

// GetScanHistory retrieves scan history for analytics
func (s *QRService) GetScanHistory(ctx context.Context, filters ScanHistoryFilters) ([]models.QRScanLog, error) {
	query := s.db.Model(&models.QRScanLog{}).Preload("QRCode")
	
	if !filters.StartDate.IsZero() {
		query = query.Where("created_at >= ?", filters.StartDate)
	}
	if !filters.EndDate.IsZero() {
		query = query.Where("created_at <= ?", filters.EndDate)
	}
	if filters.EntityType != "" {
		query = query.Joins("JOIN qr_codes ON qr_scan_logs.qr_code_id = qr_codes.id").
			Where("qr_codes.entity_type = ?", filters.EntityType)
	}
	if filters.Success != nil {
		query = query.Where("success = ?", *filters.Success)
	}

	var scanLogs []models.QRScanLog
	err := query.Order("created_at DESC").Limit(filters.Limit).Offset(filters.Offset).Find(&scanLogs).Error
	return scanLogs, err
}

// Private helper methods

func (s *QRService) generateQRCode(ctx context.Context, qrData QRData, userID *uuid.UUID) (*models.QRCode, error) {
	// Generate unique code
	code, err := s.generateUniqueCode()
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Serialize QR data
	dataBytes, err := json.Marshal(qrData)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize QR data: %w", err)
	}

	// Create QR code record
	qrCode := &models.QRCode{
		Code:        code,
		Type:        qrData.Type,
		EntityID:    qrData.EntityID,
		EntityType:  qrData.EntityType,
		GeneratedBy: userID,
		IsActive:    true,
		Data:        string(dataBytes),
		ScanCount:   0,
	}

	// Set expiration for certain types
	if qrData.Type == models.QRTypeAuth || qrData.Type == models.QRTypePayment {
		expiry := time.Now().Add(24 * time.Hour) // 24 hour expiry for auth/payment QRs
		qrCode.ExpiresAt = &expiry
	}

	// Save to database
	if err := s.db.Create(qrCode).Error; err != nil {
		return nil, fmt.Errorf("failed to save QR code: %w", err)
	}

	return qrCode, nil
}

func (s *QRService) generateUniqueCode() (string, error) {
	for attempts := 0; attempts < 10; attempts++ {
		// Generate random bytes
		bytes := make([]byte, 16)
		if _, err := rand.Read(bytes); err != nil {
			return "", err
		}

		// Encode to base64 and clean up
		code := base64.URLEncoding.EncodeToString(bytes)
		code = code[:22] // Remove padding

		// Check if unique
		var count int64
		if err := s.db.Model(&models.QRCode{}).Where("code = ?", code).Count(&count).Error; err != nil {
			return "", err
		}

		if count == 0 {
			return code, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique QR code after 10 attempts")
}

func (s *QRService) updateScanStats(ctx context.Context, qrCode *models.QRCode) error {
	now := time.Now().UTC()
	return s.db.Model(qrCode).Updates(map[string]interface{}{
		"scan_count":   gorm.Expr("scan_count + 1"),
		"last_scanned": now,
		"updated_at":   now,
	}).Error
}

func (s *QRService) logScan(ctx context.Context, qrCodeID uuid.UUID, scanContext ScanContext, success bool, errorMessage string) {
	scanLog := &models.QRScanLog{
		QRCodeID:     qrCodeID,
		ScannedBy:    scanContext.UserID,
		SessionID:    scanContext.SessionID,
		IPAddress:    scanContext.IPAddress,
		UserAgent:    scanContext.UserAgent,
		Success:      success,
		ScanMethod:   scanContext.ScanMethod,
		Location:     scanContext.Location,
	}

	if !success && errorMessage != "" {
		scanLog.ErrorMessage = &errorMessage
	}

	// Fire and forget logging
	go func() {
		if err := s.db.Create(scanLog).Error; err != nil {
			fmt.Printf("Failed to log QR scan: %v", err)
		}
	}()
}

func (s *QRService) loadEntityDetails(ctx context.Context, result *QRScanResult) error {
	switch result.Type {
	case models.QRTypeProduct:
		var product models.Product
		if err := s.db.First(&product, result.EntityID).Error; err != nil {
			return err
		}
		result.Entity = &product

	case models.QRTypeCustomer:
		var customer models.Customer
		if err := s.db.First(&customer, result.EntityID).Error; err != nil {
			return err
		}
		result.Entity = &customer

	case models.QRTypeOrder:
		var order models.OnlineOrder
		if err := s.db.Preload("OrderItems.Product").Preload("Customer").
			First(&order, result.EntityID).Error; err != nil {
			return err
		}
		result.Entity = &order
	}

	return nil
}

// Supporting types

type ScanContext struct {
	UserID     *uuid.UUID
	SessionID  *string
	IPAddress  string
	UserAgent  string
	ScanMethod string // "mobile", "web", "pos"
	Location   string
}

type QRScanResult struct {
	QRCode     *models.QRCode
	Data       *QRData
	EntityID   uuid.UUID
	EntityType string
	Type       models.QRType
	ScanTime   time.Time
	Entity     interface{} // The actual entity (Product, Customer, Order, etc.)
}

type ScanHistoryFilters struct {
	StartDate  time.Time
	EndDate    time.Time
	EntityType string
	Success    *bool
	Limit      int
	Offset     int
}