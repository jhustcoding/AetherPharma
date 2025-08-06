import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Package, Users, Calendar, Star, AlertTriangle, Activity, Zap, Clock, Target, BarChart3, Brain, TrendingDown, PieChart as PieChartIcon, Calculator, ShoppingCart, UserCheck, Percent, Globe, Store } from 'lucide-react';
import { InventoryAnalyticsService } from '../services/inventoryAnalytics';
import { AnalyticsService } from '../services/analyticsService';
import { useNotification } from '../contexts/NotificationContext';
import InventoryMovementAnalysis from './InventoryMovementAnalysis';

const Analytics: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'movement' | 'online'>('overview');
  const { onlineOrders } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>({
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
  });
  const [customerData, setCustomerData] = useState<any>({
    activeCustomers: 0,
    customerGrowth: 0,
    avgSessionDuration: '0m 0s',
    sessionDurationChange: 0,
    segments: []
  });
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [discountData, setDiscountData] = useState<any>({
    totalOrders: 0,
    seniorCitizenOrders: 0,
    pwdOrders: 0,
    totalDiscount: 0,
    seniorCitizenDiscount: 0,
    pwdDiscount: 0,
    averageDiscount: 0
  });

  // Inventory data (still using the synchronous method for now)
  const inventoryData = InventoryAnalyticsService.getInventoryAnalytics();

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all analytics data in parallel
        const [
          dashboardResponse,
          salesResponse,
          customerResponse,
          productResponse,
          discountResponse
        ] = await Promise.all([
          AnalyticsService.getDashboardAnalytics(),
          AnalyticsService.getSalesAnalytics(selectedTimeRange),
          AnalyticsService.getCustomerAnalytics(),
          AnalyticsService.getProductPerformance(),
          AnalyticsService.getDiscountAnalytics()
        ]);

        setDashboardData(dashboardResponse);
        setSalesData(salesResponse);
        setCustomerData(customerResponse);
        setProductPerformance(productResponse);
        setDiscountData(discountResponse);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedTimeRange]);

  // Transform sales data for daily revenue chart
  const dailyRevenue = salesData.dailySales.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: day.revenue
  }));

  // Online order analytics
  const getOnlineOrderAnalytics = () => {
    if (!onlineOrders || !Array.isArray(onlineOrders)) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        statusCounts: {},
        topItems: [],
        dailyOrders: [],
        conversionRate: 0
      };
    }
    
    const completedOrders = onlineOrders.filter(order => order.status === 'completed');
    const totalRevenue = onlineOrders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = onlineOrders.length > 0 ? totalRevenue / onlineOrders.length : 0;
    
    // Group orders by status
    const statusCounts = onlineOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most ordered items
    const itemCounts = onlineOrders.reduce((acc, order) => {
      order.items.forEach(item => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
      });
      return acc;
    }, {} as Record<string, number>);

    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, quantity]) => ({ name, quantity }));

    // Orders by payment method
    const paymentMethods = onlineOrders.reduce((acc, order) => {
      acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Orders by type
    const orderTypes = onlineOrders.reduce((acc, order) => {
      acc[order.orderType] = (acc[order.orderType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily order trends (last 7 days)
    const dailyOrders = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOrders = onlineOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate.toDateString() === date.toDateString();
      });
      dailyOrders.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + order.total, 0)
      });
    }

    return {
      totalOrders: onlineOrders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      avgOrderValue,
      statusCounts,
      topItems,
      paymentMethods,
      orderTypes,
      dailyOrders,
      conversionRate: onlineOrders.length > 0 ? (completedOrders.length / onlineOrders.length) * 100 : 0
    };
  };

  const onlineAnalytics = getOnlineOrderAnalytics();

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const OverviewTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">₱{(dashboardData?.today_sales || 0).toLocaleString()}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                Today's Sales
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online Orders</p>
              <p className="text-2xl font-bold text-gray-900">{onlineAnalytics.totalOrders}</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Globe className="h-4 w-4 mr-1" />
                {onlineAnalytics.conversionRate.toFixed(1)}% completion
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.total_products || 0}</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {dashboardData?.low_stock_alerts || 0} low stock
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.total_customers || 0}</p>
              <p className="text-sm text-purple-600 flex items-center mt-1">
                <UserCheck className="h-4 w-4 mr-1" />
                {customerData.customerGrowth > 0 ? '+' : ''}{customerData.customerGrowth.toFixed(1)}% growth
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Online vs Offline Sales */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Online vs Offline Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Online Orders', value: onlineAnalytics.totalRevenue, color: '#10B981' },
                  { name: 'In-Store Sales', value: dashboardData?.today_sales || 0, color: '#3B82F6' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Online Orders', value: onlineAnalytics.totalRevenue, color: '#10B981' },
                  { name: 'In-Store Sales', value: dashboardData?.today_sales || 0, color: '#3B82F6' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₱${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={productPerformance.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Discount Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Discount Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Total Discount Given</span>
              <span className="font-semibold text-lg">₱{discountData.totalDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="text-gray-600">Senior Citizen Discounts</span>
              <span className="font-semibold">₱{discountData.seniorCitizenDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-gray-600">PWD Discounts</span>
              <span className="font-semibold">₱{discountData.pwdDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
              <span className="text-gray-600">Average Discount per Order</span>
              <span className="font-semibold">₱{discountData.averageDiscount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Discount Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Senior Citizen', value: discountData.seniorCitizenOrders, color: '#3B82F6' },
                  { name: 'PWD', value: discountData.pwdOrders, color: '#10B981' },
                  { name: 'Regular', value: discountData.totalOrders - discountData.seniorCitizenOrders - discountData.pwdOrders, color: '#6B7280' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { color: '#3B82F6' },
                  { color: '#10B981' },
                  { color: '#6B7280' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    );
  };

  const OnlineOrdersTab = () => (
    <div className="space-y-6">
      {/* Online Order Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Online Orders</p>
              <p className="text-2xl font-bold text-gray-900">{onlineAnalytics.totalOrders}</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Globe className="h-4 w-4 mr-1" />
                {onlineAnalytics.completedOrders} completed
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₱{onlineAnalytics.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <DollarSign className="h-4 w-4 mr-1" />
                All orders
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">₱{onlineAnalytics.avgOrderValue.toFixed(2)}</p>
              <p className="text-sm text-purple-600 flex items-center mt-1">
                <Calculator className="h-4 w-4 mr-1" />
                Per order
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{onlineAnalytics.conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <Percent className="h-4 w-4 mr-1" />
                Completion rate
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Order Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Daily Order Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={onlineAnalytics.dailyOrders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="orders" fill="#3B82F6" name="Orders" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(onlineAnalytics.statusCounts).map(([status, count]) => ({
                  name: status.charAt(0).toUpperCase() + status.slice(1),
                  value: count
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(onlineAnalytics.statusCounts).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(onlineAnalytics.paymentMethods).map(([method, count]) => ({
              method: method.charAt(0).toUpperCase() + method.slice(1),
              count
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Types */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Order Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(onlineAnalytics.orderTypes).map(([type, count]) => ({
                  name: type.charAt(0).toUpperCase() + type.slice(1),
                  value: count
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(onlineAnalytics.orderTypes).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#06B6D4' : '#F59E0B'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Ordered Items */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Most Ordered Items Online</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={onlineAnalytics.topItems}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}`, 'Quantity Ordered']} />
            <Bar dataKey="quantity" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="Pain Relief">Pain Relief</option>
            <option value="Antibiotics">Antibiotics</option>
            <option value="Vitamins">Vitamins</option>
          </select>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
            activeTab === 'overview' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
            activeTab === 'online' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Online Orders</span>
        </button>
        <button
          onClick={() => setActiveTab('movement')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
            activeTab === 'movement' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Movement Analysis</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'online' && <OnlineOrdersTab />}
      {activeTab === 'movement' && <InventoryMovementAnalysis />}
    </div>
  );
};

export default Analytics;