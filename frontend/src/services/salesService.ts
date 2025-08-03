import { Sale, SaleItem, Product, Customer } from '../types';

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  dailyTrends: Array<{
    date: string;
    sales: number;
    revenue: number;
    orderCount: number;
  }>;
}

export interface CreateSaleData {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: string;
  prescriptionNumber?: string;
  pharmacistId?: string;
  notes?: string;
}

export class SalesService {
  private static sales: Sale[] = [];

  static async getAllSales(): Promise<Sale[]> {
    return this.sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static async getSaleById(id: string): Promise<Sale | null> {
    return this.sales.find(sale => sale.id === id) || null;
  }

  static async createSale(saleData: CreateSaleData, products: Product[]): Promise<Sale | null> {
    // Validate items and calculate totals
    const items: SaleItem[] = [];
    let total = 0;

    for (const item of saleData.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      const itemTotal = item.price * item.quantity;
      items.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal
      });

      total += itemTotal;
    }

    const newSale: Sale = {
      id: `SALE_${Date.now()}`,
      customerId: saleData.customerId,
      items,
      total,
      timestamp: new Date().toISOString(),
      paymentMethod: saleData.paymentMethod,
      prescriptionNumber: saleData.prescriptionNumber,
      pharmacistId: saleData.pharmacistId,
      notes: saleData.notes
    };

    this.sales.push(newSale);

