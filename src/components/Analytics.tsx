import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Package, Users, Calendar, Star, AlertTriangle, Target, Activity, Zap, Brain, Filter, Download, RefreshCw, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import { mockProducts, mockSales, mockCustomers, mockCustomerPurchaseHistory } from '../data/mockData';
import { InventoryAnalyticsService } from '../services/inventoryAnalytics';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'movement'>('overview');

  // Mock data for charts
  const salesData = [
    { name: 'Mon', sales: 4200, revenue: 12500 },
    { name: 'Tue', sales: 3800, revenue: 11200 },
    { name: 'Wed', sales: 5100, revenue: 15300 },
    { name: 'Thu', sales: 4600, revenue: 13800 },
    { name: 'Fri', sales: 6200, revenue: 18600 },
    { name: 'Sat', sales: 7800, revenue: 23400 },
    { name: 'Sun', sales: 5900, revenue: 17700 },
  ];

  const categoryData = [
    { name: 'Cardiovascular', value: 35, color: '#0ea5e9' },
    { name: 'Diabetes', value: 25, color: '#22c55e' },
    { name: 'Respiratory', value: 20, color: '#f59e0b' },
    { name: 'Pain Relief', value: 15, color: '#ef4444' },
    { name: 'Vitamins', value: 5, color: '#8b5cf6' },
  ];

  // Enhanced top products with more realistic sales data
  const topProducts = [
    { 
      id: '1',
      name: 'Metformin 500mg', 
      sales: 156, 
      revenue: 2025.44,
      growth: 12.5,
      category: 'Diabetes',
      margin: 35.2
    },
    { 
      id: '2',
      name: 'Lisinopril 10mg', 
      sales: 134, 
      revenue: 2075.66,
      growth: 8.3,
      category: 'Cardiovascular',
      margin: 34.1
    },
    { 
      id: '3',
      name: 'Albuterol Inhaler', 
      sales: 89, 
      revenue: 4093.11,
      growth: 15.7,
      category: 'Respiratory',
      margin: 30.4
    },
    { 
      id: '4',
      name: 'Acetaminophen 500mg', 
      sales: 203, 
      revenue: 1826.97,
      growth: 5.2,
      category: 'Pain Relief',
      margin: 38.8
    },
    { 
      id: '5',
      name: 'Vitamin D3 1000IU', 
      sales: 67, 
      revenue: 836.83,
      growth: -2.1,
      category: 'Vitamins',
      margin: 37.5
    },
    { 
      id: '6',
      name: 'Omeprazole 20mg', 
      sales: 92, 
      revenue: 1564.32,
      growth: 9.8,
      category: 'Gastrointestinal',
      margin: 32.7
    },
    { 
      id: '7',
      name: 'Atorvastatin 20mg', 
      sales: 78, 
      revenue: 1872.45,
      growth: 6.4,
      category: 'Cardiovascular',
      margin: 29.3
    },
    { 
      id: '8',
      name: 'Levothyroxine 50mcg', 
      sales: 112, 
      revenue: 1456.78,
      growth: 11.2,
      category: 'Endocrine',
      margin: 41.2
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

  // Inventory Movement Analysis
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

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Sales Overview
          </button>
          <button
            onClick={() => setActiveTab('movement')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
              activeTab === 'movement'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Activity className="h-4 w-4 mr-2" />
            Inventory Movement
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
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
                <Package className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
                  <p className="text-2xl font-semibold text-gray-900">₱29.92</p>
                  <p className="text-sm text-orange-600">+3.8% from last week</p>
                </div>
              </div>
            </div>
          </div>

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

          {/* Top Selling Products - Enhanced */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Top Selling Products
              </h2>
              <div className="text-sm text-gray-600">
                Based on {timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : timeRange === '90d' ? 'last 90 days' : 'last year'}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Growth
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </span>
                          {index < 3 && (
                            <Star className={`h-4 w-4 ml-1 ${
                              index === 0 ? 'text-yellow-500' :
                              index === 1 ? 'text-gray-400' :
                              'text-orange-400'
                            }`} />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{product.sales}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">₱{product.revenue.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-sm ${
                          product.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className={`h-4 w-4 mr-1 ${
                            product.growth >= 0 ? 'text-green-600' : 'text-red-600 transform rotate-180'
                          }`} />
                          {product.growth >= 0 ? '+' : ''}{product.growth}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.margin}%</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Near Expiring Medicines */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Near Expiring Medicines
              </h2>
              <div className="text-sm text-gray-600">
                Products expiring within 90 days
              </div>
            </div>

            {nearExpiringMedicines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Until Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value at Risk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Urgency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {nearExpiringMedicines.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.dosage} - {product.form}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.batchNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.stock} units</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(product.expiryDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            product.daysUntilExpiry <= 30 ? 'text-red-600' :
                            product.daysUntilExpiry <= 60 ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {product.daysUntilExpiry} days
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            ₱{(product.stock * product.cost).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(product.urgency)}`}>
                            {product.urgency.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Near Expiring Products</h3>
                <p className="text-gray-600">All products have sufficient time before expiration.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Inventory Movement Analysis */}
          <div className="space-y-6">
            {/* Movement Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fast Moving</p>
                    <p className="text-2xl font-semibold text-green-600">{movementSummary.fast.count}</p>
                    <p className="text-sm text-gray-500">₱{movementSummary.fast.value.toLocaleString()}</p>
                  </div>
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600">
                    {movementSummary.fast.percentage.toFixed(1)}% of total value
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medium Moving</p>
                    <p className="text-2xl font-semibold text-blue-600">{movementSummary.medium.count}</p>
                    <p className="text-sm text-gray-500">₱{movementSummary.medium.value.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600">
                    {movementSummary.medium.percentage.toFixed(1)}% of total value
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Slow Moving</p>
                    <p className="text-2xl font-semibold text-yellow-600">{movementSummary.slow.count}</p>
                    <p className="text-sm text-gray-500">₱{movementSummary.slow.value.toLocaleString()}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600">
                    {movementSummary.slow.percentage.toFixed(1)}% of total value
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Dead Stock</p>
                    <p className="text-2xl font-semibold text-red-600">{movementSummary.dead.count}</p>
                    <p className="text-sm text-gray-500">₱{movementSummary.dead.value.toLocaleString()}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600">
                    {movementSummary.dead.percentage.toFixed(1)}% of total value
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Top Performers (Fast Moving)
                </h3>
                <div className="space-y-3">
                  {topPerformers.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">{item.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{item.turnoverRate}x</div>
                        <div className="text-xs text-gray-500">{item.daysOfStock} days</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slow Movers */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                  Attention Needed (Slow/Dead Stock)
                </h3>
                <div className="space-y-3">
                  {slowMovers.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-medium mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">{item.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">{item.turnoverRate}x</div>
                        <div className="text-xs text-gray-500">₱{item.stockValue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reorder Recommendations */}
            {reorderRecommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                  Reorder Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reorderRecommendations.slice(0, 6).map((item) => (
                    <div key={item.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(item.movementCategory)}`}>
                          {item.movementCategory}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Stock:</span>
                          <span className="font-medium">{item.currentStock}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reorder Point:</span>
                          <span className="font-medium text-orange-600">{item.reorderPoint}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Suggested Order:</span>
                          <span className="font-medium text-green-600">
                            {Math.max(0, item.reorderPoint - item.currentStock + 20)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;