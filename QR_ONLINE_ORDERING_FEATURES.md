# QR Scanning & Online Ordering Features

## 🆕 New Features Added

I've successfully added comprehensive **QR scanning** and **online ordering** functionality to the secure pharmacy backend:

## 🔍 QR Code System

### Features
- **Product QR Codes**: Generate QR codes for products with embedded pricing, batch info, expiry dates
- **Customer QR Codes**: Generate QR codes for customer loyalty and quick identification  
- **Order QR Codes**: Automatic QR generation for order tracking
- **Secure Scanning**: Track all QR scans with audit logs and analytics
- **Multi-device Support**: Works on mobile, web, POS systems

### QR Code Data Structure
```json
{
  "type": "product|customer|order|payment|auth",
  "entity_id": "uuid",
  "entity_type": "product",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0",
  "extra": {
    "product_id": "uuid",
    "sku": "PAR-500-BIO",
    "name": "Paracetamol 500mg",
    "price": 5.50,
    "batch_number": "BAT001",
    "expiry_date": "2025-12-31",
    "prescription_required": false
  }
}
```

### API Endpoints

#### QR Generation
```bash
# Generate Product QR Code
POST /api/v1/qr/products/{id}/generate
Authorization: Bearer {token}

# Generate Customer QR Code  
POST /api/v1/qr/customers/{id}/generate
Authorization: Bearer {token}
```

#### QR Scanning
```bash
# Scan QR Code (Public - No Auth Required)
POST /api/v1/qr/scan
Content-Type: application/json
X-Session-ID: guest-session-123 (for guest users)

{
  "code": "encoded-qr-string",
  "scan_method": "mobile|web|pos",
  "location": "pharmacy-main"
}
```

#### Response
```json
{
  "scan_result": {
    "qr_code": {...},
    "data": {...},
    "entity_id": "uuid",
    "entity_type": "product",
    "type": "product",
    "scan_time": "2024-01-15T10:30:00Z"
  },
  "entity": {
    "id": "uuid",
    "name": "Paracetamol 500mg",
    "price": 5.50,
    "stock": 100,
    "prescription_required": false
  }
}
```

## 🛒 Online Ordering System

### Features
- **Shopping Cart**: Add/remove/update items with session persistence
- **Guest Orders**: Allow non-registered users to place orders
- **Registered Customer Orders**: Full account integration
- **Prescription Support**: Handle prescription requirements and uploads
- **Order Tracking**: Real-time status updates with QR codes
- **Delivery Management**: Address encryption, delivery scheduling
- **Status Workflow**: Complete order lifecycle management

### Order Statuses
- `pending` → `payment_pending` → `paid` → `processing` → `ready` → `out_for_delivery` → `delivered`
- `prescription_needed` (for prescription drugs)
- `cancelled`, `refunded`

### Shopping Cart API

#### Add to Cart
```bash
POST /api/v1/cart/add
Content-Type: application/json
X-Session-ID: guest-session-123 (for guests)
Authorization: Bearer {token} (for registered users)

{
  "product_id": "uuid",
  "quantity": 2,
  "dosage": "500mg twice daily",
  "instructions": "Take with food",
  "duration": "7 days"
}
```

#### Get Cart
```bash
GET /api/v1/cart
X-Session-ID: guest-session-123 (for guests)
Authorization: Bearer {token} (for registered users)
```

#### Response
```json
{
  "cart_items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product": {
        "name": "Paracetamol 500mg",
        "price": 5.50,
        "prescription_required": false
      },
      "quantity": 2,
      "unit_price": 5.50,
      "dosage": "500mg twice daily",
      "added_at": "2024-01-15T10:30:00Z",
      "expires_at": "2024-01-16T10:30:00Z"
    }
  ],
  "summary": {
    "total_items": 2,
    "total_amount": 11.00,
    "item_count": 1
  }
}
```

### Order Management API

#### Create Order
```bash
POST /api/v1/orders
Content-Type: application/json
X-Session-ID: guest-session-123 (for guest orders)
Authorization: Bearer {token} (for registered users)

{
  "order_type": "delivery|pickup",
  "delivery_address": "123 Main St, Manila",
  "delivery_city": "Manila",
  "delivery_state": "Metro Manila",
  "delivery_zip_code": "1000",
  "delivery_notes": "Leave at front door",
  "customer_notes": "Please call before delivery",
  
  // For guest orders (required if not authenticated)
  "guest_email": "customer@email.com",
  "guest_phone": "+63-917-123-4567",
  "guest_name": "John Doe"
}
```

#### Order Response
```json
{
  "order": {
    "id": "uuid",
    "order_number": "ORD-20240115-a1b2c3d4",
    "status": "pending",
    "order_type": "delivery",
    "subtotal": 11.00,
    "tax": 1.32,
    "delivery_fee": 50.00,
    "total": 62.32,
    "prescription_required": false,
    "expected_delivery_date": "2024-01-18T10:30:00Z",
    "qr_code": "tracking-qr-code",
    "order_items": [...],
    "customer": {...}
  },
  "message": "Order created successfully",
  "qr_code": "tracking-qr-code"
}
```

#### Track Order (Public - No Auth)
```bash
GET /api/v1/orders/track/{order_number}
```

