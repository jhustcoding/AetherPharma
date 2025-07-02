import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Package, Users, Calendar, Star, AlertTriangle, Target, Activity, Zap, Brain, Filter, Download, RefreshCw } from 'lucide-react';
import { mockProducts, mockSales, mockCustomers, mockCustomerPurchaseHistory } from '../data/mockData';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'customers' | 'predictions'>('overview');

  // Enhanced mock data for comprehensive analytics
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

  // Customer segmentation data
  const customerSegments = [
    { segment: 'VIP Customers', count: 45, revenue: 85000, avgOrder: 125.50, color: '#10b981' },
    { segment: 'Regular Customers', count: 180, revenue: 120000, avgOrder: 85.30, color: '#3b82f6' },
    { segment: 'Occasional Customers', count: 320, revenue: 95000, avgOrder: 45.20, color: '#f59e0b' },
    { segment: 'New Customers', count: 125, revenue: 25000, avgOrder: 35.80, color: '#8b5cf6' },
  ];

  // Inventory turnover data
  const inventoryTurnover = [
    { category: 'Fast Moving', products: 45, turnoverRate: 8.5, value: 125000 },
    { category: 'Medium Moving', products: 78, turnoverRate: 4.2, value: 89000 },
    { category: 'Slow Moving', products: 32, turnoverRate: 1.8, value: 45000 },
    { category: 'Dead Stock', products: 12, turnoverRate: 0.2, value: 15000 },
  ];

  // Predictive analytics data
  const demandForecast = [
    { month: 'Feb', predicted: 125000, actual: 118000, confidence: 92 },
    { month: 'Mar', predicted: 135000, actual: null, confidence: 89 },
    { month: 'Apr', predicted: 142000, actual: null, confidence: 87 },
    { month: 'May', predicted: 138000, actual: null, confidence: 85 },
    { month: 'Jun', predicted: 145000, actual: null, confidence: 88 },
  ];

  // Enhanced top products with more analytics
  const topProducts = [
    { 
      id: '1',
      name: 'Metformin 500mg', 
      sales: 156, 
      revenue: 2025.44,
      growth: 12.5,
      category: 'Diabetes',
      margin: 35.2,
      turnoverRate: 8.2,
      stockDays: 45
    },
    { 
      id: '2',
      name: 'Lisinopril 10mg', 
      sales: 134, 
      revenue: 2075.66,
      growth: 8.3,
      category: 'Cardiovascular',
      margin: 34.1,
      turnoverRate: 7.8,
      stockDays: 47
    },
    { 
      id: '3',
      name: 'Albuterol Inhaler', 
      sales: 89, 
      revenue: 4093.11,
      growth: 15.7,
      category: 'Respiratory',
      margin: 30.4,
      turnoverRate: 6.5,
      stockDays: 56
    },
    { 
      id: '4',
      name: 'Acetaminophen 500mg', 
      sales: 203, 
      revenue: 1826.97,
      growth: 5.2,
      category: 'Pain Relief',
      margin: 38.8,
      turnoverRate: 9.1,
      stockDays: 40
    },
    { 
      id: '5',
      name: 'Vitamin D3 1000IU', 
      sales: 67, 
      revenue: 836.83,
      growth: -2.1,
      category: 'Vitamins',
      margin: 37.5,
      turnoverRate: 3.2,
      stockDays: 114
    }
  ];

  // Near expiring medicines
  const nearExpiringMedicines = mockProducts.filter(product => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  }).map(product => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...product,
      daysUntilExpiry,
      urgency: daysUntilExpiry <= 30 ? 'high' : daysUntilExpiry <= 60 ? 'medium' : 'low'
    };
  }).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTurnoverColor = (rate: number) => {
    if (rate >= 6) return 'text-green-600 bg-green-50';
    if (rate >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
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
              <p className="text-2xl font-semibold text-gray-900">₱112,500</p>
              <p className="text-sm text-green-600">+12.5% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">37,600</p>
              <p className="text-sm text-blue-600">+8.2% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-semibold text-gray-900">1,248</p>
              <p className="text-sm text-purple-600">+5.1% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">₱29.92</p>
              <p className="text-sm text-orange-600">+3.8% from last week</p>
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
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
              <Area type="monotone" dataKey="profit" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Category</h2>
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
              <Tooltip formatter={(value, name) => [`₱${categoryData.find(c => c.name === name)?.revenue?.toLocaleString()}`, 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderSalesTab = () => (
    <div className="space-y-6">
      {/* Sales Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-semibold text-gray-900">₱16,071</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Peak Hour</p>
              <p className="text-2xl font-semibold text-gray-900">2-4 PM</p>
            </div>
            <Zap className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">78.5%</p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Detailed Sales Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Detailed Sales Analysis</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="sales" fill="#0ea5e9" name="Units Sold" />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} name="Revenue (₱)" />
            <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} name="Profit (₱)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Selling Products Enhanced */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Top Performing Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product, index) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.sales}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">₱{product.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.growth >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.growth >= 0 ? '+' : ''}{product.growth}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.margin}%</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTurnoverColor(product.turnoverRate)}`}>
                      {product.turnoverRate}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventoryTab = () => (
    <div className="space-y-6">
      {/* Inventory Turnover Analysis */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Inventory Turnover Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {inventoryTurnover.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-900">{item.category}</h3>
              <div className="mt-2 space-y-1">
                <div className="text-2xl font-bold text-gray-900">{item.products}</div>
                <div className="text-sm text-gray-600">Products</div>
                <div className="text-sm">
                  <span className="font-medium">Turnover:</span> {item.turnoverRate}x/year
                </div>
                <div className="text-sm">
                  <span className="font-medium">Value:</span> ₱{item.value.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Level Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Stock Level Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={inventoryTurnover}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="products" fill="#0ea5e9" name="Number of Products" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Near Expiring Products */}
      {nearExpiringMedicines.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Products Expiring Soon
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value at Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {nearExpiringMedicines.slice(0, 10).map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.dosage} - {product.form}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.batchNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.stock}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(product.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(product.urgency)}`}>
                        {product.daysUntilExpiry} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ₱{(product.stock * product.cost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderCustomersTab = () => (
    <div className="space-y-6">
      {/* Customer Segmentation */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Segmentation Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {customerSegments.map((segment, index) => (
            <div key={index} className="p-4 border rounded-lg" style={{ borderLeftColor: segment.color, borderLeftWidth: '4px' }}>
              <h3 className="font-medium text-gray-900">{segment.segment}</h3>
              <div className="mt-2 space-y-1">
                <div className="text-2xl font-bold" style={{ color: segment.color }}>{segment.count}</div>
                <div className="text-sm text-gray-600">Customers</div>
                <div className="text-sm">
                  <span className="font-medium">Revenue:</span> ₱{segment.revenue.toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Avg Order:</span> ₱{segment.avgOrder}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Lifetime Value Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Value Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={customerSegments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="segment" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#0ea5e9" name="Total Revenue (₱)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Retention Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Retention Rate</p>
              <p className="text-2xl font-semibold text-gray-900">85.2%</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Customer Lifetime</p>
              <p className="text-2xl font-semibold text-gray-900">2.3 years</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customer LTV</p>
              <p className="text-2xl font-semibold text-gray-900">₱2,450</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      {/* AI Predictions Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center">
          <Brain className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI-Powered Predictions</h2>
            <p className="text-gray-600">Advanced analytics and forecasting for better business decisions</p>
          </div>
        </div>
      </div>

      {/* Demand Forecast */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Demand Forecast (Next 6 Months)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={demandForecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={3} name="Actual Revenue" />
            <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Predicted Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Prediction Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Forecast Accuracy</p>
              <p className="text-2xl font-semibold text-gray-900">89.5%</p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trend Confidence</p>
              <p className="text-2xl font-semibold text-gray-900">92.1%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Model Performance</p>
              <p className="text-2xl font-semibold text-gray-900">A+</p>
            </div>
            <Star className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">AI Recommendations</h2>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-green-900">Increase Stock for Cardiovascular Medications</h3>
                <p className="text-sm text-green-700 mt-1">
                  Predicted 15% increase in demand for cardiovascular medications in the next month. 
                  Consider increasing stock by 20% to avoid stockouts.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-yellow-900">Optimize Vitamin Inventory</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Vitamin sales show seasonal decline. Consider reducing orders by 10% 
                  and focus on faster-moving supplements.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Users className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-blue-900">Customer Retention Opportunity</h3>
                <p className="text-sm text-blue-700 mt-1">
                  45 customers haven't visited in 60+ days. Consider targeted promotions 
                  or health check reminders to re-engage them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive business intelligence and insights</p>
        </div>
        <div className="flex items-center space-x-3">
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
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-1">
        <nav className="flex space-x-1">
          {[
            { id: 'overview', name: 'Overview', icon: Activity },
            { id: 'sales', name: 'Sales Analysis', icon: TrendingUp },
            { id: 'inventory', name: 'Inventory', icon: Package },
            { id: 'customers', name: 'Customers', icon: Users },
            { id: 'predictions', name: 'AI Predictions', icon: Brain },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'sales' && renderSalesTab()}
      {activeTab === 'inventory' && renderInventoryTab()}
      {activeTab === 'customers' && renderCustomersTab()}
      {activeTab === 'predictions' && renderPredictionsTab()}
    </div>
  );
};

export default Analytics;