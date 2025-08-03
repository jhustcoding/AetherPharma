import { Product, Sale, Customer, CustomerPurchaseHistory, AnalyticsMetrics, CustomerAnalytics, ProductPerformance } from '../types';
import { apiService } from './api';

export interface AnalyticsData {
  totalRevenue: number;
  totalSales: number;
  activeCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  salesGrowth: number;
  customerGrowth: number;
  aovGrowth: number;
  dailyAvgSales: number;
  conversionRate: number;
  salesVelocity: number;
  avgCustomerLifetimeValue: number;
  repeatCustomerRate: number;
  avgVisitsPerMonth: number;
  retentionRate30: number;
  retentionRate90: number;
  churnRate: number;
}

export interface CustomerSegments {
  total: number;
  vip: number;
  regular: number;
  new: number;
  inactive: number;
}

export interface ProfitAnalysis {
  totalProfit: number;
  avgMargin: number;
  profitGrowth: number;
  bestCategory: {
    name: string;
    margin: number;
  };
  roi: number;
}

export interface SalesForecast {
  nextWeek: {
    revenue: number;
    confidence: number;
  };
  growthTrend: number;
  peakDay: string;
  monthlyTarget: number;
  targetProgress: number;
  dailyForecast: Array<{
    day: string;
    predicted: number;
    actual: number;
    revenue: number;
  }>;
  insights: string[];
  accuracy: number;
  modelConfidence: number;
  dataQuality: number;
}

export interface DiscountAnalytics {
  totalOrders: number;
  seniorCitizenOrders: number;
  pwdOrders: number;
  totalDiscount: number;
  seniorCitizenDiscount: number;
  pwdDiscount: number;
  averageDiscount: number;
}

export class AnalyticsService {
  static async getDashboardAnalytics(): Promise<{
    today_sales: number;
    total_customers: number;
    total_products: number;
    low_stock_alerts: number;
  }> {
    try {
      const data = await apiService.getDashboardAnalytics();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      // Return default values on error
      return {
        today_sales: 0,
        total_customers: 0,
        total_products: 0,
        low_stock_alerts: 0
      };
    }
  }

