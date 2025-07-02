import { Product, Sale, SaleItem } from '../types';

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
}