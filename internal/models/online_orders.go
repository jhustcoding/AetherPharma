package models

import (
	"time"
	"pharmacy-backend/internal/utils"
	"github.com/google/uuid"
)

// OnlineOrder represents an online order placed by customers
type OnlineOrder struct {
	BaseModel
	
	// Customer Information
	CustomerID   *uuid.UUID `gorm:"type:uuid;index" json:"customer_id"`
	Customer     *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	
	// Guest Order Information (for non-registered customers)
	GuestEmail   *string `gorm:"size:255" json:"guest_email"`
	GuestPhone   *string `gorm:"size:20" json:"guest_phone"`
	GuestName    *string `gorm:"size:200" json:"guest_name"`
	
	// Order Details
	OrderNumber     string      `gorm:"uniqueIndex;not null;size:50" json:"order_number" validate:"required"`
	Status          OrderStatus `gorm:"not null;default:'pending'" json:"status"`
	OrderType       OrderType   `gorm:"not null;default:'delivery'" json:"order_type"`
	
	// Financial Information
	Subtotal        float64 `gorm:"not null;type:decimal(10,2)" json:"subtotal" validate:"required,gt=0"`
	Tax             float64 `gorm:"not null;type:decimal(10,2);default:0" json:"tax"`
	DeliveryFee     float64 `gorm:"not null;type:decimal(10,2);default:0" json:"delivery_fee"`
	Discount        float64 `gorm:"not null;type:decimal(10,2);default:0" json:"discount"`
	Total           float64 `gorm:"not null;type:decimal(10,2)" json:"total" validate:"required,gt=0"`
	
	// Payment Information
	PaymentMethod   string     `gorm:"size:50" json:"payment_method"`
	PaymentStatus   string     `gorm:"size:50;default:'pending'" json:"payment_status"`
	PaymentReference *string   `gorm:"size:100" json:"payment_reference"`
	PaidAt          *time.Time `json:"paid_at"`
	
	// Delivery Information
	DeliveryAddress    utils.EncryptedString `gorm:"type:text" json:"delivery_address"`
	DeliveryCity       string                `gorm:"size:100" json:"delivery_city"`
	DeliveryState      string                `gorm:"size:100" json:"delivery_state"`
	DeliveryZipCode    string                `gorm:"size:20" json:"delivery_zip_code"`
	DeliveryNotes      string                `gorm:"type:text" json:"delivery_notes"`
	
	// Prescription Information
	PrescriptionRequired bool      `gorm:"default:false" json:"prescription_required"`
	PrescriptionUploaded bool      `gorm:"default:false" json:"prescription_uploaded"`
	PrescriptionImages   StringArray `gorm:"type:jsonb" json:"prescription_images"`
	PrescriptionNotes    string      `gorm:"type:text" json:"prescription_notes"`
	
	// Fulfillment
	ExpectedDeliveryDate *time.Time `json:"expected_delivery_date"`
	ActualDeliveryDate   *time.Time `json:"actual_delivery_date"`
	TrackingNumber       *string    `gorm:"size:100" json:"tracking_number"`
	
	// Staff Assignment
	PharmacistID *uuid.UUID `gorm:"type:uuid" json:"pharmacist_id"`
	Pharmacist   *User      `gorm:"foreignKey:PharmacistID" json:"pharmacist,omitempty"`
	DeliveryPersonID *uuid.UUID `gorm:"type:uuid" json:"delivery_person_id"`
	DeliveryPerson   *User      `gorm:"foreignKey:DeliveryPersonID" json:"delivery_person,omitempty"`
	
	// Notes and Communication
	CustomerNotes  string `gorm:"type:text" json:"customer_notes"`
	PharmacyNotes  string `gorm:"type:text" json:"pharmacy_notes"`
	
	// QR Code for Order Tracking
	QRCode         string `gorm:"uniqueIndex;size:100" json:"qr_code"`
	
	// Relationships
	OrderItems     []OnlineOrderItem `gorm:"foreignKey:OrderID" json:"order_items,omitempty"`
	OrderHistory   []OrderStatusHistory `gorm:"foreignKey:OrderID" json:"order_history,omitempty"`
	
	// Audit
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}

type OrderStatus string

