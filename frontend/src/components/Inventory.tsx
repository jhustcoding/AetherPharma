import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, AlertTriangle, Package, TrendingUp, TrendingDown, ShoppingCart, Pill, X, Save, CheckCircle, XCircle, Loader2, Camera, Scan } from 'lucide-react';
import { Product, Supplier } from '../types';
import { SupplierService } from '../services/supplierService';
import toast from 'react-hot-toast';
import { config } from '../config';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'drug' | 'grocery'>('all');
  const [drugTypeFilter, setDrugTypeFilter] = useState<'all' | 'generic' | 'branded'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [editSupplierSearchTerm, setEditSupplierSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    productType: 'drug',
    drugType: 'generic',
    prescriptionRequired: false,
    stock: 0,
    minStock: 10,
    price: 0,
    cost: 0,
    contraindications: [],
    sideEffects: [],
    interactions: [],
    supplierIds: []
  });

  // Load products and suppliers from API on component mount
  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await SupplierService.getSuppliers(1, 100);
      setSuppliers(response.suppliers);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      // Request all products with a high limit to ensure we get all grocery items
      const response = await fetch(`${config.API_BASE_URL}/products?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const productsData = await response.json();
        // The API returns {products: [...], total: N} format
        const products = productsData.products || productsData;
        
        // Convert API field names to frontend field names
        const convertedProducts = products.map((product: any) => ({
          ...product,
          productType: product.product_type || product.productType,
          minStock: product.min_stock || product.minStock,
          expiryDate: product.expiry_date || product.expiryDate,
          batchNumber: product.batch_number || product.batchNumber,
          prescriptionRequired: product.prescription_required || product.prescriptionRequired,
          activeIngredient: product.active_ingredient || product.activeIngredient,
          genericName: product.generic_name || product.genericName
        }));
        
        console.log('Loaded products:', convertedProducts);
        console.log('Grocery products:', convertedProducts.filter((p: Product) => p.productType === 'grocery'));
        console.log('Total products loaded:', convertedProducts.length);
        setProducts(convertedProducts);
      } else {
        console.error('Failed to load products. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    }
  };

  // Filter products by type and drug type
  const filteredByType = products.filter(product => {
    // Filter by product type (all/drug/grocery)
    const matchesProductType = productTypeFilter === 'all' || product.productType === productTypeFilter;
    
    // Filter by drug type (generic/branded) - only applies to drugs
    let matchesDrugType = true;
    if (product.productType === 'drug' && drugTypeFilter !== 'all') {
      if (drugTypeFilter === 'generic') {
        // Generic drugs typically have a generic name but no brand, or the brand is the same as generic
        matchesDrugType = Boolean(product.genericName && (!product.brand || product.brand === product.genericName));
      } else if (drugTypeFilter === 'branded') {
        // Branded drugs have a brand name that's different from the generic name
        matchesDrugType = Boolean(product.brand && product.genericName && product.brand !== product.genericName);
      }
    }
    
    return matchesProductType && matchesDrugType;
  });

  const categories = Array.from(new Set(filteredByType.map((p: Product) => p.category)));
  
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

  const handleAddProduct = async () => {
    // Validation
    if (!newProduct.name || !newProduct.category || !newProduct.manufacturer || 
        !newProduct.batchNumber || !newProduct.expiryDate || 
        newProduct.price === undefined || newProduct.cost === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Additional validation for drugs
    if (newProduct.productType === 'drug') {
      if (!newProduct.dosage || !newProduct.form) {
        toast.error('Please fill in all drug-specific fields (Dosage, Form)');
        return;
      }
      
      if (newProduct.drugType === 'generic' && !newProduct.genericName) {
        toast.error('Please enter the generic name for generic drugs');
        return;
      }
      
      if (newProduct.drugType === 'branded' && (!newProduct.brand || !newProduct.genericName)) {
        toast.error('Please enter both brand name and generic name for branded drugs');
        return;
      }
    }

    // Additional validation for grocery
    if (newProduct.productType === 'grocery' && (!newProduct.brand || !newProduct.unit)) {
      toast.error('Please fill in all grocery-specific fields (Brand, Unit)');
      return;
    }

    setIsAddingProduct(true);

    try {
      // Create product data with supplier_ids
      const productData = {
        name: newProduct.name!,
        generic_name: newProduct.genericName || '',
        category: newProduct.category!,
        manufacturer: newProduct.manufacturer!,
        dosage: newProduct.dosage || '',
        form: newProduct.form || '',
        price: Number(newProduct.price!) || 0,
        cost: Number(newProduct.cost!) || 0,
        stock: Number(newProduct.stock!) || 0,
        min_stock: Number(newProduct.minStock!) || 10,
        expiry_date: newProduct.expiryDate!,
        batch_number: newProduct.batchNumber!,
        prescription_required: Boolean(newProduct.prescriptionRequired),
        active_ingredient: newProduct.activeIngredient || '',
        therapeutic_classification: newProduct.therapeuticClassification || '',
        drug_type: newProduct.drugType || 'generic',
        contraindications: newProduct.contraindications || [],
        side_effects: newProduct.sideEffects || [],
        drug_interactions: newProduct.interactions || [],
        barcode: newProduct.barcode || '',
        product_type: newProduct.productType! || 'drug',
        unit: newProduct.unit || 'piece',
        brand: newProduct.brand || '',
        description: newProduct.description || '',
        sku: `${newProduct.productType === 'drug' ? 'D' : 'G'}-${Date.now()}`,
        manufacture_date: new Date().toISOString().split('T')[0],
        supplier_ids: newProduct.supplierIds || []
      };

      const response = await fetch(`${config.API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        const createdProduct = await response.json();
        console.log('Product created successfully:', createdProduct);
        
        // Reload products to get the updated list
        await loadProducts();
        
        setIsAddingProduct(false);
        setShowSuccessMessage(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }
    } catch (error) {
      setIsAddingProduct(false);
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
      return;
    }

    // Enhanced success notification
    toast.success(
      `✅ ${newProduct.name} successfully added to inventory!`,
      {
        duration: 4000,
        style: {
          background: '#10B981',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }
      }
    );

    // Show success message for 2 seconds then close modal
    setTimeout(() => {
      setShowSuccessMessage(false);
      setShowAddModal(false);
      setNewProduct({
        productType: 'drug',
        drugType: 'generic',
        prescriptionRequired: false,
        stock: 0,
        minStock: 10,
        price: 0,
        cost: 0,
        contraindications: [],
        sideEffects: [],
        interactions: [],
        supplierIds: []
      });
    }, 2000);
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setIsAddingProduct(false);
    setShowSuccessMessage(false);
    setShowBarcodeScanner(false);
    setIsScanning(false);
    setSupplierSearchTerm('');
    setNewProduct({
      productType: 'drug',
      drugType: 'generic',
      prescriptionRequired: false,
      stock: 0,
      minStock: 10,
      price: 0,
      cost: 0,
      contraindications: [],
      sideEffects: [],
      interactions: [],
      supplierIds: []
    });
  };

  const startBarcodeScanning = async () => {
    try {
      setIsScanning(true);
      setShowBarcodeScanner(true);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      const video = document.getElementById('barcode-video') as HTMLVideoElement;
      if (video) {
        video.srcObject = stream;
        video.play();
        
        // Start scanning process
        scanBarcode(video, stream);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please check permissions.');
      setIsScanning(false);
      setShowBarcodeScanner(false);
    }
  };

  const scanBarcode = (video: HTMLVideoElement, stream: MediaStream) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const scanFrame = () => {
      if (!isScanning) {
        // Stop scanning
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Simple barcode detection using image analysis
        // This is a basic implementation - in production you'd use a proper barcode library
        const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          const detectedBarcode = detectBarcodeFromImageData(imageData);
          if (detectedBarcode) {
            handleBarcodeDetected(detectedBarcode);
            return;
          }
        }
      }
      
      // Continue scanning
      requestAnimationFrame(scanFrame);
    };
    
    scanFrame();
  };

  const detectBarcodeFromImageData = (imageData: ImageData): string | null => {
    // This is a simplified barcode detection
    // In a real implementation, you'd use a proper barcode scanning library like ZXing
    
    // For demonstration, we'll implement a basic pattern detection
    // This looks for high contrast vertical lines which could indicate a barcode
    const { data, width, height } = imageData;
    const minLineHeight = Math.floor(height * 0.1); // Minimum 10% of image height
    
    // Sample rows in the middle third of the image
    const startRow = Math.floor(height * 0.33);
    const endRow = Math.floor(height * 0.66);
    
    for (let row = startRow; row < endRow; row += 5) {
      const transitions = [];
      let lastIntensity = -1;
      
      for (let col = 0; col < width; col += 2) {
        const pixelIndex = (row * width + col) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Convert to grayscale
        const intensity = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const binaryValue = intensity > 128 ? 1 : 0;
        
        if (lastIntensity !== -1 && lastIntensity !== binaryValue) {
          transitions.push(col);
        }
        lastIntensity = binaryValue;
      }
      
      // Look for barcode-like patterns (many transitions in a concentrated area)
      if (transitions.length > 20 && transitions.length < 200) {
        // Check if transitions are relatively evenly spaced (barcode characteristic)
        const avgSpacing = (transitions[transitions.length - 1] - transitions[0]) / transitions.length;
        if (avgSpacing > 3 && avgSpacing < 20) {
          // Generate a demo barcode based on the pattern
          const timestamp = Date.now().toString().slice(-10);
          return `${timestamp}${Math.floor(Math.random() * 100)}`;
        }
      }
    }
    
    return null;
  };

  const handleBarcodeDetected = (barcode: string) => {
    setNewProduct(prev => ({ ...prev, barcode }));
    stopBarcodeScanning();
    toast.success(`Barcode detected: ${barcode}`);
  };

  const stopBarcodeScanning = () => {
    setIsScanning(false);
    setShowBarcodeScanner(false);
    
    // Stop camera stream
    const video = document.getElementById('barcode-video') as HTMLVideoElement;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  };

  const handleManualBarcodeEntry = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode) {
      setNewProduct(prev => ({ ...prev, barcode }));
      toast.success(`Barcode entered: ${barcode}`);
    }
  };

  const handleArrayInputChange = (field: 'contraindications' | 'sideEffects' | 'interactions', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setNewProduct(prev => ({
      ...prev,
      [field]: items
    }));
  };

  const handleEdit = (product: Product) => {
    console.log('Edit clicked for product:', product);
    // Extract supplier IDs from the product's suppliers array
    const supplierIds = product.suppliers?.map(s => s.id) || [];
    setEditProduct({
      ...product,
      supplierIds
    });
    setShowEditModal(true);
  };

  const handleRestock = (product: Product) => {
    console.log('Restock clicked for product:', product);
    setSelectedProduct(product);
    setRestockQuantity(0);
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async () => {
    if (!selectedProduct || restockQuantity <= 0) {
      toast.error('Please enter a valid restock quantity');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.API_BASE_URL}/products/${selectedProduct.id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: restockQuantity,
          operation: 'add'
        })
      });

      if (response.ok) {
        toast.success(`Successfully restocked ${selectedProduct.name} with ${restockQuantity} units`);
        await loadProducts(); // Reload products to get updated stock
        setShowRestockModal(false);
        setSelectedProduct(null);
        setRestockQuantity(0);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to restock product');
      }
    } catch (error) {
      console.error('Error restocking product:', error);
      toast.error('Failed to restock product');
    }
  };

  const handleEditSubmit = async () => {
    if (!editProduct || !editProduct.id) {
      toast.error('Invalid product data');
      return;
    }

    // Basic validation
    if (!editProduct.name || !editProduct.category || !editProduct.manufacturer || 
        editProduct.price === undefined || editProduct.cost === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      
      // Prepare the update payload with backend field names
      const updatePayload = {
        name: editProduct.name,
        category: editProduct.category,
        manufacturer: editProduct.manufacturer,
        price: editProduct.price,
        cost: editProduct.cost,
        min_stock: editProduct.minStock,
        expiry_date: editProduct.expiryDate,
        dosage: editProduct.dosage,
        form: editProduct.form,
        prescription_required: editProduct.prescriptionRequired,
        unit: editProduct.unit,
        description: editProduct.description,
        supplier_ids: editProduct.supplierIds || []
      };

      const response = await fetch(`${config.API_BASE_URL}/products/${editProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        toast.success(`Successfully updated ${editProduct.name}`);
        await loadProducts(); // Reload products to get updated data
        setShowEditModal(false);
        setEditProduct({});
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  return (
    <div className="space-y-6 max-w-none w-full">
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
            onClick={() => {
              setProductTypeFilter('all');
              setDrugTypeFilter('all');
            }}
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
            onClick={() => {
              setProductTypeFilter('grocery');
              setDrugTypeFilter('all');
            }}
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
              <div className="text-2xl font-bold text-blue-600">{filteredByType.length}</div>
              <div className="text-sm text-blue-600">
                {drugTypeFilter === 'all' ? 'Drug Products' : 
                 drugTypeFilter === 'generic' ? 'Generic Drugs' : 'Branded Drugs'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">₱{totalValue.toLocaleString()}</div>
              <div className="text-sm text-blue-600">
                {drugTypeFilter === 'all' ? 'Drug Inventory Value' : 
                 drugTypeFilter === 'generic' ? 'Generic Drug Value' : 'Branded Drug Value'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
              <div className="text-sm text-red-600">
                {drugTypeFilter === 'all' ? 'Low Stock Drugs' : 
                 drugTypeFilter === 'generic' ? 'Low Stock Generic' : 'Low Stock Branded'}
              </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
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
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
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

          {/* Drug Type Filter - only show when viewing drugs */}
          {(productTypeFilter === 'all' || productTypeFilter === 'drug') && (
            <select
              value={drugTypeFilter}
              onChange={(e) => setDrugTypeFilter(e.target.value as 'all' | 'generic' | 'branded')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Drug Types</option>
              <option value="generic">Generic</option>
              <option value="branded">Branded</option>
            </select>
          )}

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
      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 text-sm min-w-[1200px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Product Details
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Batch & Manufacturer
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Stock
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Price
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Expiry
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                const isExpiringSoon = new Date(product.expiryDate) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {product.productType === 'drug' ? product.genericName : product.brand}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {product.productType === 'drug' 
                            ? `${product.dosage || 'N/A'} - ${product.form || 'N/A'}` 
                            : `${product.unit || 'N/A'} - ${product.description?.substring(0, 25) || 'No description'}...`
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 truncate max-w-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border truncate">
                          {product.batchNumber}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {product.manufacturer}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.stock} {product.unit || 'units'}
                      </div>
                      <div className="text-xs text-gray-500">Min: {product.minStock}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{product.price}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(product.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col space-y-1 max-w-xs">
                        {isOutOfStock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-900">
                            <XCircle className="h-3 w-3 mr-1" />
                            Out of Stock
                          </span>
                        )}
                        {isLowStock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expiring
                          </span>
                        )}
                        {product.prescriptionRequired && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Rx Required
                          </span>
                        )}
                        {!isOutOfStock && !isLowStock && !isExpiringSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Available
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-blue-50"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleRestock(product)}
                          className="text-green-600 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50 text-xs"
                          title="Restock Product"
                        >
                          Restock
                        </button>
                      </div>
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
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Add New Product</h2>
                <button
                  onClick={handleCloseAddModal}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isAddingProduct}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {showSuccessMessage ? (
                /* Success Message */
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Product Added Successfully!</h3>
                  <p className="text-sm text-gray-600">
                    {newProduct.name} has been added to your inventory.
                  </p>
                </div>
              ) : (
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

                {/* Drug Type Selection - only show for drugs */}
                {newProduct.productType === 'drug' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Drug Type *</label>
                    <select
                      value={newProduct.drugType || 'generic'}
                      onChange={(e) => handleInputChange('drugType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="generic">Generic</option>
                      <option value="branded">Branded</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      {newProduct.drugType === 'generic' 
                        ? 'Generic drugs use the common/scientific name (e.g., Paracetamol)'
                        : 'Branded drugs use the manufacturer\'s brand name (e.g., Tylenol)'}
                    </p>
                  </div>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name *</label>
                    <input
                      type="text"
                      value={newProduct.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter brand name"
                    />
                  </div>

                  {newProduct.productType === 'drug' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {newProduct.drugType === 'generic' ? 'Generic Name *' : 'Brand Name *'}
                      </label>
                      <input
                        type="text"
                        value={newProduct.drugType === 'generic' ? (newProduct.genericName || '') : (newProduct.brand || '')}
                        onChange={(e) => handleInputChange(newProduct.drugType === 'generic' ? 'genericName' : 'brand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={newProduct.drugType === 'generic' ? 'e.g., Paracetamol' : 'e.g., Tylenol'}
                      />
                      {newProduct.drugType === 'branded' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Generic Name *</label>
                          <input
                            type="text"
                            value={newProduct.genericName || ''}
                            onChange={(e) => handleInputChange('genericName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="e.g., Paracetamol"
                          />
                        </div>
                      )}
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Therapeutic Classification</label>
                      <input
                        type="text"
                        value={newProduct.therapeuticClassification || ''}
                        onChange={(e) => handleInputChange('therapeuticClassification', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., Analgesic, Antibiotic, Antihypertensive"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Specify the therapeutic category or pharmacological class of this drug
                      </p>
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

                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suppliers</label>
                  
                  {/* Supplier Search */}
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={supplierSearchTerm}
                        onChange={(e) => setSupplierSearchTerm(e.target.value)}
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {suppliers.length > 0 ? (
                      (() => {
                        const filteredSuppliers = suppliers.filter(supplier => 
                          (supplier.name && supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())) ||
                          (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(supplierSearchTerm.toLowerCase())) ||
                          (supplier.agentName && supplier.agentName.toLowerCase().includes(supplierSearchTerm.toLowerCase()))
                        );
                        
                        if (filteredSuppliers.length > 0) {
                          return filteredSuppliers.map((supplier) => (
                            <label key={supplier.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={newProduct.supplierIds?.includes(supplier.id) || false}
                                onChange={(e) => {
                                  const currentIds = newProduct.supplierIds || [];
                                  if (e.target.checked) {
                                    handleInputChange('supplierIds', [...currentIds, supplier.id]);
                                  } else {
                                    handleInputChange('supplierIds', currentIds.filter(id => id !== supplier.id));
                                  }
                                }}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{supplier.name}</span>
                              {supplier.contactPerson && (
                                <span className="text-xs text-gray-500">({supplier.contactPerson})</span>
                              )}
                            </label>
                          ));
                        } else {
                          return <p className="text-sm text-gray-500 text-center py-2">No suppliers match your search</p>;
                        }
                      })()
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No suppliers available</p>
                    )}
                  </div>
                  
                  {/* Selected suppliers count */}
                  {newProduct.supplierIds && newProduct.supplierIds.length > 0 && (
                    <p className="mt-2 text-sm text-primary-600">
                      {newProduct.supplierIds.length} supplier{newProduct.supplierIds.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                  
                  <p className="mt-1 text-sm text-gray-500">
                    Select one or more suppliers for this product. The first selected supplier will be marked as primary.
                  </p>
                </div>

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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newProduct.barcode || ''}
                        onChange={(e) => handleInputChange('barcode', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter barcode or scan"
                      />
                      <button
                        type="button"
                        onClick={startBarcodeScanning}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                        title="Scan Barcode"
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Scan
                      </button>
                      <button
                        type="button"
                        onClick={handleManualBarcodeEntry}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
                        title="Enter Manually"
                      >
                        <Scan className="h-4 w-4" />
                      </button>
                    </div>
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
                      onClick={handleCloseAddModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={isAddingProduct}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProduct}
                      disabled={isAddingProduct}
                      className={`px-4 py-2 rounded-lg flex items-center ${
                        isAddingProduct
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {isAddingProduct ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Product...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Add Product
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Restock Product</h2>
                <button
                  onClick={() => setShowRestockModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Product</p>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedProduct.productType === 'drug' ? selectedProduct.genericName : selectedProduct.brand}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Current Stock</p>
                  <p className="font-medium">{selectedProduct.stock} {selectedProduct.unit || 'units'}</p>
                  <p className="text-sm text-gray-500">Min Stock: {selectedProduct.minStock}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restock Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restockQuantity || ''}
                    onChange={(e) => setRestockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter quantity to add"
                  />
                </div>

                {restockQuantity > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      New stock level will be: <strong>{selectedProduct.stock + restockQuantity} {selectedProduct.unit || 'units'}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestockSubmit}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Restock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editProduct && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Edit Product</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditSupplierSearchTerm('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Product</p>
                  <p className="font-medium">{editProduct.name}</p>
                  <p className="text-sm text-gray-500">
                    {editProduct.productType === 'drug' ? editProduct.genericName : editProduct.brand}
                  </p>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={editProduct.name || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, name: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <input
                      type="text"
                      value={editProduct.category || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, category: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter category"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer *</label>
                    <input
                      type="text"
                      value={editProduct.manufacturer || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, manufacturer: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter manufacturer"
                    />
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProduct.price || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProduct.cost || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, cost: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Inventory Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock *</label>
                    <input
                      type="number"
                      value={editProduct.minStock || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, minStock: parseInt(e.target.value) || 0}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                    <input
                      type="date"
                      value={editProduct.expiryDate || ''}
                      onChange={(e) => setEditProduct(prev => ({...prev, expiryDate: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Product Type Specific Fields */}
                {editProduct.productType === 'drug' ? (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dosage *</label>
                      <input
                        type="text"
                        value={editProduct.dosage || ''}
                        onChange={(e) => setEditProduct(prev => ({...prev, dosage: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., 500mg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Form *</label>
                      <select
                        value={editProduct.form || ''}
                        onChange={(e) => setEditProduct(prev => ({...prev, form: e.target.value}))}
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
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editProduct.prescriptionRequired || false}
                          onChange={(e) => setEditProduct(prev => ({...prev, prescriptionRequired: e.target.checked}))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Prescription Required</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                      <select
                        value={editProduct.unit || ''}
                        onChange={(e) => setEditProduct(prev => ({...prev, unit: e.target.value}))}
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
                        value={editProduct.description || ''}
                        onChange={(e) => setEditProduct(prev => ({...prev, description: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter product description"
                      />
                    </div>
                  </div>
                )}

                {/* Supplier Selection */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suppliers</label>
                  
                  {/* Supplier Search */}
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={editSupplierSearchTerm}
                        onChange={(e) => setEditSupplierSearchTerm(e.target.value)}
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {suppliers.length > 0 ? (
                      (() => {
                        const filteredSuppliers = suppliers.filter(supplier => 
                          (supplier.name && supplier.name.toLowerCase().includes(editSupplierSearchTerm.toLowerCase())) ||
                          (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(editSupplierSearchTerm.toLowerCase())) ||
                          (supplier.agentName && supplier.agentName.toLowerCase().includes(editSupplierSearchTerm.toLowerCase()))
                        );
                        
                        if (filteredSuppliers.length > 0) {
                          return filteredSuppliers.map((supplier) => (
                            <label key={supplier.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={editProduct.supplierIds?.includes(supplier.id) || false}
                                onChange={(e) => {
                                  const currentIds = editProduct.supplierIds || [];
                                  if (e.target.checked) {
                                    setEditProduct(prev => ({
                                      ...prev,
                                      supplierIds: [...currentIds, supplier.id]
                                    }));
                                  } else {
                                    setEditProduct(prev => ({
                                      ...prev,
                                      supplierIds: currentIds.filter(id => id !== supplier.id)
                                    }));
                                  }
                                }}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{supplier.name}</span>
                              {supplier.contactPerson && (
                                <span className="text-xs text-gray-500">({supplier.contactPerson})</span>
                              )}
                            </label>
                          ));
                        } else {
                          return <p className="text-sm text-gray-500 text-center py-2">No suppliers match your search</p>;
                        }
                      })()
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No suppliers available</p>
                    )}
                  </div>
                  
                  {/* Selected suppliers count */}
                  {editProduct.supplierIds && editProduct.supplierIds.length > 0 && (
                    <p className="mt-2 text-sm text-primary-600">
                      {editProduct.supplierIds.length} supplier{editProduct.supplierIds.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                  
                  <p className="mt-1 text-sm text-gray-500">
                    Select one or more suppliers for this product. The first selected supplier will be marked as primary.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditSupplierSearchTerm('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Scan Barcode</h2>
                <button
                  onClick={stopBarcodeScanning}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <video
                    id="barcode-video"
                    className="w-full h-64 bg-black rounded-lg object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-red-500 border-dashed w-48 h-24 rounded-lg opacity-75"></div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Position the barcode within the red frame
                  </p>
                  
                  {isScanning && (
                    <div className="flex items-center justify-center text-blue-600">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning for barcode...
                    </div>
                  )}
                </div>

                <div className="flex justify-center space-x-3">
                  <button
                    onClick={stopBarcodeScanning}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // For demo purposes, simulate a barcode detection
                      const demoBarcode = '1234567890123';
                      handleBarcodeDetected(demoBarcode);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Simulate Scan
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