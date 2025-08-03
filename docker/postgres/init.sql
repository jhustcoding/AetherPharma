-- Initialize AetherPharma Database
-- This script sets up the initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'assistant',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    insurance_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    unit VARCHAR(50),
    barcode VARCHAR(100),
    prescription_required BOOLEAN DEFAULT false,
    expiry_date DATE,
    manufacturer VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    user_id UUID REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_type VARCHAR(50) NOT NULL DEFAULT 'pickup',
    delivery_address TEXT,
    prescription_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS online_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    order_type VARCHAR(50) NOT NULL DEFAULT 'pickup',
    delivery_address TEXT,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'normal',
    estimated_time VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_order_number ON online_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(status);

-- Insert sample data
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@aetherpharma.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin'),
('22222222-2222-2222-2222-222222222222', 'pharmacist1', 'pharmacist1@aetherpharma.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Pharmacist', 'pharmacist'),
('33333333-3333-3333-3333-333333333333', 'assistant1', 'assistant1@aetherpharma.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Assistant', 'assistant')
ON CONFLICT (username) DO NOTHING;

INSERT INTO customers (id, name, email, phone, address, medical_history, allergies, current_medications) VALUES
('44444444-4444-4444-4444-444444444444', 'Maria Santos', 'maria.santos@email.com', '+63 917 123 4567', 'Quezon City, Metro Manila', 'Hypertension', 'Penicillin', 'Losartan 50mg'),
('55555555-5555-5555-5555-555555555555', 'Juan Dela Cruz', 'juan.delacruz@email.com', '+63 918 765 4321', 'Makati City, Metro Manila', 'Diabetes Type 2', 'None', 'Metformin 500mg'),
('66666666-6666-6666-6666-666666666666', 'Ana Garcia', 'ana.garcia@email.com', '+63 919 876 5432', 'Taguig City, Metro Manila', 'Asthma', 'Aspirin', 'Salbutamol Inhaler')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, generic_name, brand, category, description, price, cost, stock, unit, barcode, prescription_required, manufacturer) VALUES
('77777777-7777-7777-7777-777777777777', 'Paracetamol 500mg', 'Paracetamol', 'Biogesic', 'Pain Relief', 'Pain reliever and fever reducer', 25.50, 18.00, 100, 'tablet', '1234567890123', false, 'Unilab'),
('88888888-8888-8888-8888-888888888888', 'Metformin 500mg', 'Metformin HCl', 'Glucophage', 'Diabetes', 'Diabetes medication', 120.00, 85.00, 50, 'tablet', '1234567890124', true, 'Merck'),
('99999999-9999-9999-9999-999999999999', 'Vitamin C 500mg', 'Ascorbic Acid', 'Conzace', 'Vitamins', 'Vitamin C supplement', 35.00, 25.00, 75, 'tablet', '1234567890125', false, 'Unilab'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Salbutamol Inhaler', 'Salbutamol', 'Ventolin', 'Respiratory', 'Bronchodilator for asthma', 180.00, 135.00, 30, 'inhaler', '1234567890126', true, 'GSK')
ON CONFLICT (id) DO NOTHING;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_online_orders_updated_at BEFORE UPDATE ON online_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pharmacy_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pharmacy_user;