const (
	OrderStatusPending           OrderStatus = "pending"
	OrderStatusPaymentPending    OrderStatus = "payment_pending"
	OrderStatusPaid              OrderStatus = "paid"
	OrderStatusProcessing        OrderStatus = "processing"
	OrderStatusPrescriptionNeeded OrderStatus = "prescription_needed"
	OrderStatusReady             OrderStatus = "ready"
	OrderStatusOutForDelivery    OrderStatus = "out_for_delivery"
	OrderStatusDelivered         OrderStatus = "delivered"
	OrderStatusPickedUp          OrderStatus = "picked_up"
	OrderStatusCancelled         OrderStatus = "cancelled"
	OrderStatusRefunded          OrderStatus = "refunded"
)

type OrderType string

const (
	OrderTypeDelivery OrderType = "delivery"
	OrderTypePickup   OrderType = "pickup"
)

// OnlineOrderItem represents items in an online order
type OnlineOrderItem struct {
	BaseModel
	OrderID   uuid.UUID    `gorm:"type:uuid;not null;index" json:"order_id" validate:"required"`
	Order     OnlineOrder  `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	
	ProductID uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id" validate:"required"`
	Product   Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	
	Quantity    int     `gorm:"not null" json:"quantity" validate:"required,gt=0"`
	UnitPrice   float64 `gorm:"not null;type:decimal(10,2)" json:"unit_price" validate:"required,gt=0"`
	TotalPrice  float64 `gorm:"not null;type:decimal(10,2)" json:"total_price" validate:"required,gt=0"`
	Discount    float64 `gorm:"not null;type:decimal(10,2);default:0" json:"discount"`
	
	// Prescription specifics for this item
	Dosage       *string `gorm:"size:100" json:"dosage"`
	Instructions *string `gorm:"type:text" json:"instructions"`
	Duration     *string `gorm:"size:100" json:"duration"`
	
	// Fulfillment status per item
	Status       ItemStatus `gorm:"not null;default:'pending'" json:"status"`
	Notes        string     `gorm:"type:text" json:"notes"`
}

type ItemStatus string

const (
	ItemStatusPending      ItemStatus = "pending"
	ItemStatusInStock      ItemStatus = "in_stock"
	ItemStatusOutOfStock   ItemStatus = "out_of_stock"
	ItemStatusSubstituted  ItemStatus = "substituted"
	ItemStatusReady        ItemStatus = "ready"
	ItemStatusCancelled    ItemStatus = "cancelled"
)

// ShoppingCart represents items in a customer's shopping cart
type ShoppingCart struct {
	BaseModel
	CustomerID  *uuid.UUID `gorm:"type:uuid;index" json:"customer_id"`
	Customer    *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	
	// Session ID for guest users
	SessionID   *string `gorm:"size:100;index" json:"session_id"`
	
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id" validate:"required"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	
	Quantity    int     `gorm:"not null" json:"quantity" validate:"required,gt=0"`
	UnitPrice   float64 `gorm:"not null;type:decimal(10,2)" json:"unit_price" validate:"required,gt=0"`
	
	// Prescription specifics
	Dosage       *string `gorm:"size:100" json:"dosage"`
	Instructions *string `gorm:"type:text" json:"instructions"`
	Duration     *string `gorm:"size:100" json:"duration"`
	
	// Cart metadata
	AddedAt     time.Time `gorm:"not null" json:"added_at"`
	ExpiresAt   time.Time `gorm:"not null" json:"expires_at"`
}

