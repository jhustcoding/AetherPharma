export interface Product {
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

export interface Customer {
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

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
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

export interface CustomerPurchaseHistory {
  id: string;
  customerId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  purchaseDate: string;
  prescriptionNumber?: string;
  notes?: string;
}

export interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'expiry_soon' | 'expired';
  productId: string;
  productName: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface AnalyticsMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  aovChange: number;
  conversionRate: number;
  conversionChange: number;
  returnRate: number;
  returnRateChange: number;
  dailySales: Array<{
    date: string;
    sales: number;
    orders: number;
    revenue: number;
  }>;
}

export interface CustomerAnalytics {
  activeCustomers: number;
  customerGrowth: number;
  avgSessionDuration: string;
  sessionDurationChange: number;
  segments: Array<{
    name: string;
    value: number;
  }>;
}

export interface ProductPerformance {
  name: string;
  unitsSold: number;
  revenue: number;
  category: string;
}

export interface InventoryAnalytics {
  stockLevels: Array<{
    name: string;
    value: number;
  }>;
  lowStockAlerts: Array<{
    product: string;
    quantity: number;
  }>;
  totalValue: number;
  totalItems: number;
}

export interface Prescription {
  id: string;
  customerId: string;
  doctorName: string;
  issueDate: string;
  medications: Array<{
    productId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }>;
  status: 'pending' | 'filled' | 'partially_filled' | 'expired';
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  products: string[];
  paymentTerms: string;
  rating: number;
}