// Export all services
export { AnalyticsService } from './analyticsService';
export { InventoryAnalyticsService } from './inventoryAnalytics';
export { CustomerService } from './customerService';
export { InventoryService } from './inventoryService';
export { SalesService } from './salesService';

// Export service interfaces
export type { ProductMovementAnalysis } from './inventoryAnalytics';
export type { CustomerStats, CustomerSearchFilters } from './customerService';
export type { ProductSearchFilters, StockMovement, RestockRecommendation } from './inventoryService';
export type { SalesSummary, CreateSaleData } from './salesService';

// Import mock data
import { mockProducts, mockCustomers, mockSales, mockCustomerPurchaseHistory } from '../data/mockData';
import { CustomerService } from './customerService';
import { InventoryService } from './inventoryService';
import { SalesService } from './salesService';

// Initialize services with mock data
let initialized = false;

export function initializeServices(): void {
  if (initialized) return;
  
  CustomerService.initializeWithMockData(mockCustomers, mockCustomerPurchaseHistory);
  InventoryService.initializeWithMockData(mockProducts);
  SalesService.initializeWithMockData(mockSales);
  
  initialized = true;
  console.log('✅ Pharmacy Management Services initialized with mock data');
}

// Auto-initialize when module is imported
initializeServices();