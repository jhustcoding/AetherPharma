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
  prescription_required?: boolean; // API field name (snake_case)
  activeIngredient?: string;
  therapeuticClassification?: string;
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  drugInteractions?: string[]; // Alias for interactions
  barcode?: string;
  sku?: string; // Product SKU
  productType: 'drug' | 'grocery';
  drugType?: 'generic' | 'branded';
  unit?: string;
  brand?: string;
  description?: string;
  suppliers?: Supplier[];
  supplierIds?: string[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  agentName?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  licenseNumber?: string;
  paymentTerms?: string;
  orderingInstructions?: string;
  isActive: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export type ServiceCategory = 
  | 'vaccination'
  | 'health_screening'
  | 'consultation'
  | 'lab_test'
  | 'wound_care'
  | 'injection'
  | 'other';

export interface Service {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: ServiceCategory;
  price: number;
  duration: number; // Duration in minutes
  requiresAppointment: boolean;
  requiresPrescription: boolean;
  requiresQualifiedStaff: boolean;
  isActive: boolean;
  maxDailySlots: number; // 0 means unlimited
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  // Support both naming conventions
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  dateOfBirth?: string;
  medical_history?: string[];
  medicalHistory?: string[];
  allergies?: string[];
  current_medications?: string[];
  currentMedications?: string[];
  insurance_info?: string;
  insuranceInfo?: string;
  created_at?: string;
  createdAt?: string;
  qr_code?: string;
  qrCode?: string;
  // Discount Eligibility - support both formats
  is_senior_citizen?: boolean;
  isSeniorCitizen?: boolean;
  is_pwd?: boolean;
  isPWD?: boolean;
  senior_citizen_id?: string;
  seniorCitizenID?: string;
  pwd_id?: string;
  pwdId?: string;
  id_document_path?: string;
  idDocumentPath?: string;
}

export interface SaleItem {
  productId: string;
  product_id?: string;  // Add snake_case version
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
  createdAt?: string;  // Add backend field name
  created_at?: string; // Add snake_case version
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