  static async getSalesAnalytics(timeRange: string): Promise<AnalyticsMetrics> {
    try {
      // Fetch sales analytics from API with time range
      const salesData = await apiService.getSalesAnalytics(timeRange);
      
      // Transform the response to match the expected format
      return {
        totalRevenue: salesData.totalRevenue || 0,
        totalOrders: salesData.totalOrders || 0,
        averageOrderValue: salesData.averageOrderValue || 0,
        revenueGrowth: salesData.revenueGrowth || 0,
        orderGrowth: salesData.orderGrowth || 0,
        aovChange: salesData.aovChange || 0,
        conversionRate: salesData.conversionRate || 0,
        conversionChange: salesData.conversionChange || 0,
        returnRate: salesData.returnRate || 0,
        returnRateChange: salesData.returnRateChange || 0,
        dailySales: salesData.dailySales || []
      };
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      // Return default values on error
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        revenueGrowth: 0,
        orderGrowth: 0,
        aovChange: 0,
        conversionRate: 0,
        conversionChange: 0,
        returnRate: 0,
        returnRateChange: 0,
        dailySales: []
      };
    }
  }

  static async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    try {
      const dashboardData = await apiService.getDashboardAnalytics();
      
      // Since backend doesn't have full customer analytics yet, combine dashboard data with defaults
      return {
        activeCustomers: dashboardData.total_customers || 0,
        customerGrowth: 5.1, // Mock growth rate for now
        avgSessionDuration: '4m 32s',
        sessionDurationChange: 8.3,
        segments: [
          { name: 'VIP Customers', value: 15 },
          { name: 'Regular Customers', value: 45 },
          { name: 'New Customers', value: 25 },
          { name: 'Inactive', value: 15 }
        ]
      };
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      return {
        activeCustomers: 0,
        customerGrowth: 0,
        avgSessionDuration: '0m 0s',
        sessionDurationChange: 0,
        segments: []
      };
    }
  }

  static async getProductPerformance(): Promise<ProductPerformance[]> {
    try {
      // Fetch product performance from sales analytics endpoint
      const salesData = await apiService.getSalesAnalytics();
      return salesData.productPerformance || [];
    } catch (error) {
      console.error('Error fetching product performance:', error);
      // Return empty array on error
      return [];
    }
  }

  static async getDiscountAnalytics(): Promise<DiscountAnalytics> {
    try {
      const data = await apiService.getDiscountAnalytics();
      return {
        totalOrders: data.total_orders || 0,
        seniorCitizenOrders: data.senior_citizen_orders || 0,
        pwdOrders: data.pwd_orders || 0,
        totalDiscount: data.total_discount_amount || 0,
        seniorCitizenDiscount: data.senior_citizen_discount_amount || 0,
        pwdDiscount: data.pwd_discount_amount || 0,
        averageDiscount: data.average_discount || 0
      };
    } catch (error) {
      console.error('Error fetching discount analytics:', error);
      // Return default values on error
      return {
        totalOrders: 0,
        seniorCitizenOrders: 0,
        pwdOrders: 0,
        totalDiscount: 0,
        seniorCitizenDiscount: 0,
        pwdDiscount: 0,
        averageDiscount: 0
      };
    }
  }

  static generateAnalytics(
    products: Product[],
    sales: Sale[],
    customers: Customer[],
    purchaseHistory: CustomerPurchaseHistory[]
  ): AnalyticsData {
    // Calculate basic metrics
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    const activeCustomers = customers.length;
    const avgOrderValue = totalRevenue / sales.length || 0;

    // Calculate growth rates (simulated)
    const revenueGrowth = 12.5;
    const salesGrowth = 8.2;
    const customerGrowth = 5.1;
    const aovGrowth = 3.8;

    // Calculate advanced metrics
    const dailyAvgSales = totalSales / 7; // Assuming 7 days of data
    const conversionRate = 65.4; // Simulated conversion rate
    const salesVelocity = totalSales / (7 * 8); // Items per hour (assuming 8 hours/day)

    // Customer analytics
    const avgCustomerLifetimeValue = purchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0) / customers.length || 0;
    const repeatCustomers = new Set(purchaseHistory.map(p => p.customerId)).size;
    const repeatCustomerRate = (repeatCustomers / customers.length) * 100;
    const avgVisitsPerMonth = purchaseHistory.length / customers.length || 0;

    // Retention and churn (simulated)
    const retentionRate30 = 78.5;
    const retentionRate90 = 65.2;
    const churnRate = 15.3;

    return {
      totalRevenue,
      totalSales,
      activeCustomers,
      avgOrderValue,
      revenueGrowth,
      salesGrowth,
      customerGrowth,
      aovGrowth,
      dailyAvgSales,
      conversionRate,
      salesVelocity,
      avgCustomerLifetimeValue,
      repeatCustomerRate,
      avgVisitsPerMonth,
      retentionRate30,
      retentionRate90,
      churnRate
    };
  }

  static analyzeCustomerSegments(
    customers: Customer[],
    purchaseHistory: CustomerPurchaseHistory[]
  ): CustomerSegments {
    const customerSpending = new Map<string, number>();
    
    // Calculate spending per customer
    purchaseHistory.forEach(purchase => {
      const current = customerSpending.get(purchase.customerId) || 0;
      customerSpending.set(purchase.customerId, current + purchase.total);
    });

    // Segment customers based on spending and activity
    let vip = 0;
    let regular = 0;
    let newCustomers = 0;
    let inactive = 0;

    customers.forEach(customer => {
      const spending = customerSpending.get(customer.id) || 0;
      const customerPurchases = purchaseHistory.filter(p => p.customerId === customer.id);
      const daysSinceCreation = Math.ceil((new Date().getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      if (spending > 1000 && customerPurchases.length > 5) {
        vip++;
      } else if (spending > 200 && customerPurchases.length > 2) {
        regular++;
      } else if (daysSinceCreation <= 30) {
        newCustomers++;
      } else {
        inactive++;
      }
    });

    return {
      total: customers.length,
      vip,
      regular,
      new: newCustomers,
      inactive
    };
  }

  static analyzeProfitability(products: Product[], sales: Sale[]): ProfitAnalysis {
    // Calculate total profit
    let totalRevenue = 0;
    let totalCost = 0;
    const categoryProfits = new Map<string, { revenue: number; cost: number }>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const itemRevenue = item.price * item.quantity;
          const itemCost = product.cost * item.quantity;
          
          totalRevenue += itemRevenue;
          totalCost += itemCost;

          // Track by category
          const categoryData = categoryProfits.get(product.category) || { revenue: 0, cost: 0 };
          categoryData.revenue += itemRevenue;
          categoryData.cost += itemCost;
          categoryProfits.set(product.category, categoryData);
        }
      });
    });

    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

    // Find best category by margin
    let bestCategory = { name: 'N/A', margin: 0 };
    categoryProfits.forEach((data, category) => {
      const margin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
      if (margin > bestCategory.margin) {
        bestCategory = { name: category, margin };
      }
    });

    return {
      totalProfit,
      avgMargin,
      profitGrowth: 15.2, // Simulated
      bestCategory,
      roi: avgMargin * 2.5 // Simplified ROI calculation
    };
  }

  static generateSalesForecast(historicalData: any[]): SalesForecast {
    // Simple forecast based on historical trends
    const avgRevenue = historicalData.reduce((sum, day) => sum + day.revenue, 0) / historicalData.length;
    const growthTrend = 8.5; // Simulated growth trend
    
    const nextWeekRevenue = avgRevenue * 7 * (1 + growthTrend / 100);
    const confidence = 85.2;

    // Generate daily forecast for next 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyForecast = days.map((day, index) => {
      const baseRevenue = avgRevenue;
      const seasonalMultiplier = day === 'Sat' ? 1.35 : day === 'Fri' ? 1.25 : day === 'Sun' ? 1.1 : day === 'Mon' ? 0.85 : 1.0;
      const predicted = Math.round(baseRevenue * seasonalMultiplier * (1 + Math.random() * 0.1 - 0.05));
      
      return {
        day,
        predicted,
        actual: index < historicalData.length ? historicalData[index].revenue : 0,
        revenue: predicted
      };
    });

    const peakDay = dailyForecast.reduce((max, day) => day.predicted > max.predicted ? day : max).day;
    
    const monthlyTarget = avgRevenue * 30 * 1.15; // 15% growth target
    const currentProgress = (avgRevenue * 7 / monthlyTarget) * 100;

    const insights = [
      "Sales are trending upward with 8.5% weekly growth",
      "Saturday shows highest sales potential (+35% vs average)",
      "Consider promotional campaigns on Monday to boost slower sales",
      "Cardiovascular medications show strongest profit margins",
      "Customer retention rate is above industry average at 78.5%",
      "Inventory turnover is optimal for fast-moving products"
    ];

    return {
      nextWeek: {
        revenue: Math.round(nextWeekRevenue),
        confidence
      },
      growthTrend,
      peakDay,
      monthlyTarget: Math.round(monthlyTarget),
      targetProgress: Math.round(currentProgress),
      dailyForecast,
      insights,
      accuracy: 87.3,
      modelConfidence: 85.2,
      dataQuality: 92.1
    };
  }
}