import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Package, Users, Calendar, Star, AlertTriangle, Activity, Zap, Clock, Target, BarChart3, Brain, TrendingDown, PieChart as PieChartIcon, Calculator, ShoppingCart, UserCheck, Percent } from 'lucide-react';
import { mockProducts, mockSales, mockCustomers, mockCustomerPurchaseHistory } from '../data/mockData';
import { InventoryAnalyticsService } from '../services/inventoryAnalytics';
import { AnalyticsService } from '../services/analyticsService';

const Analytics: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get analytics data
  const salesData = AnalyticsService.getSalesAnalytics(selectedTimeRange);
  const inventoryData = InventoryAnalyticsService.getInventoryAnalytics();
  const customerData = AnalyticsService.getCustomerAnalytics();
  const productPerformance = AnalyticsService.getProductPerformance();

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

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
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="food">Food & Beverages</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${salesData.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{salesData.revenueGrowth}% vs last period
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{salesData.totalOrders.toLocaleString()}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{salesData.orderGrowth}% vs last period
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">${salesData.averageOrderValue}</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Calculator className="w-4 h-4 mr-1" />
                {salesData.aovChange > 0 ? '+' : ''}{salesData.aovChange}% vs last period
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Target className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customerData.activeCustomers.toLocaleString()}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <UserCheck className="w-4 h-4 mr-1" />
                +{customerData.customerGrowth}% vs last period
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData.dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
              <Area type="monotone" dataKey="sales" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            <Star className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productPerformance.slice(0, 5)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => [value, 'Units Sold']} />
              <Bar dataKey="unitsSold" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Status</h3>
            <Package className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={inventoryData.stockLevels}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {inventoryData.stockLevels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Segments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Segments</h3>
            <PieChartIcon className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={customerData.segments}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {customerData.segments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Rate */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Conversion Rate</h3>
            <Percent className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{salesData.conversionRate}%</p>
            <p className="text-sm text-gray-600 mt-2">
              {salesData.conversionChange > 0 ? '+' : ''}{salesData.conversionChange}% vs last period
            </p>
          </div>
        </div>

        {/* Average Session Duration */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Avg Session Duration</h3>
            <Clock className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{customerData.avgSessionDuration}</p>
            <p className="text-sm text-gray-600 mt-2">
              +{customerData.sessionDurationChange}% vs last period
            </p>
          </div>
        </div>

        {/* Return Rate */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Return Rate</h3>
            <TrendingDown className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{salesData.returnRate}%</p>
            <p className="text-sm text-gray-600 mt-2">
              {salesData.returnRateChange > 0 ? '+' : ''}{salesData.returnRateChange}% vs last period
            </p>
          </div>
        </div>
      </div>

      {/* Alerts and Insights */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Insights & Alerts</h3>
          <Brain className="w-5 h-5 text-gray-500" />
        </div>
        <div className="space-y-3">
          {inventoryData.lowStockAlerts.map((alert, index) => (
            <div key={index} className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800">Low Stock Alert</p>
                <p className="text-sm text-red-600">{alert.product} - Only {alert.quantity} units remaining</p>
              </div>
            </div>
          ))}
          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Zap className="w-5 h-5 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-800">Sales Opportunity</p>
              <p className="text-sm text-blue-600">Consider promoting slow-moving items with discounts</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <Activity className="w-5 h-5 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800">Performance Insight</p>
              <p className="text-sm text-green-600">Peak sales hours: 2-4 PM and 7-9 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;