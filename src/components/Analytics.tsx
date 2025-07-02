import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Package, Users, Calendar, Star, AlertTriangle, Activity, Zap, Clock, Target, BarChart3, Brain, TrendingDown, PieChart as PieChartIcon, Calculator, ShoppingCart, UserCheck, Percent } from 'lucide-react';
import { mockProducts, mockSales, mockCustomers, mockCustomerPurchaseHistory } from '../data/mockData';
import { InventoryAnalyticsService } from '../services/inventoryAnalytics';
import { AnalyticsService } from '../services/analyticsService';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'customers' | 'inventory' | 'profit' | 'forecast'>('overview');

  // Mock data for charts
  const salesData = [
    { name: 'Mon', sales: 4200, revenue: 12500, profit: 3750, customers: 45 },
    { name: 'Tue', sales: 3800, revenue: 11200, profit: 3360, customers: 38 },
    { name: 'Wed', sales: 5100, revenue: 15300, profit: 4590, customers: 52 },
    { name: 'Thu', sales: 4600, revenue: 13800, profit: 4140, customers: 47 },
    { name: 'Fri', sales: 6200, revenue: 18600, profit: 5580, customers: 63 },
    { name: 'Sat', sales: 7800, revenue: 23400, profit: 7020, customers: 78 },
    { name: 'Sun', sales: 5900, revenue: 17700, profit: 5310, customers: 59 },
  ];

  const categoryData = [
    { name: 'Cardiovascular', value: 35, color: '#0ea5e9', revenue: 45000 },
    { name: 'Diabetes', value: 25, color: '#22c55e', revenue: 32000 },
    { name: 'Respiratory', value: 20, color: '#f59e0b', revenue: 28000 },
    { name: 'Pain Relief', value: 15, color: '#ef4444', revenue: 18000 },
    { name: 'Vitamins', value: 5, color: '#8b5cf6', revenue: 8000 },
  ];

  // Enhanced analytics data
  const analytics = AnalyticsService.generateAnalytics(mockProducts, mockSales, mockCustomers, mockCustomerPurchaseHistory);
  const forecast = AnalyticsService.generateSalesForecast(salesData);
  const customerSegments = AnalyticsService.analyzeCustomerSegments(mockCustomers, mockCustomerPurchaseHistory);
  const profitAnalysis = AnalyticsService.analyzeProfitability(mockProducts, mockSales);

  // Enhanced top products with more realistic sales data
  const topProducts = [
    { 
      id: '1',
      name: 'Metformin 500mg', 
      sales: 156, 
      revenue: 2025.44,
      growth: 12.5,
      category: 'Diabetes',
      margin: 35.2,
      profit: 710.91
    },
    { 
      id: '2',
      name: 'Lisinopril 10mg', 
      sales: 134, 
      revenue: 2075.66,
      growth: 8.3,
      category: 'Cardiovascular',
      margin: 34.1,
      profit: 707.80
    },
    { 
      id: '3',
      name: 'Albuterol Inhaler', 
      sales: 89, 
      revenue: 4093.11,
      growth: 15.7,
      category: 'Respiratory',
      margin: 30.4,
      profit: 1244.33
    },
    { 
      id: '4',
      name: 'Acetaminophen 500mg', 
      sales: 203, 
      revenue: 1826.97,
      growth: 5.2,
      category: 'Pain Relief',
      margin: 38.8,
      profit: 708.66
    },
    { 
      id: '5',
      name: 'Vitamin D3 1000IU', 
      sales: 67, 
      revenue: 836.83,
      growth: -2.1,
      category: 'Vitamins',
      margin: 37.5,
      profit: 313.81
    },
  ];

  // Inventory movement analysis
  const movementAnalysis = InventoryAnalyticsService.analyzeProductMovement(mockProducts, mockSales);
  const movementSummary = InventoryAnalyticsService.getMovementSummary(movementAnalysis);
  const topPerformers = InventoryAnalyticsService.getTopPerformers(movementAnalysis);
  const slowMovers = InventoryAnalyticsService.getSlowMovers(movementAnalysis);
  const reorderRecommendations = InventoryAnalyticsService.getReorderRecommendations(movementAnalysis);

  const getMovementColor = (category: string) => {
    switch (category) {
      case 'fast': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'slow': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'dead': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMovementIcon = (category: string) => {
    switch (category) {
      case 'fast': return <Zap className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      case 'slow': return <Clock className="h-4 w-4" />;
      case 'dead': return <AlertTriangle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">₱{analytics.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600">+{analytics.revenueGrowth.toFixed(1)}% from last period</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalSales.toLocaleString()}</p>
              <p className="text-sm text-blue-600">+{analytics.salesGrowth.toFixed(1)}% from last period</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.activeCustomers.toLocaleString()}</p>
              <p className="text-sm text-purple-600">+{analytics.customerGrowth.toFixed(1)}% from last period</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calculator className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">₱{analytics.avgOrderValue.toFixed(2)}</p>
              <p className="text-sm text-orange-600">+{analytics.aovGrowth.toFixed(1)}% from last period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Sales & Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="sales" fill="#0ea5e9" name="Sales" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="Revenue (₱)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Sales by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Top Products
          </h3>
          <div className="space-y-3">
            {topProducts.slice(0, 3).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium mr-3">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.sales} units sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">₱{product.revenue.toFixed(2)}</div>
                  <div className={`text-sm ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.growth >= 0 ? '+' : ''}{product.growth}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            Inventory Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fast Moving</span>
              <span className="font-semibold text-green-600">{movementSummary.fast.count} products</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Medium Moving</span>
              <span className="font-semibold text-blue-600">{movementSummary.medium.count} products</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Slow Moving</span>
              <span className="font-semibold text-yellow-600">{movementSummary.slow.count} products</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Dead Stock</span>
              <span className="font-semibold text-red-600">{movementSummary.dead.count} products</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Alerts & Actions
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Low Stock Items</span>
              <span className="font-semibold text-red-600">{mockProducts.filter(p => p.stock <= p.minStock).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Expiring Soon</span>
              <span className="font-semibold text-yellow-600">
                {mockProducts.filter(p => {
                  const daysUntilExpiry = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
                }).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Reorder Needed</span>
              <span className="font-semibold text-orange-600">{reorderRecommendations.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSalesTab = () => (
    <div className="space-y-6">
      {/* Sales Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Sales</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.dailyAvgSales.toLocaleString()}</p>
              <p className="text-sm text-blue-600">Average per day</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Peak Sales Day</p>
              <p className="text-2xl font-semibold text-gray-900">Saturday</p>
              <p className="text-sm text-green-600">₱23,400 revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Percent className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-purple-600">Visitors to buyers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sales Velocity</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.salesVelocity.toFixed(1)}</p>
              <p className="text-sm text-orange-600">Items per hour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="sales" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product, index) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sales}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₱{product.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.growth >= 0 ? '+' : ''}{product.growth}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCustomersTab = () => (
    <div className="space-y-6">
      {/* Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customerSegments.total}</p>
              <p className="text-sm text-blue-600">Registered users</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">VIP Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customerSegments.vip}</p>
              <p className="text-sm text-yellow-600">High value customers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Regular Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customerSegments.regular}</p>
              <p className="text-sm text-green-600">Frequent buyers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customerSegments.new}</p>
              <p className="text-sm text-purple-600">This month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Segments</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'VIP', value: customerSegments.vip, color: '#f59e0b' },
                  { name: 'Regular', value: customerSegments.regular, color: '#22c55e' },
                  { name: 'New', value: customerSegments.new, color: '#8b5cf6' },
                  { name: 'Inactive', value: customerSegments.inactive, color: '#6b7280' },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'VIP', value: customerSegments.vip, color: '#f59e0b' },
                  { name: 'Regular', value: customerSegments.regular, color: '#22c55e' },
                  { name: 'New', value: customerSegments.new, color: '#8b5cf6' },
                  { name: 'Inactive', value: customerSegments.inactive, color: '#6b7280' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="customers" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Lifetime Value</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average CLV</span>
              <span className="font-semibold text-gray-900">₱{analytics.avgCustomerLifetimeValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">VIP CLV</span>
              <span className="font-semibold text-yellow-600">₱{(analytics.avgCustomerLifetimeValue * 3.2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Regular CLV</span>
              <span className="font-semibold text-green-600">₱{(analytics.avgCustomerLifetimeValue * 1.5).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Purchase Frequency</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Daily Customers</span>
              <span className="font-semibold text-gray-900">{Math.round(analytics.activeCustomers / 30)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Repeat Rate</span>
              <span className="font-semibold text-blue-600">{analytics.repeatCustomerRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg. Visits/Month</span>
              <span className="font-semibold text-purple-600">{analytics.avgVisitsPerMonth.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Retention</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">30-Day Retention</span>
              <span className="font-semibold text-green-600">{analytics.retentionRate30.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">90-Day Retention</span>
              <span className="font-semibold text-blue-600">{analytics.retentionRate90.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Churn Rate</span>
              <span className="font-semibold text-red-600">{analytics.churnRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventoryTab = () => (
    <div className="space-y-6">
      {/* Movement Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Fast Moving</p>
              <p className="text-xl font-bold text-green-600">{movementSummary.fast.count}</p>
              <p className="text-xs text-green-600">₱{movementSummary.fast.value.toLocaleString()}</p>
            </div>
            <Zap className="h-6 w-6 text-green-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-green-700">
              {movementSummary.fast.percentage.toFixed(1)}% of inventory value
            </div>
            <div className="text-xs text-green-600 font-medium">
              6+ turnovers/year • ≤60 days stock
            </div>
          </div>
        </div>

        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Medium Moving</p>
              <p className="text-xl font-bold text-blue-600">{movementSummary.medium.count}</p>
              <p className="text-xs text-blue-600">₱{movementSummary.medium.value.toLocaleString()}</p>
            </div>
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-blue-700">
              {movementSummary.medium.percentage.toFixed(1)}% of inventory value
            </div>
            <div className="text-xs text-blue-600 font-medium">
              3-6 turnovers/year • 60-120 days stock
            </div>
          </div>
        </div>

        <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Slow Moving</p>
              <p className="text-xl font-bold text-yellow-600">{movementSummary.slow.count}</p>
              <p className="text-xs text-yellow-600">₱{movementSummary.slow.value.toLocaleString()}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-yellow-700">
              {movementSummary.slow.percentage.toFixed(1)}% of inventory value
            </div>
            <div className="text-xs text-yellow-600 font-medium">
              1-3 turnovers/year • 120-365 days stock
            </div>
          </div>
        </div>

        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Dead Stock</p>
              <p className="text-xl font-bold text-red-600">{movementSummary.dead.count}</p>
              <p className="text-xs text-red-600">₱{movementSummary.dead.value.toLocaleString()}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-red-700">
              {movementSummary.dead.percentage.toFixed(1)}% of inventory value
            </div>
            <div className="text-xs text-red-600 font-medium">
              <1 turnover/year • >365 days stock
            </div>
          </div>
        </div>
      </div>

      {/* Movement Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2 text-green-600" />
            Top Performers (Fast Moving)
          </h3>
          <div className="space-y-2">
            {topPerformers.slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="flex items-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs font-medium mr-2">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-600">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">{item.turnoverRate}x/yr</div>
                  <div className="text-xs text-gray-500">{item.daysOfStock}d stock</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Needed */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
            Attention Needed (Slow/Dead Stock)
          </h3>
          <div className="space-y-2">
            {slowMovers.slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div className="flex items-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-800 text-xs font-medium mr-2">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-600">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-600">{item.turnoverRate}x/yr</div>
                  <div className="text-xs text-gray-500">₱{item.stockValue.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reorder Recommendations */}
      {reorderRecommendations.length > 0 && (
        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-orange-600" />
            Smart Reorder Recommendations ({reorderRecommendations.length} items)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reorderRecommendations.slice(0, 6).map((item) => (
              <div key={item.id} className="p-3 border border-orange-300 rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(item.movementCategory)}`}>
                    {getMovementIcon(item.movementCategory)}
                    <span className="ml-1">{item.movementCategory}</span>
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">{item.currentStock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reorder at:</span>
                    <span className="font-medium text-orange-600">{item.reorderPoint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suggest order:</span>
                    <span className="font-medium text-green-600">
                      {Math.max(0, item.reorderPoint - item.currentStock + 20)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Turnover:</span>
                    <span className="font-medium">{item.turnoverRate}x/yr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProfitTab = () => (
    <div className="space-y-6">
      {/* Profit Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-semibold text-gray-900">₱{profitAnalysis.totalProfit.toLocaleString()}</p>
              <p className="text-sm text-green-600">+{profitAnalysis.profitGrowth.toFixed(1)}% from last period</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Percent className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-semibold text-gray-900">{profitAnalysis.avgMargin.toFixed(1)}%</p>
              <p className="text-sm text-blue-600">Average across all products</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Best Category</p>
              <p className="text-2xl font-semibold text-gray-900">{profitAnalysis.bestCategory.name}</p>
              <p className="text-sm text-purple-600">{profitAnalysis.bestCategory.margin.toFixed(1)}% margin</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calculator className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ROI</p>
              <p className="text-2xl font-semibold text-gray-900">{profitAnalysis.roi.toFixed(1)}%</p>
              <p className="text-sm text-orange-600">Return on investment</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Profit Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="profit" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Profit by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profitability Analysis */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Product Profitability Analysis</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₱{product.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₱{(product.revenue * (1 - product.margin / 100)).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">₱{product.profit.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${product.margin >= 30 ? 'text-green-600' : product.margin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {product.margin}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(product.margin * 2).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderForecastTab = () => (
    <div className="space-y-6">
      {/* Forecast Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Next Week Forecast</p>
              <p className="text-2xl font-semibold text-gray-900">₱{forecast.nextWeek.revenue.toLocaleString()}</p>
              <p className="text-sm text-purple-600">{forecast.nextWeek.confidence.toFixed(1)}% confidence</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Growth Trend</p>
              <p className="text-2xl font-semibold text-gray-900">{forecast.growthTrend >= 0 ? '+' : ''}{forecast.growthTrend.toFixed(1)}%</p>
              <p className="text-sm text-green-600">Weekly growth rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Peak Day</p>
              <p className="text-2xl font-semibold text-gray-900">{forecast.peakDay}</p>
              <p className="text-sm text-blue-600">Highest sales expected</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Target</p>
              <p className="text-2xl font-semibold text-gray-900">₱{forecast.monthlyTarget.toLocaleString()}</p>
              <p className="text-sm text-orange-600">{forecast.targetProgress.toFixed(1)}% achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Forecast (Next 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast.dailyForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Predicted" />
              <Line type="monotone" dataKey="actual" stroke="#0ea5e9" strokeWidth={2} name="Historical" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Forecast</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecast.dailyForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            AI Insights & Recommendations
          </h3>
          <div className="space-y-4">
            {forecast.insights.map((insight, index) => (
              <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-purple-800">{insight}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Seasonal Patterns</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-800 font-medium">Monday</span>
              <span className="text-blue-600">-15% vs average</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Friday</span>
              <span className="text-green-600">+25% vs average</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Saturday</span>
              <span className="text-green-600">+35% vs average</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-800 font-medium">Sunday</span>
              <span className="text-yellow-600">+10% vs average</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Accuracy */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Forecast Accuracy & Model Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{forecast.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Overall Accuracy</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${forecast.accuracy}%` }}></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{forecast.modelConfidence.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Model Confidence</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${forecast.modelConfidence}%` }}></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{forecast.dataQuality.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Data Quality Score</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${forecast.dataQuality}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-4 overflow-x-auto">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'sales', name: 'Sales Analytics', icon: TrendingUp },
            { id: 'customers', name: 'Customer Analytics', icon: Users },
            { id: 'inventory', name: 'Inventory Movement', icon: Package },
            { id: 'profit', name: 'Profit Analysis', icon: DollarSign },
            { id: 'forecast', name: 'AI Forecast', icon: Brain },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'sales' && renderSalesTab()}
      {activeTab === 'customers' && renderCustomersTab()}
      {activeTab === 'inventory' && renderInventoryTab()}
      {activeTab === 'profit' && renderProfitTab()}
      {activeTab === 'forecast' && renderForecastTab()}
    </div>
  );
};

export default Analytics;