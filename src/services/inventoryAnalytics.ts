import { Product, Sale, SaleItem, InventoryAnalytics } from '../types';

export interface ProductMovementAnalysis {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unitsSoldLast30Days: number;
  unitsSoldLast90Days: number;
  averageStock: number;
  turnoverRate: number;
  daysOfStock: number;
  movementCategory: 'fast' | 'medium' | 'slow' | 'dead';
  reorderPoint: number;
  stockValue: number;
  velocityScore: number;
}

export class InventoryAnalyticsService {
  static getInventoryAnalytics(): InventoryAnalytics {
    return {
      stockLevels: [
        { name: 'In Stock', value: 65 },
        { name: 'Low Stock', value: 20 },
        { name: 'Out of Stock', value: 8 },
        { name: 'Overstock', value: 7 }
      ],
      lowStockAlerts: [
        { product: 'Amoxicillin 250mg', quantity: 15 },
        { product: 'Digital Thermometer', quantity: 5 },
        { product: 'Blood Pressure Monitor', quantity: 3 },
        { product: 'Omeprazole 20mg', quantity: 8 },
        { product: 'Salbutamol Inhaler', quantity: 10 }
      ],
      totalValue: 284750.50,
      totalItems: 1825
    };
  }

  static analyzeProductMovement(
    products: Product[],
    sales: Sale[],
    days: number = 90
  ): ProductMovementAnalysis[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return products.map(product => {
      // Calculate sales for the period
      const productSales = sales.filter(sale => 
        new Date(sale.timestamp) >= cutoffDate &&
        sale.items.some(item => item.productId === product.id)
      );

      const unitsSold = productSales.reduce((total, sale) => {
        const item = sale.items.find(item => item.productId === product.id);
        return total + (item?.quantity || 0);
      }, 0);

      // Calculate metrics
      const averageStock = product.stock; // Simplified - in real scenario, you'd track historical stock levels
      const turnoverRate = averageStock > 0 ? (unitsSold * (365 / days)) / averageStock : 0;
      const daysOfStock = unitsSold > 0 ? (product.stock * days) / unitsSold : 999;
      const stockValue = product.stock * product.cost;

      // Determine movement category
      let movementCategory: 'fast' | 'medium' | 'slow' | 'dead';
      if (turnoverRate >= 6) {
        movementCategory = 'fast';
      } else if (turnoverRate >= 3) {
        movementCategory = 'medium';
      } else if (turnoverRate >= 1) {
        movementCategory = 'slow';
      } else {
        movementCategory = 'dead';
      }

      // Calculate velocity score (0-100)
      const velocityScore = Math.min(100, (turnoverRate / 10) * 100);

      // Calculate reorder point (simplified)
      const dailyUsage = unitsSold / days;
      const leadTimeDays = 7; // Assume 7 days lead time
      const safetyStock = dailyUsage * 3; // 3 days safety stock
      const reorderPoint = Math.ceil((dailyUsage * leadTimeDays) + safetyStock);

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        currentStock: product.stock,
        unitsSoldLast30Days: days >= 30 ? Math.round(unitsSold * (30 / days)) : 0,
        unitsSoldLast90Days: unitsSold,
        averageStock,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        daysOfStock: Math.round(daysOfStock),
        movementCategory,
        reorderPoint,
        stockValue,
        velocityScore: Math.round(velocityScore)
      };
    });
  }

  static getMovementSummary(analysis: ProductMovementAnalysis[]) {
    const summary = {
      fast: { count: 0, value: 0, percentage: 0 },
      medium: { count: 0, value: 0, percentage: 0 },
      slow: { count: 0, value: 0, percentage: 0 },
      dead: { count: 0, value: 0, percentage: 0 }
    };

    const totalValue = analysis.reduce((sum, item) => sum + item.stockValue, 0);

    analysis.forEach(item => {
      summary[item.movementCategory].count++;
      summary[item.movementCategory].value += item.stockValue;
    });

    // Calculate percentages
    Object.keys(summary).forEach(key => {
      const category = summary[key as keyof typeof summary];
      category.percentage = totalValue > 0 ? (category.value / totalValue) * 100 : 0;
    });

    return summary;
  }

  static getTopPerformers(analysis: ProductMovementAnalysis[], limit: number = 10) {
    return analysis
      .filter(item => item.movementCategory === 'fast')
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, limit);
  }

  static getSlowMovers(analysis: ProductMovementAnalysis[], limit: number = 10) {
    return analysis
      .filter(item => item.movementCategory === 'slow' || item.movementCategory === 'dead')
      .sort((a, b) => a.turnoverRate - b.turnoverRate)
      .slice(0, limit);
  }

  static getReorderRecommendations(analysis: ProductMovementAnalysis[]) {
    return analysis
      .filter(item => item.currentStock <= item.reorderPoint && item.movementCategory !== 'dead')
      .sort((a, b) => (a.currentStock / a.reorderPoint) - (b.currentStock / b.reorderPoint));
  }

  static getLowStockProducts(products: Product[]) {
    return products
      .filter(product => product.stock <= product.minStock)
      .map(product => ({
        id: product.id,
        name: product.name,
        currentStock: product.stock,
        minStock: product.minStock,
        category: product.category,
        severity: product.stock === 0 ? 'critical' : product.stock <= product.minStock * 0.5 ? 'high' : 'medium'
      }));
  }

  static getExpiringProducts(products: Product[], daysAhead: number = 90) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return products
      .filter(product => new Date(product.expiryDate) <= futureDate)
      .map(product => {
        const daysUntilExpiry = Math.ceil(
          (new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          id: product.id,
          name: product.name,
          expiryDate: product.expiryDate,
          daysUntilExpiry,
          currentStock: product.stock,
          stockValue: product.stock * product.cost,
          category: product.category,
          batchNumber: product.batchNumber,
          severity: daysUntilExpiry <= 0 ? 'expired' : daysUntilExpiry <= 30 ? 'critical' : 'warning'
        };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  static calculateInventoryValue(products: Product[]) {
    const totalCostValue = products.reduce((sum, product) => sum + (product.cost * product.stock), 0);
    const totalRetailValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const potentialProfit = totalRetailValue - totalCostValue;
    
    return {
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      profitMargin: totalRetailValue > 0 ? (potentialProfit / totalRetailValue) * 100 : 0
    };
  }

  static getInventoryTurnoverMetrics(products: Product[], sales: Sale[], days: number = 365) {
    const analysis = this.analyzeProductMovement(products, sales, days);
    const avgTurnover = analysis.reduce((sum, item) => sum + item.turnoverRate, 0) / analysis.length;
    
    const categoryTurnover = new Map<string, { turnover: number; count: number }>();
    
    analysis.forEach(item => {
      const category = categoryTurnover.get(item.category) || { turnover: 0, count: 0 };
      category.turnover += item.turnoverRate;
      category.count++;
      categoryTurnover.set(item.category, category);
    });
    
    const categoryMetrics = Array.from(categoryTurnover.entries()).map(([category, data]) => ({
      category,
      avgTurnover: data.turnover / data.count,
      productCount: data.count
    })).sort((a, b) => b.avgTurnover - a.avgTurnover);
    
    return {
      overallTurnover: avgTurnover,
      categoryMetrics,
      fastMovingProducts: analysis.filter(item => item.movementCategory === 'fast').length,
      deadStockProducts: analysis.filter(item => item.movementCategory === 'dead').length
    };
  }
}