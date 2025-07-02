import React, { useState } from 'react';
import { Search, Plus, Edit, AlertTriangle, Package, TrendingUp, TrendingDown, ShoppingCart, Pill, X, Save } from 'lucide-react';
import { Product } from '../types';
import { mockProducts } from '../data/mockData';
import toast from 'react-hot-toast';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'drug' | 'grocery'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    productType: 'drug',
    prescriptionRequired: false,
    stock: 0,
    minStock: 10,
    price: 0,
    cost: 0,
    contraindications: [],
    sideEffects: [],
    interactions: []
  });

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

  const handleAddProduct = () => {
    // Validation
    if (!newProduct.name || !newProduct.category || !newProduct.manufacturer || 
        !newProduct.batchNumber || !newProduct.expiryDate || 
        newProduct.price === undefined || newProduct.cost === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Additional validation for drugs
    if (newProduct.productType === 'drug' && (!newProduct.genericName || !newProduct.dosage || !newProduct.form)) {
      toast.error('Please fill in all drug-specific fields (Generic Name, Dosage, Form)');
      return;
    }

    // Additional validation for grocery
    if (newProduct.productType === 'grocery' && (!newProduct.brand || !newProduct.unit)) {
      toast.error('Please fill in all grocery-specific fields (Brand, Unit)');
      return;
    }

    // Generate new product ID
    const newId = newProduct.productType === 'drug' 
      ? `${products.filter(p => p.productType === 'drug').length + 1}`
      : `G${String(products.filter(p => p.productType === 'grocery').length + 1).padStart(3, '0')}`;

    const productToAdd: Product = {
      id: newId,
      name: newProduct.name!,
      genericName: newProduct.genericName,
      category: newProduct.category!,
      manufacturer: newProduct.manufacturer!,
      dosage: newProduct.dosage,
      form: newProduct.form,
      price: newProduct.price!,
      cost: newProduct.cost!,
      stock: newProduct.stock!,
      minStock: newProduct.minStock!,
      expiryDate: newProduct.expiryDate!,
      batchNumber: newProduct.batchNumber!,
      prescriptionRequired: newProduct.prescriptionRequired!,
      activeIngredient: newProduct.activeIngredient,
      contraindications: newProduct.contraindications || [],
      sideEffects: newProduct.sideEffects || [],
      interactions: newProduct.interactions || [],
      barcode: newProduct.barcode,
      productType: newProduct.productType!,
      unit: newProduct.unit,
      brand: newProduct.brand,
      description: newProduct.description
    };

    setProducts([...products, productToAdd]);
    setShowAddModal(false);
    setNewProduct({
      productType: 'drug',
      prescriptionRequired: false,
      stock: 0,
      minStock: 10,
      price: 0,
      cost: 0,
      contraindications: [],
      sideEffects: [],
      interactions: []
    });
    toast.success(`${productToAdd.name} added successfully!`);
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field: 'contraindications' | 'sideEffects' | 'interactions', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setNewProduct(prev => ({
      ...prev,
      [field]: items
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Add New Product</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Product Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="drug"
                        checked={newProduct.productType === 'drug'}
                        onChange={(e) => handleInputChange('productType', e.target.value)}
                        className="mr-2"
                      />
                      <Pill className="h-4 w-4 mr-1" />
                      Drug
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="grocery"
                        checked={newProduct.productType === 'grocery'}
                        onChange={(e) => handleInputChange('productType', e.target.value)}
                        className="mr-2"
                      />
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Grocery
                    </label>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={newProduct.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter product name"
                    />
                  </div>

                  {newProduct.productType === 'drug' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Generic Name *</label>
                      <input
                        type="text"
                        value={newProduct.genericName || ''}
                        onChange={(e) => handleInputChange('genericName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter generic name"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
                      <input
                        type="text"
                        value={newProduct.brand || ''}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter brand name"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <input
                      type="text"
                      value={newProduct.category || ''}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter category"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer *</label>
                    <input
                      type="text"
                      value={newProduct.manufacturer || ''}
                      onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter manufacturer"
                    />
                  </div>
                </div>

                {/* Product Type Specific Fields */}
                {newProduct.productType === 'drug' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dosage *</label>
                      <input
                        type="text"
                        value={newProduct.dosage || ''}
                        onChange={(e) => handleInputChange('dosage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., 500mg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Form *</label>
                      <select
                        value={newProduct.form || ''}
                        onChange={(e) => handleInputChange('form', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select form</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Cream">Cream</option>
                        <option value="Ointment">Ointment</option>
                        <option value="Inhaler">Inhaler</option>
                        <option value="Drops">Drops</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Active Ingredient</label>
                      <input
                        type="text"
                        value={newProduct.activeIngredient || ''}
                        onChange={(e) => handleInputChange('activeIngredient', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter active ingredient"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                      <select
                        value={newProduct.unit || ''}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="liter">Liter</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="piece">Piece</option>
                        <option value="pack">Pack</option>
                        <option value="bottle">Bottle</option>
                        <option value="box">Box</option>
                        <option value="bag">Bag</option>
                        <option value="container">Container</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <input
                        type="text"
                        value={newProduct.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter product description"
                      />
                    </div>
                  </div>
                )}

                {/* Inventory Information */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.cost || ''}
                      onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                    <input
                      type="number"
                      value={newProduct.stock || ''}
                      onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock *</label>
                    <input
                      type="number"
                      value={newProduct.minStock || ''}
                      onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Batch and Expiry Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number *</label>
                    <input
                      type="text"
                      value={newProduct.batchNumber || ''}
                      onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter batch number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                    <input
                      type="date"
                      value={newProduct.expiryDate || ''}
                      onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                    <input
                      type="text"
                      value={newProduct.barcode || ''}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter barcode"
                    />
                  </div>
                </div>

                {/* Drug-specific additional fields */}
                {newProduct.productType === 'drug' && (
                  <>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newProduct.prescriptionRequired || false}
                          onChange={(e) => handleInputChange('prescriptionRequired', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Prescription Required</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contraindications</label>
                        <textarea
                          value={newProduct.contraindications?.join(', ') || ''}
                          onChange={(e) => handleArrayInputChange('contraindications', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter contraindications separated by commas"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Side Effects</label>
                        <textarea
                          value={newProduct.sideEffects?.join(', ') || ''}
                          onChange={(e) => handleArrayInputChange('sideEffects', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter side effects separated by commas"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Drug Interactions</label>
                        <textarea
                          value={newProduct.interactions?.join(', ') || ''}
                          onChange={(e) => handleArrayInputChange('interactions', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter drug interactions separated by commas"
                          rows={3}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProduct}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Add Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;