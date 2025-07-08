package database

import (
	"time"
	
	"pharmacy-backend/internal/models"

	"gorm.io/gorm"
)

// Migrate runs database migrations
func Migrate(db *gorm.DB) error {
	// Enable UUID extension if using PostgreSQL
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";").Error; err != nil {
		return err
	}
	
	// Enable pgcrypto extension for encryption functions
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";").Error; err != nil {
		return err
	}

	// Auto-migrate all models
	return db.AutoMigrate(
		&models.User{},
		&models.Customer{},
		&models.Product{},
		&models.Sale{},
		&models.SaleItem{},
		&models.StockMovement{},
		&models.PurchaseHistory{},
		&models.AuditLog{},
		&models.Supplier{},
	)
}

// CreateDefaultAdmin creates a default admin user if none exists
func CreateDefaultAdmin(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count).Error; err != nil {
		return err
	}

	if count == 0 {
		// Create default admin user
		admin := models.User{
			Username:    "admin",
			Email:       "admin@pharmacy.com",
			PasswordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewD/3lCEwjvJyHHO", // password: admin123
			FirstName:   "System",
			LastName:    "Administrator",
			Role:        models.RoleAdmin,
			IsActive:    true,
		}

		if err := db.Create(&admin).Error; err != nil {
			return err
		}
	}

	return nil
}

// SeedSampleData creates sample data for development
func SeedSampleData(db *gorm.DB) error {
	// Check if data already exists
	var userCount int64
	if err := db.Model(&models.User{}).Count(&userCount).Error; err != nil {
		return err
	}

	if userCount > 1 { // More than just admin
		return nil // Data already exists
	}

	// Create sample users
	users := []models.User{
		{
			Username:    "pharmacist1",
			Email:       "pharmacist1@pharmacy.com",
			PasswordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewD/3lCEwjvJyHHO", // password: admin123
			FirstName:   "John",
			LastName:    "Pharmacist",
			Role:        models.RolePharmacist,
			IsActive:    true,
		},
		{
			Username:    "assistant1",
			Email:       "assistant1@pharmacy.com",
			PasswordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewD/3lCEwjvJyHHO", // password: admin123
			FirstName:   "Jane",
			LastName:    "Assistant",
			Role:        models.RoleAssistant,
			IsActive:    true,
		},
	}

	for _, user := range users {
		if err := db.Create(&user).Error; err != nil {
			return err
		}
	}

	// Create sample suppliers
	suppliers := []models.Supplier{
		{
			Name:          "PharmaCorp Inc.",
			ContactPerson: "Robert Johnson",
			Email:         "contact@pharmacorp.com",
			Phone:         "+1-555-0123",
			Address:       "123 Medical Center Drive",
			City:          "Manila",
			State:         "Metro Manila",
			Country:       "Philippines",
			IsActive:      true,
		},
		{
			Name:          "MedSupply Ltd.",
			ContactPerson: "Sarah Williams",
			Email:         "orders@medsupply.com",
			Phone:         "+1-555-0456",
			Address:       "456 Health Plaza",
			City:          "Quezon City",
			State:         "Metro Manila",
			Country:       "Philippines",
			IsActive:      true,
		},
	}

	for _, supplier := range suppliers {
		if err := db.Create(&supplier).Error; err != nil {
			return err
		}
	}

	// Create sample products
	products := []models.Product{
		{
			Name:                 "Paracetamol 500mg",
			GenericName:          stringPtr("Paracetamol"),
			Brand:                stringPtr("Biogesic"),
			Category:             "Analgesic",
			Manufacturer:         "United Laboratories",
			ProductType:          models.ProductTypeDrug,
			Dosage:               stringPtr("500mg"),
			Form:                 stringPtr("Tablet"),
			ActiveIngredient:     stringPtr("Paracetamol"),
			SKU:                  "PAR-500-BIO",
			Price:                5.50,
			Cost:                 3.00,
			Stock:                100,
			MinStock:             20,
			BatchNumber:          "BAT001",
			ExpiryDate:           parseDate("2025-12-31"),
			ManufactureDate:      parseDate("2023-01-15"),
			PrescriptionRequired: false,
			IsActive:             true,
			Status:               "available",
			Unit:                 "tablet",
		},
		{
			Name:                 "Amoxicillin 500mg",
			GenericName:          stringPtr("Amoxicillin"),
			Brand:                stringPtr("Amoxil"),
			Category:             "Antibiotic",
			Manufacturer:         "GlaxoSmithKline",
			ProductType:          models.ProductTypeDrug,
			Dosage:               stringPtr("500mg"),
			Form:                 stringPtr("Capsule"),
			ActiveIngredient:     stringPtr("Amoxicillin"),
			SKU:                  "AMX-500-GSK",
			Price:                25.00,
			Cost:                 18.00,
			Stock:                75,
			MinStock:             15,
			BatchNumber:          "BAT002",
			ExpiryDate:           parseDate("2025-06-30"),
			ManufactureDate:      parseDate("2023-06-15"),
			PrescriptionRequired: true,
			IsActive:             true,
			Status:               "available",
			Unit:                 "capsule",
		},
		{
			Name:         "Vitamin C 1000mg",
			Category:     "Vitamin",
			Manufacturer: "Healthmax",
			ProductType:  models.ProductTypeGrocery,
			SKU:          "VIT-C-1000",
			Price:        15.00,
			Cost:         10.00,
			Stock:        50,
			MinStock:     10,
			BatchNumber:  "BAT003",
			ExpiryDate:   parseDate("2025-12-31"),
			ManufactureDate: parseDate("2023-01-01"),
			IsActive:     true,
			Status:       "available",
			Unit:         "tablet",
		},
	}

	for _, product := range products {
		if err := db.Create(&product).Error; err != nil {
			return err
		}
	}

	// Create sample customers
	customers := []models.Customer{
		{
			FirstName:   "Maria",
			LastName:    "Santos",
			Email:       "maria.santos@email.com",
			Phone:       "+63-917-123-4567",
			DateOfBirth: parseDate("1985-05-15"),
			Address:     "123 Main Street",
			City:        "Manila",
			State:       "Metro Manila",
			ZipCode:     "1000",
			Country:     "Philippines",
			QRCode:      "CUS001",
		},
		{
			FirstName:   "Juan",
			LastName:    "Dela Cruz",
			Email:       "juan.delacruz@email.com",
			Phone:       "+63-917-765-4321",
			DateOfBirth: parseDate("1975-10-20"),
			Address:     "456 Oak Avenue",
			City:        "Quezon City",
			State:       "Metro Manila",
			ZipCode:     "1100",
			Country:     "Philippines",
			QRCode:      "CUS002",
		},
	}

	for _, customer := range customers {
		if err := db.Create(&customer).Error; err != nil {
			return err
		}
	}

	return nil
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func parseDate(dateStr string) time.Time {
	t, _ := time.Parse("2006-01-02", dateStr)
	return t
}