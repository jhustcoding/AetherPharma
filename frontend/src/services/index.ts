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

// Services are now initialized to work with real API data instead of mock data
console.log('✅ Pharmacy Management Services ready for API integration');