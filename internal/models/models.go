package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
	
	"pharmacy-backend/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Alias types for convenience
type EncryptedString = utils.EncryptedString
type EncryptedStringArray = utils.EncryptedStringArray

// StringArray for handling PostgreSQL arrays
type StringArray []string

func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = StringArray{}
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, s)
	case string:
		return json.Unmarshal([]byte(v), s)
	default:
		return fmt.Errorf("cannot scan %T into StringArray", value)
	}
}

func (s StringArray) Value() (driver.Value, error) {
	if len(s) == 0 {
		return nil, nil
	}
	return json.Marshal(s)
}

// Base model with audit fields
type BaseModel struct {
	ID        uuid.UUID  `gorm:"type:uuid;primarykey;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time  `gorm:"not null" json:"created_at"`
	UpdatedAt time.Time  `gorm:"not null" json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

func (base *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if base.ID == uuid.Nil {
		base.ID = uuid.New()
	}
	return nil
}

// User model for authentication and authorization
type User struct {
	BaseModel
	Username      string    `gorm:"uniqueIndex;not null;size:50" json:"username" validate:"required,min=3,max=50"`
	Email         string    `gorm:"uniqueIndex;not null;size:255" json:"email" validate:"required,email"`
	PasswordHash  string    `gorm:"not null;size:255" json:"-"` // Never expose in JSON
	FirstName     string    `gorm:"not null;size:100" json:"first_name" validate:"required,max=100"`
	LastName      string    `gorm:"not null;size:100" json:"last_name" validate:"required,max=100"`
	Role          UserRole  `gorm:"not null;default:'pharmacist'" json:"role"`
	IsActive      bool      `gorm:"not null;default:true" json:"is_active"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	
	// Security fields
	FailedLoginAttempts int       `gorm:"default:0" json:"-"`
	LockedUntil        *time.Time `json:"-"`
	
	// Audit trail
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}

type UserRole string

const (
	RoleAdmin       UserRole = "admin"
	RolePharmacist  UserRole = "pharmacist"
	RoleAssistant   UserRole = "assistant"
	RoleManager     UserRole = "manager"
)

func (r UserRole) IsValid() bool {
	switch r {
	case RoleAdmin, RolePharmacist, RoleAssistant, RoleManager:
		return true
	}
	return false
}

// Customer model with encrypted medical data
type Customer struct {
	BaseModel
	// Basic Information
	FirstName   string `gorm:"not null;size:100" json:"first_name" validate:"required,max=100"`
	LastName    string `gorm:"not null;size:100" json:"last_name" validate:"required,max=100"`
	Email       string `gorm:"uniqueIndex;size:255" json:"email" validate:"email"`
	Phone       string `gorm:"not null;size:20" json:"phone" validate:"required,phone"`
	DateOfBirth time.Time `gorm:"not null" json:"date_of_birth" validate:"required"`
	
	// Address
	Address    string `gorm:"size:255" json:"address"`
	City       string `gorm:"size:100" json:"city"`
	State      string `gorm:"size:100" json:"state"`
	ZipCode    string `gorm:"size:20" json:"zip_code"`
	Country    string `gorm:"size:100;default:'Philippines'" json:"country"`
	
	// Medical Information (Encrypted)
	MedicalHistory     EncryptedStringArray `gorm:"type:text" json:"medical_history"`
	Allergies          EncryptedStringArray `gorm:"type:text" json:"allergies"`
	CurrentMedications EncryptedStringArray `gorm:"type:text" json:"current_medications"`
	BloodType          EncryptedString      `gorm:"size:10" json:"blood_type"`
	
	// Insurance
	InsuranceProvider EncryptedString `gorm:"size:255" json:"insurance_provider"`
	InsuranceNumber   EncryptedString `gorm:"size:100" json:"insurance_number"`
	
	// Customer metadata
	QRCode           string    `gorm:"uniqueIndex;size:50" json:"qr_code"`
	LoyaltyPoints    int       `gorm:"default:0" json:"loyalty_points"`
	PreferredContact string    `gorm:"size:20;default:'email'" json:"preferred_contact"`
	
	// Privacy and compliance
	ConsentDate      *time.Time `json:"consent_date"`
	DataRetentionDate *time.Time `json:"data_retention_date"`
	
	// Relationships
	Sales            []Sale            `gorm:"foreignKey:CustomerID" json:"sales,omitempty"`
	PurchaseHistory  []PurchaseHistory `gorm:"foreignKey:CustomerID" json:"purchase_history,omitempty"`
	
	// Audit
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}

// Product model for inventory management
type Product struct {
	BaseModel
	// Basic Information
	Name         string      `gorm:"not null;size:255" json:"name" validate:"required,max=255"`
	GenericName  *string     `gorm:"size:255" json:"generic_name"`
	Brand        *string     `gorm:"size:255" json:"brand"`
	Category     string      `gorm:"not null;size:100;index" json:"category" validate:"required,max=100"`
	Manufacturer string      `gorm:"not null;size:255" json:"manufacturer" validate:"required,max=255"`
	ProductType  ProductType `gorm:"not null;default:'drug'" json:"product_type"`
	
	// Drug-specific information
	Dosage           *string     `gorm:"size:100" json:"dosage"`
	Form             *string     `gorm:"size:100" json:"form"`
	ActiveIngredient *string     `gorm:"size:255" json:"active_ingredient"`
	Contraindications StringArray `gorm:"type:jsonb" json:"contraindications"`
	SideEffects      StringArray `gorm:"type:jsonb" json:"side_effects"`
	DrugInteractions StringArray `gorm:"type:jsonb" json:"drug_interactions"`
	
	// Inventory Information
	SKU              string  `gorm:"uniqueIndex;not null;size:100" json:"sku" validate:"required"`
	Barcode          *string `gorm:"uniqueIndex;size:100" json:"barcode"`
	Price            float64 `gorm:"not null;type:decimal(10,2)" json:"price" validate:"required,gt=0"`
	Cost             float64 `gorm:"not null;type:decimal(10,2)" json:"cost" validate:"required,gt=0"`
	Stock            int     `gorm:"not null;default:0" json:"stock"`
	MinStock         int     `gorm:"not null;default:10" json:"min_stock"`
	MaxStock         int     `gorm:"not null;default:1000" json:"max_stock"`
	Unit             string  `gorm:"not null;size:50;default:'piece'" json:"unit"`
	
	// Compliance and Safety
	BatchNumber          string     `gorm:"not null;size:100" json:"batch_number" validate:"required"`
	ExpiryDate          time.Time  `gorm:"not null" json:"expiry_date" validate:"required"`
	ManufactureDate     time.Time  `gorm:"not null" json:"manufacture_date" validate:"required"`
	PrescriptionRequired bool       `gorm:"not null;default:false" json:"prescription_required"`
	ControlledSubstance  bool       `gorm:"not null;default:false" json:"controlled_substance"`
	FDAApproved         bool       `gorm:"not null;default:true" json:"fda_approved"`
	
	// Storage Information
	StorageConditions   string  `gorm:"size:255" json:"storage_conditions"`
	StorageTemperature  *string `gorm:"size:50" json:"storage_temperature"`
	StorageLocation     string  `gorm:"size:100" json:"storage_location"`
	
	// Business Information
	SupplierID     *uuid.UUID `gorm:"type:uuid" json:"supplier_id"`
	ReorderLevel   int        `gorm:"default:0" json:"reorder_level"`
	ReorderQuantity int       `gorm:"default:0" json:"reorder_quantity"`
	
	// Status
	IsActive     bool   `gorm:"not null;default:true" json:"is_active"`
	Status       string `gorm:"size:50;default:'available'" json:"status"`
	Description  string `gorm:"type:text" json:"description"`
	
	// Relationships
	SaleItems       []SaleItem       `gorm:"foreignKey:ProductID" json:"sale_items,omitempty"`
	StockMovements  []StockMovement  `gorm:"foreignKey:ProductID" json:"stock_movements,omitempty"`
	PurchaseHistory []PurchaseHistory `gorm:"foreignKey:ProductID" json:"purchase_history,omitempty"`
	
	// Audit
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}

type ProductType string

const (
	ProductTypeDrug    ProductType = "drug"
	ProductTypeGrocery ProductType = "grocery"
)

// Sale model for transactions
type Sale struct {
	BaseModel
	CustomerID      *uuid.UUID `gorm:"type:uuid;index" json:"customer_id"`
	Customer        *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	
	// Transaction Information
	SaleNumber       string    `gorm:"uniqueIndex;not null;size:50" json:"sale_number" validate:"required"`
	Total            float64   `gorm:"not null;type:decimal(10,2)" json:"total" validate:"required,gt=0"`
	Subtotal         float64   `gorm:"not null;type:decimal(10,2)" json:"subtotal"`
	Tax              float64   `gorm:"not null;type:decimal(10,2);default:0" json:"tax"`
	Discount         float64   `gorm:"not null;type:decimal(10,2);default:0" json:"discount"`
	
	// Payment Information
	PaymentMethod    string     `gorm:"not null;size:50" json:"payment_method" validate:"required"`
	PaymentStatus    string     `gorm:"not null;size:50;default:'completed'" json:"payment_status"`
	PaymentReference *string    `gorm:"size:100" json:"payment_reference"`
	
	// Prescription Information
	PrescriptionNumber *string    `gorm:"size:100" json:"prescription_number"`
	PrescribedBy      *string    `gorm:"size:255" json:"prescribed_by"`
	PrescriptionDate  *time.Time `json:"prescription_date"`
	
	// Staff Information
	PharmacistID *uuid.UUID `gorm:"type:uuid;not null" json:"pharmacist_id" validate:"required"`
	Pharmacist   *User      `gorm:"foreignKey:PharmacistID" json:"pharmacist,omitempty"`
	CashierID    *uuid.UUID `gorm:"type:uuid" json:"cashier_id"`
	Cashier      *User      `gorm:"foreignKey:CashierID" json:"cashier,omitempty"`
	
	// Additional Information
	Notes         string `gorm:"type:text" json:"notes"`
	CustomerNotes string `gorm:"type:text" json:"customer_notes"`
	
	// Status and Compliance
	Status        string     `gorm:"not null;size:50;default:'completed'" json:"status"`
	RefundedAt    *time.Time `json:"refunded_at"`
	RefundReason  *string    `gorm:"type:text" json:"refund_reason"`
	
	// Relationships
	SaleItems []SaleItem `gorm:"foreignKey:SaleID" json:"sale_items,omitempty"`
	
	// Audit
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}

// SaleItem model for sale line items
type SaleItem struct {
	BaseModel
	SaleID    uuid.UUID `gorm:"type:uuid;not null;index" json:"sale_id" validate:"required"`
	Sale      Sale      `gorm:"foreignKey:SaleID" json:"sale,omitempty"`
	
	ProductID uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id" validate:"required"`
	Product   Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	
	Quantity    int     `gorm:"not null" json:"quantity" validate:"required,gt=0"`
	UnitPrice   float64 `gorm:"not null;type:decimal(10,2)" json:"unit_price" validate:"required,gt=0"`
	TotalPrice  float64 `gorm:"not null;type:decimal(10,2)" json:"total_price" validate:"required,gt=0"`
	Discount    float64 `gorm:"not null;type:decimal(10,2);default:0" json:"discount"`
	
	// Batch Information for traceability
	BatchNumber string `gorm:"size:100" json:"batch_number"`
	ExpiryDate  *time.Time `json:"expiry_date"`
	
	// Prescription specifics for this item
	Dosage      *string `gorm:"size:100" json:"dosage"`
	Instructions *string `gorm:"type:text" json:"instructions"`
	Duration    *string `gorm:"size:100" json:"duration"`
}

// StockMovement model for inventory tracking
type StockMovement struct {
	BaseModel
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id" validate:"required"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	
	Type        MovementType `gorm:"not null" json:"type" validate:"required"`
	Quantity    int          `gorm:"not null" json:"quantity" validate:"required"`
	Reason      string       `gorm:"not null;size:255" json:"reason" validate:"required"`
	Reference   *string      `gorm:"size:100" json:"reference"`
	
	// Before and after stock levels for audit
	StockBefore int `gorm:"not null" json:"stock_before"`
	StockAfter  int `gorm:"not null" json:"stock_after"`
	
	// Batch Information
	BatchNumber string `gorm:"size:100" json:"batch_number"`
	
	// Staff Information
	UserID uuid.UUID `gorm:"type:uuid;not null" json:"user_id" validate:"required"`
	User   User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	
	// Additional Details
	Cost        *float64 `gorm:"type:decimal(10,2)" json:"cost"`
	SupplierID  *uuid.UUID `gorm:"type:uuid" json:"supplier_id"`
	Notes       string   `gorm:"type:text" json:"notes"`
}

type MovementType string

const (
	MovementTypeIn         MovementType = "in"
	MovementTypeOut        MovementType = "out"
	MovementTypeAdjustment MovementType = "adjustment"
	MovementTypeTransfer   MovementType = "transfer"
	MovementTypeReturn     MovementType = "return"
	MovementTypeExpired    MovementType = "expired"
	MovementTypeDamaged    MovementType = "damaged"
)

// PurchaseHistory model for customer purchase tracking
type PurchaseHistory struct {
	BaseModel
	CustomerID      uuid.UUID `gorm:"type:uuid;not null;index" json:"customer_id" validate:"required"`
	Customer        Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	
	ProductID       uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id" validate:"required"`
	Product         Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	
	SaleID          *uuid.UUID `gorm:"type:uuid;index" json:"sale_id"`
	Sale            *Sale     `gorm:"foreignKey:SaleID" json:"sale,omitempty"`
	
	Quantity        int       `gorm:"not null" json:"quantity" validate:"required,gt=0"`
	UnitPrice       float64   `gorm:"not null;type:decimal(10,2)" json:"unit_price" validate:"required,gt=0"`
	TotalPrice      float64   `gorm:"not null;type:decimal(10,2)" json:"total_price" validate:"required,gt=0"`
	
	PurchaseDate    time.Time `gorm:"not null;index" json:"purchase_date"`
	
	// Prescription Information
	PrescriptionNumber *string `gorm:"size:100" json:"prescription_number"`
	PrescribedBy      *string `gorm:"size:255" json:"prescribed_by"`
	
	// Notes
	Notes           string `gorm:"type:text" json:"notes"`
}

// AuditLog model for compliance and security
type AuditLog struct {
	BaseModel
	UserID      *uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	User        *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	
	Action      string `gorm:"not null;size:100;index" json:"action" validate:"required"`
	Resource    string `gorm:"not null;size:100;index" json:"resource" validate:"required"`
	ResourceID  *string `gorm:"size:100;index" json:"resource_id"`
	
	// Details
	OldValues   string `gorm:"type:jsonb" json:"old_values,omitempty"`
	NewValues   string `gorm:"type:jsonb" json:"new_values,omitempty"`
	
	// Request Information
	IPAddress   string  `gorm:"size:45" json:"ip_address"`
	UserAgent   string  `gorm:"size:500" json:"user_agent"`
	RequestID   *string `gorm:"size:100" json:"request_id"`
	
	// Additional Context
	Success     bool   `gorm:"not null;default:true" json:"success"`
	ErrorMessage *string `gorm:"type:text" json:"error_message"`
	Duration    *int   `json:"duration_ms"`
}

// Supplier model for vendor management
type Supplier struct {
	BaseModel
	Name            string `gorm:"not null;size:255" json:"name" validate:"required,max=255"`
	ContactPerson   string `gorm:"not null;size:255" json:"contact_person" validate:"required,max=255"`
	Email           string `gorm:"not null;size:255" json:"email" validate:"required,email"`
	Phone           string `gorm:"not null;size:20" json:"phone" validate:"required"`
	
	// Address
	Address         string `gorm:"size:255" json:"address"`
	City            string `gorm:"size:100" json:"city"`
	State           string `gorm:"size:100" json:"state"`
	ZipCode         string `gorm:"size:20" json:"zip_code"`
	Country         string `gorm:"size:100;default:'Philippines'" json:"country"`
	
	// Business Information
	TaxID           *string `gorm:"size:50" json:"tax_id"`
	LicenseNumber   *string `gorm:"size:100" json:"license_number"`
	PaymentTerms    string  `gorm:"size:100;default:'NET 30'" json:"payment_terms"`
	
	// Status
	IsActive        bool    `gorm:"not null;default:true" json:"is_active"`
	Rating          float32 `gorm:"type:decimal(3,2);default:0" json:"rating"`
	
	// Relationships
	Products        []Product       `gorm:"foreignKey:SupplierID" json:"products,omitempty"`
	StockMovements  []StockMovement `gorm:"foreignKey:SupplierID" json:"stock_movements,omitempty"`
	
	// Audit
	CreatedBy       *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	UpdatedBy       *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}