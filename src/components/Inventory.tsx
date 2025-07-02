import React, { useState } from 'react';
import { Search, Plus, Edit, AlertTriangle, Package, TrendingUp, TrendingDown, ShoppingCart, Pill } from 'lucide-react';
import { Product } from '../types';
import { mockProducts } from '../data/mockData';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'drug' | 'grocery'>('all');

  // Filter products by type
  const filteredByType = products.filter(product => {
    if (productTypeFilter === 'all') return true;
    return product.productType === productTypeFilter;
  });

  const categories = [...new Set(filteredByType.map(p => p.category))];
  
  const filteredProducts = filteredByType.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesLowStock = !showLowStock || product.stock <= product.minStock;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Calculate stats for current filter
  const lowStockCount = filteredByType.filter(p => p.stock <= p.minStock).length;
  const totalValue = filteredByType.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalItems = filteredByType.reduce((sum, p) => sum + p.stock, 0);

  // Separate stats for drugs and grocery
  const drugProducts = products.filter(p => p.productType === 'drug');
  const groceryProducts = products.filter(p => p.productType === 'grocery');

  const drugStats = {
    count: drugProducts.length,
    value: drugProducts.reduce((sum, p) => sum + (p.price * p.stock), 0),
    lowStock: drugProducts.filter(p => p.stock <= p.minStock).length
  };

  const groceryStats = {
    count: groceryProducts.length,
    value: groceryProducts.reduce((sum, p) => sum + (p.price * p.stock), 0),
    lowStock: groceryProducts.filter(p => p.stock <= p.minStock).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </button>
      </div>

      {/* Product Type Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setProductTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
              productTypeFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Package className="h-4 w-4 mr-2" />
            All Products ({products.length})
          </button>
          <button
            onClick={() => setProductTypeFilter('drug')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
              productTypeFilter === 'drug'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Pill className="h-4 w-4 mr-2" />
            Drugs ({drugProducts.length})
          </button>
          <button
            onClick={() => setProductTypeFilter('grocery')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
              productTypeFilter === 'grocery'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Grocery ({groceryProducts.length})
          </button>
        </div>

        {/* Type-specific Stats */}
        {productTypeFilter === 'drug' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{drugStats.count}</div>
              <div className="text-sm text-blue-600">Drug Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">₱{drugStats.value.toLocaleString()}</div>
              <div className="text-sm text-blue-600">Drug Inventory Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{drugStats.lowStock}</div>
              <div className="text-sm text-red-600">Low Stock Drugs</div>
            </div>
          </div>
        )}

        {productTypeFilter === 'grocery' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{groceryStats.count}</div>
              <div className="text-sm text-green-600">Grocery Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₱{groceryStats.value.toLocaleString()}</div>
              <div className="text-sm text-green-600">Grocery Inventory Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{groceryStats.lowStock}</div>
              <div className="text-sm text-red-600">Low Stock Grocery</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {productTypeFilter === 'all' ? 'Total Products' : 
                 productTypeFilter === 'drug' ? 'Drug Products' : 'Grocery Items'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">{filteredByType.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-semibold text-gray-900">₱{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">{lowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products, batch numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isLowStock = product.stock <= product.minStock;
                const isExpiringSoon = new Date(product.expiryDate) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.productType === 'drug' ? product.genericName : product.brand}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.productType === 'drug' 
                            ? `${product.dosage} - ${product.form}` 
                            : `${product.unit} - ${product.description?.substring(0, 30)}...`
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.productType === 'drug' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.productType === 'drug' ? (
                          <>
                            <Pill className="h-3 w-3 mr-1" />
                            Drug
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Grocery
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border">
                        {product.batchNumber}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {product.manufacturer}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.stock} {product.unit || 'units'}
                      </div>
                      <div className="text-sm text-gray-500">Min: {product.minStock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(product.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {isLowStock && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </span>
                        )}
                        {product.prescriptionRequired && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Rx Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 mr-3">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Restock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;