#### Response
```json
{
  "tracking": {
    "order_number": "ORD-20240115-a1b2c3d4",
    "status": "processing",
    "order_type": "delivery",
    "created_at": "2024-01-15T10:30:00Z",
    "expected_delivery": "2024-01-18T10:30:00Z",
    "status_history": [
      {
        "status": "pending",
        "timestamp": "2024-01-15T10:30:00Z",
        "reason": "Order created"
      },
      {
        "status": "paid",
        "timestamp": "2024-01-15T10:35:00Z",
        "reason": "Payment confirmed"
      }
    ]
  }
}
```

## 🔐 Security Features

### For QR Codes
- **Scan Audit Logging**: Every scan tracked with IP, user agent, location
- **Anti-fraud Protection**: QR codes can expire and be deactivated
- **Usage Analytics**: Track scan frequency and patterns
- **Secure Generation**: Cryptographically secure QR code generation

### For Online Orders
- **Address Encryption**: Delivery addresses encrypted using AES-256
- **Guest Session Security**: Secure session management for guest users
- **Order Access Control**: Customers can only access their own orders
- **Payment Security**: Secure payment reference handling
- **Prescription Verification**: Secure prescription upload and verification

## 📊 Database Schema

### New Tables Added
- `qr_codes` - QR code storage and metadata
- `qr_scan_logs` - QR scan audit trail
- `shopping_carts` - Cart items for customers and guests
- `online_orders` - Online order records
- `online_order_items` - Order line items
- `order_status_history` - Order status change tracking
- `prescription_uploads` - Prescription file management

### Key Relationships
```sql
-- QR Codes can reference any entity (polymorphic)
qr_codes.entity_id → products.id | customers.id | orders.id

-- Shopping cart supports both registered and guest users
shopping_carts.customer_id → customers.id (nullable)
shopping_carts.session_id → session string (nullable)

-- Orders support both registered and guest customers
online_orders.customer_id → customers.id (nullable)
online_orders.guest_email, guest_phone, guest_name (for guests)

-- Complete audit trail
order_status_history.order_id → online_orders.id
qr_scan_logs.qr_code_id → qr_codes.id
```

## 🚀 Usage Examples

### Mobile App QR Scanning
```javascript
// Mobile app scanning a product QR code
const scanResult = await fetch('/api/v1/qr/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': deviceSessionId
  },
  body: JSON.stringify({
    code: scannedQRCode,
    scan_method: 'mobile',
    location: 'customer-home'
  })
});

const { entity } = await scanResult.json();
// Now you have the product info: name, price, stock, etc.
```

### Guest Shopping Flow
```javascript
// 1. Add items to cart (guest user)
await fetch('/api/v1/cart/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': 'guest-session-123'
  },
  body: JSON.stringify({
    product_id: 'product-uuid',
    quantity: 2
  })
});

// 2. Create order
const order = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-ID': 'guest-session-123'
  },
  body: JSON.stringify({
    order_type: 'delivery',
    guest_email: 'customer@email.com',
    guest_phone: '+63-917-123-4567',
    guest_name: 'John Doe',
    delivery_address: '123 Main St, Manila'
  })
});

// 3. Track order (public access)
const tracking = await fetch(`/api/v1/orders/track/${orderNumber}`);
```

### Staff Order Management
```javascript
// Update order status (requires authentication)
await fetch(`/api/v1/orders/${orderId}/status`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${staffToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'processing',
    reason: 'Prescription verified, preparing order'
  })
});
```

## 🏥 HIPAA Compliance

### Medical Data Protection
- **Prescription Uploads**: Encrypted file storage with access controls
- **Medical Instructions**: Dosage and instructions encrypted in cart/orders
- **Audit Trails**: Complete HIPAA-compliant audit logging
- **Access Controls**: Role-based access to medical information
- **Data Retention**: Configurable retention policies

### Compliance Features
- Encrypted medical data in orders and prescriptions
- Comprehensive audit logging for all medical data access
- Secure file upload and storage for prescription images
- Role-based access controls for pharmacy staff
- Data retention and secure deletion policies

## 🔧 Configuration

### Environment Variables
```env
# QR Code Settings
QR_EXPIRATION_HOURS=24
QR_MAX_SCANS_PER_CODE=1000

# Cart Settings  
CART_EXPIRATION_HOURS=24
GUEST_SESSION_EXPIRATION_HOURS=72

# Order Settings
DEFAULT_DELIVERY_FEE=50.00
DEFAULT_TAX_RATE=0.12
ORDER_EXPIRATION_DAYS=30

# Security
HIPAA_MODE=true
AUDIT_LOGGING=true
ENCRYPTION_KEY=your-32-character-encryption-key
```

## 📱 Mobile Integration Ready

The API is designed to support mobile applications with:
- **Offline QR Scanning**: QR codes work even when scanned offline
- **Session Management**: Persistent cart across app sessions
- **Push Notifications**: Order status updates (webhook ready)
- **Guest Checkout**: No registration required for purchases
- **Progressive Web App**: Full PWA support for mobile web

## 🎯 Business Benefits

### For Customers
- **Quick Product Info**: Scan QR codes for instant product details
- **Easy Ordering**: Add to cart by scanning, order from home
- **Order Tracking**: Real-time order status with QR tracking
- **Prescription Management**: Upload prescriptions digitally
- **Guest Checkout**: No registration required

### For Pharmacy
- **Inventory Tracking**: QR-based stock management
- **Customer Analytics**: Track customer scanning and purchase patterns
- **Order Management**: Complete online order fulfillment system
- **Staff Efficiency**: QR-based workflows for staff
- **Compliance**: HIPAA-compliant digital prescription handling

The system is now fully equipped with modern e-commerce and QR scanning capabilities while maintaining the highest security standards for medical data! 🚀