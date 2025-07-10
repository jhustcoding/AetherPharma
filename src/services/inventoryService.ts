import { Product, InventoryAlert } from '../types';

export interface ProductSearchFilters {
  searchTerm?: string;
  category?: string;
  productType?: 'drug' | 'grocery' | 'all';
  prescriptionRequired?: boolean;
  lowStock?: boolean;
  expiringSoon?: boolean;
  manufacturer?: string;
  priceRange?: { min: number; max: number };
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  timestamp: string;
  userId?: string;
  batchNumber?: string;
  supplierInfo?: string;
}

export interface RestockRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  recommendedQuantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  daysUntilStockOut: number;
}

export class InventoryService {
  private static products: Product[] = [];
  private static stockMovements: StockMovement[] = [];
  private static alerts: InventoryAlert[] = [];

  static async getAllProducts(): Promise<Product[]> {
    return this.products;
  }

  static async getProductById(id: string): Promise<Product | null> {
    return this.products.find(product => product.id === id) || null;
  }

  static async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: `PROD_${Date.now()}`
    };

    this.products.push(newProduct);
    await this.checkAndCreateAlerts(newProduct);
    return newProduct;
  }

  static async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) return null;

    this.products[productIndex] = { ...this.products[productIndex], ...updates };
    await this.checkAndCreateAlerts(this.products[productIndex]);
    return this.products[productIndex];
  }

  static async deleteProduct(id: string): Promise<boolean> {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) return false;

    this.products.splice(productIndex, 1);
    // Remove related alerts
    this.alerts = this.alerts.filter(alert => alert.productId !== id);
    return true;
  }

  static async searchProducts(filters: ProductSearchFilters): Promise<Product[]> {
    let filtered = this.products;

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.genericName?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.batchNumber.toLowerCase().includes(term) ||
        product.manufacturer.toLowerCase().includes(term)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    if (filters.productType && filters.productType !== 'all') {
      filtered = filtered.filter(product => product.productType === filters.productType);
    }

    if (filters.prescriptionRequired !== undefined) {
      filtered = filtered.filter(product => product.prescriptionRequired === filters.prescriptionRequired);
    }

    if (filters.lowStock) {
      filtered = filtered.filter(product => product.stock <= product.minStock);
    }

    if (filters.expiringSoon) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90); // 90 days ahead
      filtered = filtered.filter(product => new Date(product.expiryDate) <= futureDate);
    }

    if (filters.manufacturer) {
      filtered = filtered.filter(product => product.manufacturer === filters.manufacturer);
    }

    if (filters.priceRange) {
      filtered = filtered.filter(product =>
        product.price >= filters.priceRange!.min && product.price <= filters.priceRange!.max
      );
    }

    return filtered;
  }

  static async updateStock(productId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string): Promise<boolean> {
    const product = await this.getProductById(productId);
    if (!product) return false;

    const movement: StockMovement = {
      id: `MOVE_${Date.now()}`,
      productId,
      type,
      quantity: Math.abs(quantity),
      reason,
      timestamp: new Date().toISOString()
    };

    this.stockMovements.push(movement);

    // Update stock based on type
    switch (type) {
      case 'in':
        product.stock += Math.abs(quantity);
        break;
      case 'out':
        product.stock = Math.max(0, product.stock - Math.abs(quantity));
        break;
      case 'adjustment':
        product.stock = Math.max(0, quantity);
        break;
    }

    await this.updateProduct(productId, { stock: product.stock });
    return true;
  }

  static async getStockMovements(productId?: string, days?: number): Promise<StockMovement[]> {
    let movements = this.stockMovements;

    if (productId) {
      movements = movements.filter(movement => movement.productId === productId);
    }

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      movements = movements.filter(movement => new Date(movement.timestamp) >= cutoffDate);
    }

    return movements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static async getLowStockProducts(): Promise<Product[]> {
    return this.products.filter(product => product.stock <= product.minStock);
  }

  static async getExpiringProducts(daysAhead: number = 90): Promise<Product[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.products
      .filter(product => new Date(product.expiryDate) <= futureDate)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  static async getProductsByCategory(): Promise<{ [category: string]: Product[] }> {
    const categories: { [category: string]: Product[] } = {};
    
    this.products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = [];
      }
      categories[product.category].push(product);
    });

    return categories;
  }

  static async getInventoryValue(): Promise<{ totalCost: number; totalRetail: number; profit: number }> {
    const totalCost = this.products.reduce((sum, product) => sum + (product.cost * product.stock), 0);
    const totalRetail = this.products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const profit = totalRetail - totalCost;

    return { totalCost, totalRetail, profit };
  }

  static async getRestockRecommendations(): Promise<RestockRecommendation[]> {
    const recommendations: RestockRecommendation[] = [];

    for (const product of this.products) {
      const movements = await this.getStockMovements(product.id, 30);
      const outgoingMovements = movements.filter(m => m.type === 'out');
      const dailyUsage = outgoingMovements.reduce((sum, m) => sum + m.quantity, 0) / 30;

      if (product.stock <= product.minStock || dailyUsage > 0) {
        let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let daysUntilStockOut = dailyUsage > 0 ? Math.floor(product.stock / dailyUsage) : 999;

        if (product.stock === 0) {
          priority = 'critical';
          daysUntilStockOut = 0;
        } else if (daysUntilStockOut <= 7) {
          priority = 'high';
        } else if (daysUntilStockOut <= 14) {
          priority = 'medium';
        }

        const recommendedQuantity = Math.max(
          product.minStock * 2 - product.stock,
          Math.ceil(dailyUsage * 30) // 30 days supply
        );

        recommendations.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          recommendedQuantity,
          priority,
          estimatedCost: recommendedQuantity * product.cost,
          daysUntilStockOut
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  static async getAlerts(): Promise<InventoryAlert[]> {
    return this.alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async markAlertAsRead(alertId: string): Promise<boolean> {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex === -1) return false;

    this.alerts.splice(alertIndex, 1);
    return true;
  }

  static async generateInventoryReport(): Promise<any> {
    const products = await this.getAllProducts();
    const lowStockProducts = await this.getLowStockProducts();
    const expiringProducts = await this.getExpiringProducts();
    const inventoryValue = await this.getInventoryValue();
    const restockRecommendations = await this.getRestockRecommendations();

    const categoryBreakdown = await this.getProductsByCategory();
    const categoryStats = Object.entries(categoryBreakdown).map(([category, items]) => ({
      category,
      productCount: items.length,
      totalValue: items.reduce((sum, product) => sum + (product.price * product.stock), 0),
      lowStockCount: items.filter(product => product.stock <= product.minStock).length
    }));

    return {
      summary: {
        totalProducts: products.length,
        totalValue: inventoryValue.totalRetail,
        lowStockCount: lowStockProducts.length,
        expiringCount: expiringProducts.length,
        restockNeeded: restockRecommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length
      },
      inventoryValue,
      categoryStats,
      lowStockProducts,
      expiringProducts,
      restockRecommendations,
      generatedAt: new Date().toISOString()
    };
  }

  private static async checkAndCreateAlerts(product: Product): Promise<void> {
    // Check for low stock
    if (product.stock <= product.minStock) {
      const existingAlert = this.alerts.find(
        alert => alert.productId === product.id && alert.type === 'low_stock'
      );

      if (!existingAlert) {
        this.alerts.push({
          id: `ALERT_${Date.now()}_${Math.random()}`,
          type: 'low_stock',
          productId: product.id,
          productName: product.name,
          message: `${product.name} is low in stock (${product.stock} remaining)`,
          severity: product.stock === 0 ? 'high' : 'medium',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Check for expiring products
    const daysUntilExpiry = Math.ceil(
      (new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 90) {
      const existingAlert = this.alerts.find(
        alert => alert.productId === product.id && (alert.type === 'expiry_soon' || alert.type === 'expired')
      );

      if (!existingAlert) {
        this.alerts.push({
          id: `ALERT_${Date.now()}_${Math.random()}`,
          type: daysUntilExpiry <= 0 ? 'expired' : 'expiry_soon',
          productId: product.id,
          productName: product.name,
          message: daysUntilExpiry <= 0 
            ? `${product.name} has expired` 
            : `${product.name} expires in ${daysUntilExpiry} days`,
          severity: daysUntilExpiry <= 0 ? 'high' : daysUntilExpiry <= 30 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // Initialize with mock data
  static initializeWithMockData(products: Product[]): void {
    this.products = [...products];
    
    // Generate alerts for existing products
    this.products.forEach(product => {
      this.checkAndCreateAlerts(product);
    });
  }
}