// OrderStatusHistory tracks order status changes
type OrderStatusHistory struct {
	BaseModel
	OrderID     uuid.UUID   `gorm:"type:uuid;not null;index" json:"order_id" validate:"required"`
	Order       OnlineOrder `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	
	PreviousStatus *OrderStatus `gorm:"size:50" json:"previous_status"`
	NewStatus      OrderStatus  `gorm:"not null;size:50" json:"new_status"`
	
	Reason         string `gorm:"type:text" json:"reason"`
	Notes          string `gorm:"type:text" json:"notes"`
	
	// Staff who made the change
	UpdatedByUser  *uuid.UUID `gorm:"type:uuid" json:"updated_by_user"`
	User           *User      `gorm:"foreignKey:UpdatedByUser" json:"user,omitempty"`
	
	// System vs manual change
	IsSystemUpdate bool `gorm:"default:false" json:"is_system_update"`
}

// QRCode represents QR codes for products and customers
type QRCode struct {
	BaseModel
	Code        string    `gorm:"uniqueIndex;not null;size:100" json:"code" validate:"required"`
	Type        QRType    `gorm:"not null" json:"type" validate:"required"`
	
	// Reference to the entity
	EntityID    uuid.UUID `gorm:"type:uuid;not null" json:"entity_id" validate:"required"`
	EntityType  string    `gorm:"not null;size:50" json:"entity_type" validate:"required"`
	
	// QR Code metadata
	GeneratedBy *uuid.UUID `gorm:"type:uuid" json:"generated_by"`
	User        *User      `gorm:"foreignKey:GeneratedBy" json:"user,omitempty"`
	
	IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
	ExpiresAt   *time.Time `json:"expires_at"`
	
	// Usage tracking
	ScanCount   int       `gorm:"default:0" json:"scan_count"`
	LastScanned *time.Time `json:"last_scanned"`
	
	// Additional data encoded in QR
	Data        string `gorm:"type:text" json:"data"`
}

type QRType string

const (
	QRTypeProduct  QRType = "product"
	QRTypeCustomer QRType = "customer"
	QRTypeOrder    QRType = "order"
	QRTypePayment  QRType = "payment"
	QRTypeAuth     QRType = "auth"
)

// QRScanLog tracks QR code scans for security and analytics
type QRScanLog struct {
	BaseModel
	QRCodeID    uuid.UUID `gorm:"type:uuid;not null;index" json:"qr_code_id" validate:"required"`
	QRCode      QRCode    `gorm:"foreignKey:QRCodeID" json:"qr_code,omitempty"`
	
	// Scan context
	ScannedBy   *uuid.UUID `gorm:"type:uuid" json:"scanned_by"`
	User        *User      `gorm:"foreignKey:ScannedBy" json:"user,omitempty"`
	
	SessionID   *string `gorm:"size:100" json:"session_id"`
	IPAddress   string  `gorm:"size:45" json:"ip_address"`
	UserAgent   string  `gorm:"size:500" json:"user_agent"`
	
	// Scan result
	Success     bool   `gorm:"not null;default:true" json:"success"`
	ErrorMessage *string `gorm:"type:text" json:"error_message"`
	
	// Additional context
	ScanMethod  string `gorm:"size:50" json:"scan_method"` // mobile, web, pos, etc.
	Location    string `gorm:"size:100" json:"location"`   // store location, etc.
}

// PrescriptionUpload handles prescription image uploads
type PrescriptionUpload struct {
	BaseModel
	OrderID     *uuid.UUID   `gorm:"type:uuid;index" json:"order_id"`
	Order       *OnlineOrder `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	
	CustomerID  *uuid.UUID `gorm:"type:uuid;index" json:"customer_id"`
	Customer    *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	
	// File information
	FileName    string `gorm:"not null;size:255" json:"file_name" validate:"required"`
	FileSize    int64  `gorm:"not null" json:"file_size" validate:"required"`
	MimeType    string `gorm:"not null;size:100" json:"mime_type" validate:"required"`
	FileHash    string `gorm:"not null;size:64" json:"file_hash" validate:"required"` // SHA256
	
	// Storage information
	StoragePath   utils.EncryptedString `gorm:"type:text" json:"storage_path"`
	CloudURL      utils.EncryptedString `gorm:"type:text" json:"cloud_url"`
	
	// Verification
	VerifiedBy    *uuid.UUID `gorm:"type:uuid" json:"verified_by"`
	Pharmacist    *User      `gorm:"foreignKey:VerifiedBy" json:"pharmacist,omitempty"`
	VerifiedAt    *time.Time `json:"verified_at"`
	IsValid       *bool      `json:"is_valid"`
	
	// Notes
	VerificationNotes string `gorm:"type:text" json:"verification_notes"`
	
	// Compliance
	RetentionDate     *time.Time `json:"retention_date"`
	DeletedAt         *time.Time `json:"deleted_at"`
}