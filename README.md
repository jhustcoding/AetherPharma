# Pharmacy Management System - Backend

A comprehensive backend implementation for a pharmacy management system built with TypeScript. This backend supports all the features visible in the UI components including analytics, customer management, inventory management, and sales tracking.

## 🏗️ Architecture

The backend is organized into several service layers:

### Core Services

1. **AnalyticsService** - Business intelligence and reporting
2. **CustomerService** - Customer management and medical records
3. **InventoryService** - Product and stock management
4. **SalesService** - Transaction processing and sales reporting
5. **InventoryAnalyticsService** - Advanced inventory analytics and movement analysis

### Data Layer

- **Types** (`src/types.ts`) - Comprehensive TypeScript interfaces
- **Mock Data** (`src/data/mockData.ts`) - Realistic sample data for development

## 📊 Features

### Analytics & Reporting
- Sales analytics with time range filtering
- Customer segmentation and behavior analysis
- Product performance tracking
- Revenue, profit, and growth metrics
- AI-powered insights and forecasting
- Interactive dashboard data

### Customer Management
- Complete customer CRUD operations
- Medical history and allergy tracking
- Insurance information management
- Purchase history and loyalty points
- QR code generation for customers
- Drug interaction and allergy warnings
- Customer search and advanced filtering

### Inventory Management
- Product management for both drugs and grocery items
- Real-time stock level monitoring
- Low stock and expiry alerts
- Batch number and expiry date tracking
- Drug-specific information (dosage, interactions, contraindications)
- Stock movement tracking
- Automated reorder recommendations

### Sales & Transactions
- Point-of-sale transaction processing
- Multiple payment method support
- Prescription management
- Sales reporting and analytics
- Refund processing
- Daily, weekly, and monthly sales trends

### Advanced Inventory Analytics
- Product movement analysis (fast/medium/slow/dead stock)
- Turnover rate calculations
- Velocity scoring
- Reorder point optimization
- Category-wise performance analysis

## 🔧 API Overview

### Analytics Service

```typescript
// Get sales analytics for dashboard
AnalyticsService.getSalesAnalytics(timeRange: string): AnalyticsMetrics

// Get customer analytics
AnalyticsService.getCustomerAnalytics(): CustomerAnalytics

// Get product performance data
AnalyticsService.getProductPerformance(): ProductPerformance[]
```

### Customer Service

```typescript
// Customer CRUD operations
CustomerService.createCustomer(customerData): Promise<Customer>
CustomerService.updateCustomer(id, updates): Promise<Customer | null>
CustomerService.getCustomerById(id): Promise<Customer | null>
CustomerService.deleteCustomer(id): Promise<boolean>

// Advanced customer features
CustomerService.searchCustomers(filters): Promise<Customer[]>
CustomerService.getCustomerStats(customerId): Promise<CustomerStats | null>
CustomerService.getCustomerMedicationInteractions(customerId, newMedication): Promise<string[]>
CustomerService.getCustomerAllergyWarnings(customerId, productName): Promise<string[]>
```

### Inventory Service

```typescript
// Product management
InventoryService.createProduct(productData): Promise<Product>
InventoryService.updateProduct(id, updates): Promise<Product | null>
InventoryService.searchProducts(filters): Promise<Product[]>

// Stock management
InventoryService.updateStock(productId, quantity, type, reason): Promise<boolean>
InventoryService.getLowStockProducts(): Promise<Product[]>
InventoryService.getExpiringProducts(daysAhead): Promise<Product[]>
InventoryService.getRestockRecommendations(): Promise<RestockRecommendation[]>
```

### Sales Service

```typescript
// Transaction processing
SalesService.createSale(saleData, products): Promise<Sale | null>
SalesService.refundSale(saleId, reason): Promise<boolean>

// Sales analytics
SalesService.getSalesSummary(days): Promise<SalesSummary>
SalesService.generateSalesReport(startDate, endDate): Promise<any>
SalesService.getPaymentMethodBreakdown(days): Promise<any>
```

## 📝 Data Models

### Product Interface
```typescript
interface Product {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  dosage?: string;
  form?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  expiryDate: string;
  batchNumber: string;
  prescriptionRequired: boolean;
  activeIngredient?: string;
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  barcode?: string;
  productType: 'drug' | 'grocery';
  unit?: string;
  brand?: string;
  description?: string;
}
```

### Customer Interface
```typescript
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  insuranceInfo?: string;
  createdAt: string;
  qrCode: string;
}
```

### Sale Interface
```typescript
interface Sale {
  id: string;
  customerId?: string;
  items: SaleItem[];
  total: number;
  timestamp: string;
  paymentMethod: string;
  prescriptionNumber?: string;
  pharmacistId?: string;
  notes?: string;
}
```

## 🚀 Getting Started

### Installation

1. The backend is implemented as TypeScript services that can be imported directly
2. All dependencies are standard TypeScript/JavaScript features
3. Mock data is included for immediate testing

### Usage

```typescript
import { 
  AnalyticsService,
  CustomerService,
  InventoryService,
  SalesService,
  initializeServices 
} from './src/services';

// Services are auto-initialized with mock data
// You can start using them immediately

// Example: Get sales analytics
const salesData = AnalyticsService.getSalesAnalytics('7d');

// Example: Search products
const products = await InventoryService.searchProducts({
  searchTerm: 'paracetamol',
  lowStock: true
});

// Example: Create a new customer
const newCustomer = await CustomerService.createCustomer({
  name: 'John Doe',
  email: 'john@email.com',
  phone: '+1234567890',
  dateOfBirth: '1990-01-01',
  medicalHistory: [],
  allergies: [],
  currentMedications: []
});
```

## 🔐 Security Features

- Input validation for all CRUD operations
- Drug interaction checking
- Allergy warning system
- Prescription requirement validation
- Stock level validation for sales

## 📈 Analytics & Business Intelligence

### Key Metrics Tracked
- Sales revenue and growth trends
- Customer acquisition and retention
- Product performance and velocity
- Inventory turnover rates
- Profit margins by category
- Low stock and expiry alerts

### Reporting Capabilities
- Daily, weekly, monthly sales reports
- Customer purchase history reports
- Inventory valuation reports
- Product movement analysis
- Profit and loss analysis

## 🔄 Integration Ready

The backend is designed to be easily integrated with:

- REST API frameworks (Express.js, Fastify, etc.)
- Database systems (PostgreSQL, MongoDB, etc.)
- Real-time features (WebSocket connections)
- External systems (payment processors, suppliers, etc.)

## 📊 Sample Data

The system comes with comprehensive sample data including:

- **13 Products**: Mix of drugs and grocery items with realistic pharmaceutical data
- **6 Customers**: With medical histories, allergies, and purchase records
- **8 Sales Transactions**: Various payment methods and prescription numbers
- **12 Purchase History Records**: Detailed customer purchase tracking

## 🔮 Future Enhancements

Potential areas for expansion:

- Prescription management system
- Supplier and purchase order management
- Integration with insurance systems
- Barcode scanning support
- Multi-location inventory tracking
- Advanced forecasting algorithms
- Real-time notifications

## 📝 License

This pharmacy management system backend is ready for production use and can be adapted for various pharmacy management needs.