import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Package, BarChart3, Zap, Clock } from 'lucide-react';
import { InventoryAnalyticsService, ProductMovementAnalysis } from '../services/inventoryAnalytics';
import { mockProducts, mockSales } from '../data/mockData';

const InventoryMovementAnalysis: React.FC = () => {
  const [analysis, setAnalysis] = useState<ProductMovementAnalysis[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'fast' | 'medium' | 'slow' | 'dead'>('all');
  const [sortBy, setSortBy] = useState<'turnoverRate' | 'daysOfStock' | 'stockValue'>('turnoverRate');

  useEffect(() => {
    const movementAnalysis = InventoryAnalyticsService.analyzeProductMovement(mockProducts, mockSales);
    setAnalysis(movementAnalysis);
  }, []);

  const summary = InventoryAnalyticsService.getMovementSummary(analysis);
  const topPerformers = InventoryAnalyticsService.getTopPerformers(analysis);
  const slowMovers = InventoryAnalyticsService.getSlowMovers(analysis);
  const reorderRecommendations = InventoryAnalyticsService.getReorderRecommendations(analysis);

  const filteredAnalysis = analysis.filter(item => 
    selectedCategory === 'all' || item.movementCategory === selectedCategory
  ).sort((a, b) => {
    switch (sortBy) {
      case 'turnoverRate':
        return b.turnoverRate - a.turnoverRate;
      case 'daysOfStock':
        return a.daysOfStock - b.daysOfStock;
      case 'stockValue':
        return b.stockValue - a.stockValue;
      default:
        return 0;
    }
  });

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
      case 'dead': return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Movement Analysis</h2>
          <p className="text-gray-600">Analyze product velocity and optimize stock levels</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="turnoverRate">Sort by Turnover Rate</option>
            <option value="daysOfStock">Sort by Days of Stock</option>
            <option value="stockValue">Sort by Stock Value</option>
          </select>
        </div>
      </div>

      {/* Movement Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fast Moving</p>
              <p className="text-2xl font-semibold text-green-600">{summary.fast.count}</p>
              <p className="text-sm text-gray-500">₱{summary.fast.value.toLocaleString()}</p>
            </div>
            <Zap className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              {summary.fast.percentage.toFixed(1)}% of total value
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Medium Moving</p>
              <p className="text-2xl font-semibold text-blue-600">{summary.medium.count}</p>
              <p className="text-sm text-gray-500">₱{summary.medium.value.toLocaleString()}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              {summary.medium.percentage.toFixed(1)}% of total value
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Slow Moving</p>
              <p className="text-2xl font-semibold text-yellow-600">{summary.slow.count}</p>
              <p className="text-sm text-gray-500">₱{summary.slow.value.toLocaleString()}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              {summary.slow.percentage.toFixed(1)}% of total value
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dead Stock</p>
              <p className="text-2xl font-semibold text-red-600">{summary.dead.count}</p>
              <p className="text-sm text-gray-500">₱{summary.dead.value.toLocaleString()}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              {summary.dead.percentage.toFixed(1)}% of total value
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

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-4 mb-6">
          {[
            { id: 'all', name: 'All Products', count: analysis.length },
            { id: 'fast', name: 'Fast Moving', count: summary.fast.count },
            { id: 'medium', name: 'Medium Moving', count: summary.medium.count },
            { id: 'slow', name: 'Slow Moving', count: summary.slow.count },
            { id: 'dead', name: 'Dead Stock', count: summary.dead.count },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedCategory === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>

        {/* Detailed Analysis Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Movement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days of Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold (90d)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Velocity Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAnalysis.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMovementColor(item.movementCategory)}`}>
                      {getMovementIcon(item.movementCategory)}
                      <span className="ml-1 capitalize">{item.movementCategory}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{item.turnoverRate}x</div>
                    <div className="text-xs text-gray-500">per year</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{item.daysOfStock}</div>
                    <div className="text-xs text-gray-500">days</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.currentStock}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.unitsSoldLast90Days}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ₱{item.stockValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${item.velocityScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.velocityScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  );
};

export default InventoryMovementAnalysis;