    // Update product stock (this would typically be handled by the inventory service)
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    }

    return newSale;
  }

  static async getSalesByCustomer(customerId: string): Promise<Sale[]> {
    return this.sales
      .filter(sale => sale.customerId === customerId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= start && saleDate <= end;
    });
  }

  static async getSalesByProduct(productId: string): Promise<Sale[]> {
    return this.sales.filter(sale =>
      sale.items.some(item => item.productId === productId)
    );
  }

  static async getSalesSummary(days: number = 30): Promise<SalesSummary> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSales = this.sales.filter(sale => new Date(sale.timestamp) >= cutoffDate);
    
    const totalSales = recentSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    const totalRevenue = recentSales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Calculate profit (simplified - would need cost data)
    const totalProfit = totalRevenue * 0.3; // Assuming 30% profit margin
    
    const averageOrderValue = recentSales.length > 0 ? totalRevenue / recentSales.length : 0;

    // Top selling products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    recentSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSales.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productSales.set(item.productId, existing);
      });
    });

    const topSellingProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Daily trends
    const dailyTrends = this.generateDailyTrends(recentSales, days);

    return {
      totalSales,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      topSellingProducts,
      dailyTrends
    };
  }

  static async getPaymentMethodBreakdown(days: number = 30): Promise<{ [method: string]: { count: number; total: number } }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSales = this.sales.filter(sale => new Date(sale.timestamp) >= cutoffDate);
    
    const breakdown: { [method: string]: { count: number; total: number } } = {};
    
    recentSales.forEach(sale => {
      if (!breakdown[sale.paymentMethod]) {
        breakdown[sale.paymentMethod] = { count: 0, total: 0 };
      }
      breakdown[sale.paymentMethod].count++;
      breakdown[sale.paymentMethod].total += sale.total;
    });

    return breakdown;
  }

  static async getHourlyTrends(days: number = 7): Promise<{ [hour: string]: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSales = this.sales.filter(sale => new Date(sale.timestamp) >= cutoffDate);
    
    const hourlyTrends: { [hour: string]: number } = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyTrends[i.toString()] = 0;
    }

    recentSales.forEach(sale => {
      const hour = new Date(sale.timestamp).getHours();
      hourlyTrends[hour.toString()] += sale.total;
    });

    return hourlyTrends;
  }

  static async refundSale(saleId: string, reason: string): Promise<boolean> {
    const sale = await this.getSaleById(saleId);
    if (!sale) return false;

    // Create a refund record (negative sale)
    const refund: Sale = {
      id: `REFUND_${Date.now()}`,
      customerId: sale.customerId,
      items: sale.items.map(item => ({ ...item, quantity: -item.quantity, total: -item.total })),
      total: -sale.total,
      timestamp: new Date().toISOString(),
      paymentMethod: sale.paymentMethod,
      notes: `Refund for sale ${saleId}: ${reason}`
    };

    this.sales.push(refund);
    return true;
  }

  static async getDailySalesReport(date: string): Promise<any> {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const dailySales = this.sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= targetDate && saleDate < nextDay;
    });

    const totalRevenue = dailySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = dailySales.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const productsSold = new Map<string, number>();
    dailySales.forEach(sale => {
      sale.items.forEach(item => {
        productsSold.set(item.productId, (productsSold.get(item.productId) || 0) + item.quantity);
      });
    });

    const topProducts = Array.from(productsSold.entries())
      .map(([productId, quantity]) => {
        const sampleItem = dailySales.find(sale => 
          sale.items.some(item => item.productId === productId)
        )?.items.find(item => item.productId === productId);
        
        return {
          productId,
          productName: sampleItem?.name || 'Unknown',
          quantity,
          revenue: quantity * (sampleItem?.price || 0)
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      date,
      totalRevenue,
      totalTransactions,
      averageTransaction,
      topProducts,
      hourlyBreakdown: this.getHourlyBreakdownForDate(dailySales),
      paymentMethods: this.getPaymentBreakdownForSales(dailySales)
    };
  }

  static async generateSalesReport(startDate: string, endDate: string): Promise<any> {
    const sales = await this.getSalesByDateRange(startDate, endDate);
    const summary = await this.getSalesSummary();
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = sales.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const categoryBreakdown = new Map<string, { revenue: number; quantity: number }>();
    const customerBreakdown = new Map<string, { orders: number; revenue: number }>();

    sales.forEach(sale => {
      // Customer breakdown
      if (sale.customerId) {
        const customer = customerBreakdown.get(sale.customerId) || { orders: 0, revenue: 0 };
        customer.orders++;
        customer.revenue += sale.total;
        customerBreakdown.set(sale.customerId, customer);
      }

      // Category breakdown would require product category data
      sale.items.forEach(item => {
        // This would be enhanced with actual product category data
        const category = 'General'; // Placeholder
        const existing = categoryBreakdown.get(category) || { revenue: 0, quantity: 0 };
        existing.revenue += item.total;
        existing.quantity += item.quantity;
        categoryBreakdown.set(category, existing);
      });
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalRevenue,
        totalTransactions,
        averageOrderValue,
        totalQuantitySold: sales.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        )
      },
      topProducts: summary.topSellingProducts,
      dailyTrends: this.generateDailyTrends(sales, 30),
      categoryBreakdown: Array.from(categoryBreakdown.entries()).map(([category, data]) => ({
        category,
        ...data
      })),
      topCustomers: Array.from(customerBreakdown.entries())
        .map(([customerId, data]) => ({ customerId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      generatedAt: new Date().toISOString()
    };
  }

  private static generateDailyTrends(sales: Sale[], days: number): Array<{ date: string; sales: number; revenue: number; orderCount: number }> {
    const trends: { [date: string]: { sales: number; revenue: number; orderCount: number } } = {};
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends[dateStr] = { sales: 0, revenue: 0, orderCount: 0 };
    }

    sales.forEach(sale => {
      const dateStr = sale.timestamp.split('T')[0];
      if (trends[dateStr]) {
        trends[dateStr].sales += sale.items.reduce((sum, item) => sum + item.quantity, 0);
        trends[dateStr].revenue += sale.total;
        trends[dateStr].orderCount++;
      }
    });

    return Object.entries(trends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private static getHourlyBreakdownForDate(sales: Sale[]): { [hour: string]: number } {
    const breakdown: { [hour: string]: number } = {};
    
    for (let i = 0; i < 24; i++) {
      breakdown[i.toString()] = 0;
    }

    sales.forEach(sale => {
      const hour = new Date(sale.timestamp).getHours();
      breakdown[hour.toString()] += sale.total;
    });

    return breakdown;
  }

  private static getPaymentBreakdownForSales(sales: Sale[]): { [method: string]: { count: number; total: number } } {
    const breakdown: { [method: string]: { count: number; total: number } } = {};
    
    sales.forEach(sale => {
      if (!breakdown[sale.paymentMethod]) {
        breakdown[sale.paymentMethod] = { count: 0, total: 0 };
      }
      breakdown[sale.paymentMethod].count++;
      breakdown[sale.paymentMethod].total += sale.total;
    });

    return breakdown;
  }

  // Initialize with mock data
  static initializeWithMockData(sales: Sale[]): void {
    this.sales = [...sales];
  }
}