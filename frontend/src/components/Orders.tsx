import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { config } from '../config';
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  User, 
  CreditCard, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  Truck,
  MapPin,
  Eye,
  Calendar,
  Scan,
  Globe,
  Bell,
  X,
  Banknote,
  Smartphone,
  Shield,
  Percent,
  UserCheck,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  Save,
  Upload,
  Camera,
  Image,
  ScanLine
} from 'lucide-react';
import { Product, Customer, Service } from '../types';
import { apiService } from '../services/api';
import { ServiceService } from '../services/serviceService';
import QRScanner from './QRScanner';
import { useNotifications } from '../contexts/NotificationContext';
import FastOrderWorkflow from './FastOrderWorkflow';

interface CartItem {
  type: 'product' | 'service';
  product?: Product;
  service?: Service;
  quantity: number;
  instructions?: string;
  // Service-specific fields
  scheduledDate?: Date;
  serviceNotes?: string;
}

interface OrderFormData {
  customerInfo: {
    type: 'existing' | 'new' | 'guest';
    existingCustomerId?: string;
    newCustomer?: {
      name: string;
      email: string;
      phone: string;
      address: string;
      // Discount eligibility for new/guest customers
      isSeniorCitizen?: boolean;
      isPWD?: boolean;
      seniorCitizenID?: string;
      pwdId?: string;
    };
  };
  items: CartItem[];
  paymentMethod: 'cash' | 'card' | 'insurance' | 'gcash';
  prescriptionNumber?: string;
  prescriptionImages?: File[];
  notes?: string;
  orderType: 'pickup' | 'delivery';
  deliveryAddress?: string;
}

const Orders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fast-order' | 'new-order' | 'order-history' | 'online-orders'>('fast-order');
  const { notifications: onlineOrders, updateOrderStatus, addDemoOrder, clearAllOrders } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderData, setOrderData] = useState<OrderFormData>({
    customerInfo: { type: 'existing' },
    items: [],
    paymentMethod: 'cash',
    orderType: 'pickup'
  });
  const [currentStep, setCurrentStep] = useState<'products' | 'customer' | 'payment' | 'review'>('products');
  const [showPrescriptionAlert, setShowPrescriptionAlert] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showServices, setShowServices] = useState(false);
  
  // USB barcode scanner state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCustomerQRScanner, setShowCustomerQRScanner] = useState(false);
  const [prescriptionProducts, setPrescriptionProducts] = useState<Product[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [prescriptionVerificationStep, setPrescriptionVerificationStep] = useState<'waiting' | 'processing' | 'scanning' | 'searching' | 'verified'>('waiting');
  const [isListeningForBarcode, setIsListeningForBarcode] = useState(false);
  const [showPrescriptionSummary, setShowPrescriptionSummary] = useState(false);
  
  // ID Upload state for new/guest customers
  const [selectedIDFile, setSelectedIDFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Prescription image upload state
  const [prescriptionImages, setPrescriptionImages] = useState<File[]>([]);
  const [showPrescriptionCamera, setShowPrescriptionCamera] = useState(false);
  const [prescriptionCameraStream, setPrescriptionCameraStream] = useState<MediaStream | null>(null);
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prescriptionVideoRef = useRef<HTMLVideoElement>(null);
  const prescriptionCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Discount state
  const [discountApproval, setDiscountApproval] = useState<{
    isEligible: boolean;
    discountType: 'senior_citizen' | 'pwd' | null;
    discountPercent: number;
    discountAmount: number;
    isApproved: boolean;
    customerName: string;
  }>({
    isEligible: false,
    discountType: null,
    discountPercent: 0,
    discountAmount: 0,
    isApproved: false,
    customerName: ''
  });

  // Load cart, products, and customers from API on component mount
  useEffect(() => {
    loadCart();
    loadProducts();
    loadCustomers();
  }, []);

  // USB Barcode Scanner Integration
  useEffect(() => {
    if (activeTab === 'new-order' && currentStep === 'products') {
      setIsListeningForBarcode(true);
    } else {
      setIsListeningForBarcode(false);
      setBarcodeInput('');
    }
  }, [activeTab, currentStep]);

  // Handle USB barcode scanner input
  useEffect(() => {
    if (!isListeningForBarcode) return;

    let barcodeBuffer = '';
    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore input if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Handle Enter key (barcode scanners typically send Enter after the barcode)
      if (event.key === 'Enter') {
        if (barcodeBuffer.length > 3) { // Minimum barcode length
          processBarcodeInput(barcodeBuffer);
          barcodeBuffer = '';
        }
        return;
      }

      // Accumulate characters
      if (event.key.length === 1) { // Only single characters
        barcodeBuffer += event.key;
        setBarcodeInput(barcodeBuffer);
        
        // Clear buffer after timeout (in case Enter is missed)
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (barcodeBuffer.length > 3) {
            processBarcodeInput(barcodeBuffer);
          }
          barcodeBuffer = '';
          setBarcodeInput('');
        }, 100); // 100ms timeout
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [isListeningForBarcode, products, customers]);

  const processBarcodeInput = async (barcode: string) => {
    try {
      setBarcodeInput('');
      
      // Search for product by barcode
      const product = products.find(p => 
        p.barcode === barcode || 
        p.id === barcode ||
        p.name.toLowerCase().includes(barcode.toLowerCase())
      );

      if (product) {
        handleProductScanned(product);
      } else {
        // Try API call for barcode lookup
        try {
          const response = await fetch(`${config.API_BASE_URL}/products/barcode/${barcode}`);
          if (response.ok) {
            const foundProduct = await response.json();
            handleProductScanned(foundProduct);
          } else {
            toast.error(`Product not found for barcode: ${barcode}`);
          }
        } catch (error) {
          toast.error(`Product not found for barcode: ${barcode}`);
        }
      }
    } catch (error) {
      console.error('Barcode processing error:', error);
      toast.error('Error processing barcode');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/products/browse`);
      if (response.ok) {
        const productsData = await response.json();
        // The API returns {products: [...], total: N} format
        setProducts(productsData.products || productsData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/customers`);
      if (response.ok) {
        const customersData = await response.json();
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const loadCart = async () => {
    try {
      const cartData = await apiService.getCart();
      // The new backend returns items with product data included
      if (cartData && (cartData as any).items) {
        const transformedCart = (cartData as any).items.map((item: any) => ({
          product: item.product || item.Product, // Handle both formats
          quantity: item.quantity,
          instructions: item.instructions || ''
        }));
        setCart(transformedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      // Fallback to localStorage if API fails
      const savedCart = localStorage.getItem('demo_cart');
      if (savedCart) {
        const cartData = JSON.parse(savedCart);
        setCart(cartData);
      }
    }
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.stock > 0;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category)));

  const addToCart = async (product: Product) => {
    try {
      const existingItem = cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          // Update existing item
          try {
            await apiService.addToCart({
              product_id: product.id,
              quantity: 1,
              unit_price: product.price
            });
          } catch (apiError) {
            console.warn('API call failed, using local state only');
          }
          
          const updatedCart = cart.map(item => 
            item.product.id === product.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
          setCart(updatedCart);
          localStorage.setItem('demo_cart', JSON.stringify(updatedCart));
          toast.success(`Added another ${product.name} to cart`);
        } else {
          toast.error(`Cannot add more. Only ${product.stock} units available.`);
          return;
        }
      } else {
        // Add new item
        try {
          await apiService.addToCart({
            product_id: product.id,
            quantity: 1,
            unit_price: product.price
          });
        } catch (apiError) {
          console.warn('API call failed, using local state only');
        }
        
        const updatedCart = [...cart, { product, quantity: 1 }];
        setCart(updatedCart);
        localStorage.setItem('demo_cart', JSON.stringify(updatedCart));
        toast.success(`${product.name} added to cart`);
      }

      // Check if any prescription required items are in cart
      const updatedCart = existingItem 
        ? cart.map(item => 
            item.product.id === product.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...cart, { product, quantity: 1 }];
      
      const prescriptionRequired = updatedCart.some(item => item.product.prescriptionRequired);
      setShowPrescriptionAlert(prescriptionRequired);
    } catch (error) {
      toast.error('Failed to add item to cart');
      console.error('Error adding to cart:', error);
    }
  };

  const handleProductScanned = (product: Product) => {
    // Always add to cart first for speed
    addToCart(product);
    toast.success(`${product.name} added to cart via barcode scanner`);
  };

  // Process prescription requirements for cart
  const processPrescriptionRequirements = () => {
    const rxProducts = cart.filter(item => item.product.prescriptionRequired);
    
    if (rxProducts.length === 0) {
      // No prescription products, proceed normally
      setCurrentStep('customer');
      return;
    }

    // Found prescription products, show summary and require customer verification
    setPrescriptionProducts(rxProducts.map(item => item.product));
    setPrescriptionVerificationStep('processing');
    setShowPrescriptionSummary(true);
    
    toast(`Found ${rxProducts.length} prescription product(s). Customer verification required.`, {
      icon: '⚠️',
      duration: 4000,
    });
  };

  const handleCustomerScanned = (customer: Customer) => {
    // Set customer for the order
    setOrderData(prev => ({
      ...prev,
      customerInfo: {
        type: 'existing',
        existingCustomerId: customer.id
      }
    }));
    
    setPrescriptionVerificationStep('verified');
    setShowCustomerQRScanner(false);
    setShowPrescriptionSummary(false);
    toast.success(`Customer ${customer.name} verified for prescription products.`);
    
    // Proceed to customer step
    setCurrentStep('customer');
  };

  const handleCustomerNotFound = () => {
    setPrescriptionVerificationStep('searching');
    setShowCustomerQRScanner(false);
    setShowCustomerSearch(true);
  };

  const selectCustomerFromSearch = (customer: Customer) => {
    setOrderData(prev => ({
      ...prev,
      customerInfo: {
        type: 'existing',
        existingCustomerId: customer.id
      }
    }));
    
    setPrescriptionVerificationStep('verified');
    setShowCustomerSearch(false);
    setShowPrescriptionSummary(false);
    setCustomerSearchTerm('');
    toast.success(`Customer ${customer.name} selected for prescription verification.`);
    
    // Proceed to customer step
    setCurrentStep('customer');
  };

  const addNewCustomerForPrescription = () => {
    setShowCustomerSearch(false);
    setShowPrescriptionSummary(false);
    setCustomerSearchTerm('');
    
    // Switch to customer step to add new customer
    setOrderData(prev => ({
      ...prev,
      customerInfo: { type: 'new' }
    }));
    
    setPrescriptionVerificationStep('verified');
    setCurrentStep('customer');
    toast('Please fill in customer information for prescription verification.', {
      icon: 'ℹ️',
      duration: 4000,
    });
  };

  const cancelPrescriptionVerification = () => {
    setPrescriptionProducts([]);
    setPrescriptionVerificationStep('waiting');
    setShowCustomerQRScanner(false);
    setShowCustomerSearch(false);
    setShowPrescriptionSummary(false);
    setCustomerSearchTerm('');
    toast('Prescription verification cancelled.', {
      icon: 'ℹ️',
    });
  };

  const handleOrderScanned = (order: any) => {
    toast.success(`Order ${order.order_number} found`);
    // Add the order to the orders list if it's not already there
    setOrders(prevOrders => {
      const exists = prevOrders.some(o => o.id === order.id);
      if (!exists) {
        return [...prevOrders, order];
      }
      return prevOrders;
    });
    setShowQRScanner(false);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    let updatedCart;
    if (newQuantity === 0) {
      updatedCart = cart.filter(item => item.product.id !== productId);
      setCart(updatedCart);
      toast.success('Item removed from cart');
    } else {
      const product = cart.find(item => item.product.id === productId)?.product;
      if (product && newQuantity <= product.stock) {
        updatedCart = cart.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: newQuantity }
            : item
        );
        setCart(updatedCart);
      } else {
        toast.error(`Only ${product?.stock} units available`);
        return;
      }
    }
    // Save to localStorage
    localStorage.setItem('demo_cart', JSON.stringify(updatedCart));
  };

  const updateInstructions = (productId: string, instructions: string) => {
    const updatedCart = cart.map(item => 
      item.product.id === productId 
        ? { ...item, instructions }
        : item
    );
    setCart(updatedCart);
    // Save to localStorage
    localStorage.setItem('demo_cart', JSON.stringify(updatedCart));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    return discountApproval.isApproved ? subtotal - discountApproval.discountAmount : subtotal;
  };

  const calculateSubtotal = useCallback(() => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [cart]);

  // Check discount eligibility when customer is selected
  const checkDiscountEligibility = useCallback((customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      setDiscountApproval({
        isEligible: false,
        discountType: null,
        discountPercent: 0,
        discountAmount: 0,
        isApproved: false,
        customerName: ''
      });
      return;
    }

    const subtotal = calculateSubtotal();
    let discountType: 'senior_citizen' | 'pwd' | null = null;
    let discountPercent = 0;

    // Senior Citizen takes priority over PWD if both are applicable
    if (customer.isSeniorCitizen) {
      discountType = 'senior_citizen';
      discountPercent = 20; // 20% discount
    } else if (customer.isPWD) {
      discountType = 'pwd';
      discountPercent = 20; // 20% discount
    }

    if (discountType && discountPercent > 0) {
      const discountAmount = subtotal * (discountPercent / 100);
      const discountDisplayName = discountType === 'senior_citizen' ? 'Senior Citizen' : 'PWD';
      
      setDiscountApproval({
        isEligible: true,
        discountType,
        discountPercent,
        discountAmount,
        isApproved: false, // Requires approval
        customerName: customer.name
      });
      toast(`${customer.name} is eligible for ${discountPercent}% ${discountDisplayName} discount`, {
        icon: '💰',
        duration: 4000,
      });
    } else {
      setDiscountApproval({
        isEligible: false,
        discountType: null,
        discountPercent: 0,
        discountAmount: 0,
        isApproved: false,
        customerName: customer.name
      });
    }
  }, [customers, calculateSubtotal]);

  // Check discount eligibility for new/guest customers
  const checkNewCustomerDiscountEligibility = useCallback(() => {
    const newCustomer = orderData.customerInfo.newCustomer;
    if (!newCustomer || cart.length === 0) {
      setDiscountApproval({
        isEligible: false,
        discountType: null,
        discountPercent: 0,
        discountAmount: 0,
        isApproved: false,
        customerName: ''
      });
      return;
    }

    const subtotal = calculateSubtotal();
    let discountType: 'senior_citizen' | 'pwd' | null = null;
    let discountPercent = 0;

    // Senior Citizen takes priority over PWD if both are applicable
    if (newCustomer.isSeniorCitizen) {
      discountType = 'senior_citizen';
      discountPercent = 20; // 20% discount
    } else if (newCustomer.isPWD) {
      discountType = 'pwd';
      discountPercent = 20; // 20% discount
    }

    if (discountType && discountPercent > 0) {
      const discountAmount = subtotal * (discountPercent / 100);
      const discountDisplayName = discountType === 'senior_citizen' ? 'Senior Citizen' : 'PWD';
      
      setDiscountApproval({
        isEligible: true,
        discountType,
        discountPercent,
        discountAmount,
        isApproved: false, // Requires approval
        customerName: newCustomer.name
      });
      toast(`${newCustomer.name} is eligible for ${discountPercent}% ${discountDisplayName} discount`, {
        icon: '💰',
        duration: 4000,
      });
    } else {
      setDiscountApproval({
        isEligible: false,
        discountType: null,
        discountPercent: 0,
        discountAmount: 0,
        isApproved: false,
        customerName: newCustomer.name || ''
      });
    }
  }, [orderData.customerInfo.newCustomer, cart, calculateSubtotal]);

  // Check discount eligibility when customer or cart changes
  useEffect(() => {
    if (orderData.customerInfo.type === 'existing' && orderData.customerInfo.existingCustomerId && cart.length > 0) {
      checkDiscountEligibility(orderData.customerInfo.existingCustomerId);
    } else if ((orderData.customerInfo.type === 'new' || orderData.customerInfo.type === 'guest') && cart.length > 0) {
      checkNewCustomerDiscountEligibility();
    } else {
      // Reset discount if no eligible customer or empty cart
      setDiscountApproval({
        isEligible: false,
        discountType: null,
        discountPercent: 0,
        discountAmount: 0,
        isApproved: false,
        customerName: ''
      });
    }
  }, [orderData.customerInfo.type, orderData.customerInfo.existingCustomerId, orderData.customerInfo.newCustomer, cart, customers, checkDiscountEligibility, checkNewCustomerDiscountEligibility]);

  const approveDiscount = () => {
    setDiscountApproval(prev => ({ ...prev, isApproved: true }));
    toast.success(`${discountApproval.discountPercent}% discount approved for ${discountApproval.customerName}`);
  };

  const rejectDiscount = () => {
    setDiscountApproval(prev => ({ 
      ...prev, 
      isApproved: false,
      discountAmount: 0 
    }));
    toast('Discount not applied to this order', {
      icon: 'ℹ️',
    });
  };

  // Camera functions for ID capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Set video stream after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      toast.error('Unable to access camera. Please use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `id-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedIDFile(file);
            toast.success('ID photo captured successfully!');
          }
        }, 'image/jpeg', 0.8);
      }
    }
    stopCamera();
  };

  // Prescription camera functions
  const startPrescriptionCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        } 
      });
      setPrescriptionCameraStream(stream);
      setShowPrescriptionCamera(true);
      
      // Set video stream after state update
      setTimeout(() => {
        if (prescriptionVideoRef.current) {
          prescriptionVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      toast.error('Unable to access camera. Please use file upload instead.');
    }
  };

  const stopPrescriptionCamera = () => {
    if (prescriptionCameraStream) {
      prescriptionCameraStream.getTracks().forEach(track => track.stop());
      setPrescriptionCameraStream(null);
    }
    setShowPrescriptionCamera(false);
  };

  const capturePrescriptionPhoto = () => {
    if (prescriptionVideoRef.current && prescriptionCanvasRef.current) {
      const canvas = prescriptionCanvasRef.current;
      const video = prescriptionVideoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `prescription-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPrescriptionImages(prev => [...prev, file]);
            toast.success('Prescription photo captured successfully!');
          }
        }, 'image/jpeg', 0.8);
      }
    }
    stopPrescriptionCamera();
  };

  const removePrescriptionImage = (index: number) => {
    setPrescriptionImages(prev => prev.filter((_, i) => i !== index));
  };

  const processPayment = async (paymentMethod: string, amount: number) => {
    // Simulate payment processing
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        switch (paymentMethod) {
          case 'cash':
            toast.success('Cash payment confirmed - please prepare exact amount');
            resolve({ status: 'pending', message: 'Cash payment will be collected on delivery/pickup' });
            break;
          case 'card':
            // Simulate card processing
            if (Math.random() > 0.1) { // 90% success rate
              toast.success('Card payment processed successfully');
              resolve({ status: 'paid', message: 'Card payment completed' });
            } else {
              toast.error('Card payment failed - please try again');
              reject({ status: 'failed', message: 'Card payment declined' });
            }
            break;
          case 'gcash':
            // Simulate GCash processing
            if (Math.random() > 0.05) { // 95% success rate
              toast.success('GCash payment processed successfully');
              resolve({ status: 'paid', message: 'GCash payment completed' });
            } else {
              toast.error('GCash payment failed - please check your account');
              reject({ status: 'failed', message: 'GCash payment failed' });
            }
            break;
          case 'insurance':
            toast.success('Insurance claim submitted for review');
            resolve({ status: 'pending', message: 'Insurance claim under review' });
            break;
          default:
            reject({ status: 'failed', message: 'Invalid payment method' });
        }
      }, 1500); // Simulate processing time
    });
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart before submitting order');
      return;
    }

    const prescriptionRequired = cart.some(item => item.product.prescriptionRequired);
    if (prescriptionRequired && !orderData.prescriptionNumber && prescriptionImages.length === 0) {
      toast.error('Prescription number or prescription image is required for prescription medications');
      return;
    }

    // Validate customer information based on type
    if (orderData.customerInfo.type === 'new') {
      const newCustomer = orderData.customerInfo.newCustomer;
      if (!newCustomer?.name || !newCustomer?.email || !newCustomer?.phone) {
        toast.error('Please fill in all required customer fields (Name, Email, Phone)');
        return;
      }
    } else if (orderData.customerInfo.type === 'guest') {
      const newCustomer = orderData.customerInfo.newCustomer;
      if (!newCustomer?.name) {
        toast.error('Please provide customer name');
        return;
      }
      if (!newCustomer?.isSeniorCitizen && !newCustomer?.isPWD) {
        toast.error('Guest customers must have Senior Citizen or PWD eligibility');
        return;
      }
      if (newCustomer?.isSeniorCitizen && !newCustomer?.seniorCitizenID) {
        toast.error('Please provide Senior Citizen ID number');
        return;
      }
      if (newCustomer?.isPWD && !newCustomer?.pwdId) {
        toast.error('Please provide PWD ID number');
        return;
      }
    }

    setLoading(true);
    try {
      // Create new customer if needed
      let customerId = orderData.customerInfo.existingCustomerId;
      if ((orderData.customerInfo.type === 'new' || orderData.customerInfo.type === 'guest') && orderData.customerInfo.newCustomer) {
        const newCustomer = orderData.customerInfo.newCustomer;
        const customerToAdd: Customer = {
          id: `${customers.length + 1}`,
          name: newCustomer.name,
          email: orderData.customerInfo.type === 'new' ? newCustomer.email : `guest-${Date.now()}@pharmacy.local`,
          phone: orderData.customerInfo.type === 'new' ? newCustomer.phone : 'N/A',
          dateOfBirth: '1900-01-01', // Default for guest customers
          medicalHistory: [],
          allergies: [],
          currentMedications: [],
          createdAt: new Date().toISOString(),
          qrCode: `CUST${String(customers.length + 1).padStart(3, '0')}`,
          // Discount fields
          isSeniorCitizen: newCustomer.isSeniorCitizen,
          isPWD: newCustomer.isPWD,
          seniorCitizenID: newCustomer.seniorCitizenID,
          pwdId: newCustomer.pwdId,
          idDocumentPath: selectedIDFile ? `uploads/${selectedIDFile.name}` : undefined
        };

        // Save customer to database via API
        try {
          const response = await fetch(`${config.API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerToAdd)
          });

          if (response.ok) {
            const savedCustomer = await response.json();
            setCustomers(prev => [...prev, savedCustomer]);
            customerId = savedCustomer.id;
            toast.success(`${orderData.customerInfo.type === 'new' ? 'Customer' : 'Guest customer'} ${savedCustomer.name} added successfully!`);
          } else {
            // Fallback to local state if API fails
            setCustomers(prev => [...prev, customerToAdd]);
            customerId = customerToAdd.id;
            toast.success(`${orderData.customerInfo.type === 'new' ? 'Customer' : 'Guest customer'} ${customerToAdd.name} added locally!`);
          }
        } catch (error) {
          // Fallback to local state if API fails
          console.error('Error saving customer to database:', error);
          setCustomers(prev => [...prev, customerToAdd]);
          customerId = customerToAdd.id;
          toast.success(`${orderData.customerInfo.type === 'new' ? 'Customer' : 'Guest customer'} ${customerToAdd.name} added locally!`);
        }
      }

      // Process payment
      const total = calculateTotal();
      const paymentResult = await processPayment(orderData.paymentMethod, total);
      
      // Prepare order data for API
      const orderPayload = {
        customer_info: customerId ? { type: 'existing', existingCustomerId: customerId } : orderData.customerInfo,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          instructions: item.instructions
        })),
        payment_method: orderData.paymentMethod,
        order_type: orderData.orderType,
        delivery_address: orderData.deliveryAddress,
        prescription_number: orderData.prescriptionNumber,
        prescription_images: prescriptionImages.map(file => file.name), // Store file names for now
        notes: orderData.notes,
        subtotal: calculateSubtotal(),
        discount: discountApproval.isApproved ? discountApproval.discountAmount : 0,
        discount_type: discountApproval.isApproved ? discountApproval.discountType : null,
        discount_percent: discountApproval.isApproved ? discountApproval.discountPercent : 0,
        total: total,
        payment_status: (paymentResult as any).status
      };

      try {
        const response = await apiService.createOrder(orderPayload);
        toast.success(`Order ${(response as any).order_number || 'created'} submitted successfully!`);
      } catch (apiError) {
        console.warn('API call failed, creating order locally');
        const orderNumber = `ORD-${Date.now()}`;
        toast.success(`Order ${orderNumber} submitted successfully!`);
      }
      
      // Reset form
      setCart([]);
      localStorage.removeItem('demo_cart'); // Clear cart from localStorage
      setOrderData({
        customerInfo: { type: 'existing' },
        items: [],
        paymentMethod: 'cash',
        orderType: 'pickup'
      });
      setDiscountApproval({
        isEligible: false,
        discountType: null,
        discountPercent: 0,
        discountAmount: 0,
        isApproved: false,
        customerName: ''
      });
      // Reset ID upload states
      setSelectedIDFile(null);
      stopCamera();
      // Reset prescription image states
      setPrescriptionImages([]);
      stopPrescriptionCamera();
      setCurrentStep('products');
      setActiveTab('order-history');
    } catch (error) {
      toast.error('Failed to submit order');
      console.error('Error submitting order:', error);
    } finally {
      setLoading(false);
    }
  };

  const OnlineOrdersTab = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Globe className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Online Orders</h2>
          {onlineOrders.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {onlineOrders.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={addDemoOrder}
            className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Demo Order
          </button>
          <button
            onClick={clearAllOrders}
            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center text-sm"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </button>
          <button
            onClick={() => setActiveTab('new-order')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </button>
        </div>
      </div>

      {onlineOrders.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No online orders yet</p>
          <p className="text-sm text-gray-400 mt-2">Online orders from customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {onlineOrders.map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{order.orderNumber}</span>
                  </div>
                  {order.priority === 'urgent' && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      URGENT
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'ready' ? 'bg-green-100 text-green-800' :
                    order.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                  <span className="text-lg font-semibold text-green-600">₱{order.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{order.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(order.orderDate).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {order.orderType === 'delivery' ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  <span className="capitalize">{order.orderType}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="capitalize">{order.paymentMethod}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Items:</span> {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                  </div>
                  <div className="flex items-center space-x-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Accept
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 transition-colors"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const OrderHistoryTab = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Order History</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowQRScanner(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scan Order QR
          </button>
          <button
            onClick={() => setActiveTab('new-order')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No orders yet</p>
          <button
            onClick={() => setActiveTab('new-order')}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Your First Order
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <span className="font-medium">Order #{order.order_number}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold">₱{order.total}</span>
                  <button className="text-blue-500 hover:text-blue-700">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center space-x-4">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  {order.order_type === 'delivery' ? (
                    <Truck className="w-4 h-4 mr-1" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-1" />
                  )}
                  {order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const FastOrderTab = () => (
    <FastOrderWorkflow />
  );

  const NewOrderTab = () => (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        {[
          { step: 'products', label: 'Products', icon: Package },
          { step: 'customer', label: 'Customer', icon: User },
          { step: 'payment', label: 'Payment', icon: CreditCard },
          { step: 'review', label: 'Review', icon: FileText }
        ].map((item, index) => {
          const Icon = item.icon;
          const isActive = currentStep === item.step;
          const isCompleted = ['products', 'customer', 'payment', 'review'].indexOf(currentStep) > 
                            ['products', 'customer', 'payment', 'review'].indexOf(item.step);
          
          return (
            <div key={item.step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : isCompleted 
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm ${
                isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
              {index < 3 && <div className="w-8 h-px bg-gray-300 mx-4" />}
            </div>
          );
        })}
      </div>

      {/* Product Selection */}
      {currentStep === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Products</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isListeningForBarcode ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-gray-700">USB Barcode Scanner</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${isListeningForBarcode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {isListeningForBarcode ? 'Ready' : 'Inactive'}
                  </span>
                </div>
                <ScanLine className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            
            {/* Scanner Status */}
            {isListeningForBarcode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-800 font-medium">USB Scanner Active - Scan any product barcode</span>
                  </div>
                  {barcodeInput && (
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Reading: {barcodeInput}
                    </div>
                  )}
                </div>
                {cart.some(item => item.product.prescriptionRequired) && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <span className="text-sm text-orange-800">
                      ⚠️ {cart.filter(item => item.product.prescriptionRequired).length} prescription product(s) in cart - Customer verification will be required
                    </span>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  💡 Tip: Use your USB barcode scanner to quickly add products to cart
                </div>
              </div>
            )}
            
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <button
                onClick={() => setShowQRScanner(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Scan className="w-4 h-4" />
                <span>QR Scanner</span>
              </button>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-500">{product.genericName}</p>
                      <p className="text-sm text-gray-500">{product.dosage} • {product.form}</p>
                    </div>
                    <span className="text-lg font-semibold text-green-600">₱{product.price}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>Stock: {product.stock}</span>
                    <span>{product.category}</span>
                  </div>
                  
                  {product.prescriptionRequired && (
                    <div className="flex items-center text-orange-600 text-sm mb-2">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Prescription Required
                    </div>
                  )}
                  
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shopping Cart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart ({cart.length} items)
              </h3>
              <span className="text-xl font-bold text-green-600">₱{calculateTotal().toFixed(2)}</span>
            </div>

            {showPrescriptionAlert && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center text-orange-800">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Prescription Required</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Some items in your cart require a prescription. Please provide prescription details in the next step.
                </p>
              </div>
            )}

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Your cart is empty</p>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-gray-500">{item.product.dosage} • ₱{item.product.price}</p>
                      {item.product.prescriptionRequired && (
                        <textarea
                          placeholder="Special instructions..."
                          value={item.instructions || ''}
                          onChange={(e) => updateInstructions(item.product.id, e.target.value)}
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded text-sm"
                          rows={2}
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="font-medium">₱{(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                {/* Discount Notification */}
                {discountApproval.isEligible && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Percent className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-800">
                          {discountApproval.customerName} is eligible for {discountApproval.discountPercent}% 
                          {discountApproval.discountType === 'senior_citizen' ? ' Senior Citizen' : ' PWD'} discount
                        </span>
                      </div>
                      {!discountApproval.isApproved && (
                        <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
                          Pending Approval
                        </span>
                      )}
                      {discountApproval.isApproved && (
                        <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      Discount amount: ₱{discountApproval.discountAmount.toFixed(2)} 
                      • Final approval required during checkout
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm">₱{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {discountApproval.isApproved && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-sm">
                        {discountApproval.discountType === 'senior_citizen' ? 'Senior Citizen' : 'PWD'} Discount ({discountApproval.discountPercent}%):
                      </span>
                      <span className="text-sm">-₱{discountApproval.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-semibold">₱{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={processPrescriptionRequirements}
                    className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Continue to Customer Info
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Info Step */}
      {currentStep === 'customer' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
              <div className="flex space-x-4">
                {['existing', 'new', 'guest'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="customerType"
                      value={type}
                      checked={orderData.customerInfo.type === type}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        customerInfo: { type: e.target.value as 'existing' | 'new' | 'guest' }
                      })}
                      className="mr-2"
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)} Customer
                  </label>
                ))}
              </div>
            </div>

            {orderData.customerInfo.type === 'existing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
                <select
                  value={orderData.customerInfo.existingCustomerId || ''}
                  onChange={(e) => setOrderData({
                    ...orderData,
                    customerInfo: { ...orderData.customerInfo, existingCustomerId: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                      {customer.isSeniorCitizen ? ' (Senior Citizen)' : ''}
                      {customer.isPWD ? ' (PWD)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(orderData.customerInfo.type === 'new' || orderData.customerInfo.type === 'guest') && (
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={orderData.customerInfo.newCustomer?.name || ''}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        customerInfo: {
                          ...orderData.customerInfo,
                          newCustomer: { ...orderData.customerInfo.newCustomer!, name: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  {/* Full customer fields */}
                  {orderData.customerInfo.type === 'new' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          value={orderData.customerInfo.newCustomer?.email || ''}
                          onChange={(e) => setOrderData({
                            ...orderData,
                            customerInfo: {
                              ...orderData.customerInfo,
                              newCustomer: { ...orderData.customerInfo.newCustomer!, email: e.target.value }
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                        <input
                          type="tel"
                          value={orderData.customerInfo.newCustomer?.phone || ''}
                          onChange={(e) => setOrderData({
                            ...orderData,
                            customerInfo: {
                              ...orderData.customerInfo,
                              newCustomer: { ...orderData.customerInfo.newCustomer!, phone: e.target.value }
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1-555-0123"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea
                          value={orderData.customerInfo.newCustomer?.address || ''}
                          onChange={(e) => setOrderData({
                            ...orderData,
                            customerInfo: {
                              ...orderData.customerInfo,
                              newCustomer: { ...orderData.customerInfo.newCustomer!, address: e.target.value }
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Enter address (optional)"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Discount Eligibility Section */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <Percent className="h-4 w-4 mr-2" />
                    Discount Eligibility
                    {orderData.customerInfo.type === 'guest' && (
                      <span className="ml-2 text-sm text-orange-600 font-normal">(Required for Guest)</span>
                    )}
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Senior Citizen */}
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          id="senior-citizen-order"
                          type="checkbox"
                          checked={orderData.customerInfo.newCustomer?.isSeniorCitizen || false}
                          onChange={(e) => setOrderData({
                            ...orderData,
                            customerInfo: {
                              ...orderData.customerInfo,
                              newCustomer: { ...orderData.customerInfo.newCustomer!, isSeniorCitizen: e.target.checked }
                            }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="senior-citizen-order" className="text-sm font-medium text-gray-700">
                          Senior Citizen (60+ years old)
                        </label>
                        <p className="text-xs text-gray-500">Eligible for 20% discount on medications</p>
                        {orderData.customerInfo.newCustomer?.isSeniorCitizen && (
                          <input
                            type="text"
                            value={orderData.customerInfo.newCustomer?.seniorCitizenID || ''}
                            onChange={(e) => setOrderData({
                              ...orderData,
                              customerInfo: {
                                ...orderData.customerInfo,
                                newCustomer: { ...orderData.customerInfo.newCustomer!, seniorCitizenID: e.target.value }
                              }
                            })}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter Senior Citizen ID number"
                          />
                        )}
                      </div>
                    </div>

                    {/* PWD */}
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          id="pwd-order"
                          type="checkbox"
                          checked={orderData.customerInfo.newCustomer?.isPWD || false}
                          onChange={(e) => setOrderData({
                            ...orderData,
                            customerInfo: {
                              ...orderData.customerInfo,
                              newCustomer: { ...orderData.customerInfo.newCustomer!, isPWD: e.target.checked }
                            }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="pwd-order" className="text-sm font-medium text-gray-700">
                          Person with Disability (PWD)
                        </label>
                        <p className="text-xs text-gray-500">Eligible for 20% discount on medications</p>
                        {orderData.customerInfo.newCustomer?.isPWD && (
                          <input
                            type="text"
                            value={orderData.customerInfo.newCustomer?.pwdId || ''}
                            onChange={(e) => setOrderData({
                              ...orderData,
                              customerInfo: {
                                ...orderData.customerInfo,
                                newCustomer: { ...orderData.customerInfo.newCustomer!, pwdId: e.target.value }
                              }
                            })}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter PWD ID number"
                          />
                        )}
                      </div>
                    </div>

                    {/* ID Upload for discount eligibility */}
                    {(orderData.customerInfo.newCustomer?.isSeniorCitizen || orderData.customerInfo.newCustomer?.isPWD) && (
                      <div className="border-t pt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ID Document Upload (Optional)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                          >
                            <Camera className="h-6 w-6 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Take Photo</span>
                          </button>
                          
                          <label className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                            <Upload className="h-6 w-6 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Upload File</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedIDFile(file);
                                  toast.success('File selected successfully!');
                                }
                              }}
                            />
                          </label>
                        </div>
                        
                        {selectedIDFile && (
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg mt-3">
                            <div className="flex items-center space-x-2">
                              <Image className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">{selectedIDFile.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedIDFile(null)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* ID Camera Interface */}
                        {showCamera && (
                          <div className="mt-3 space-y-4">
                            <div className="relative bg-black rounded-lg overflow-hidden">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-64 object-cover"
                              />
                              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                                <button
                                  type="button"
                                  onClick={capturePhoto}
                                  className="bg-white text-gray-900 px-6 py-2 rounded-full hover:bg-gray-100 flex items-center space-x-2 font-medium"
                                >
                                  <Camera className="h-5 w-5" />
                                  <span>Capture</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="bg-gray-600 text-white px-6 py-2 rounded-full hover:bg-gray-700 flex items-center space-x-2 font-medium"
                                >
                                  <X className="h-5 w-5" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep('products')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back to Products
              </button>
              <button
                onClick={() => setCurrentStep('payment')}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Step */}
      {currentStep === 'payment' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Payment & Delivery</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" />, desc: 'Pay with cash on pickup/delivery' },
                  { value: 'card', label: 'Credit/Debit Card', icon: <CreditCard className="w-5 h-5" />, desc: 'Visa, MasterCard, etc.' },
                  { value: 'gcash', label: 'GCash', icon: <Smartphone className="w-5 h-5" />, desc: 'Mobile wallet payment' },
                  { value: 'insurance', label: 'Insurance', icon: <Shield className="w-5 h-5" />, desc: 'Health insurance coverage' }
                ].map(method => (
                  <label key={method.value} className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    orderData.paymentMethod === method.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={orderData.paymentMethod === method.value}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        paymentMethod: e.target.value as 'cash' | 'card' | 'insurance' | 'gcash'
                      })}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3 w-full">
                      <div className={`p-2 rounded-full ${
                        orderData.paymentMethod === method.value 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{method.label}</div>
                        <div className="text-sm text-gray-500">{method.desc}</div>
                      </div>
                      <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                        orderData.paymentMethod === method.value 
                          ? 'border-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {orderData.paymentMethod === method.value && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="orderType"
                    value="pickup"
                    checked={orderData.orderType === 'pickup'}
                    onChange={(e) => setOrderData({
                      ...orderData,
                      orderType: e.target.value as 'pickup' | 'delivery'
                    })}
                    className="mr-2"
                  />
                  <MapPin className="w-4 h-4 mr-2" />
                  Store Pickup
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="orderType"
                    value="delivery"
                    checked={orderData.orderType === 'delivery'}
                    onChange={(e) => setOrderData({
                      ...orderData,
                      orderType: e.target.value as 'pickup' | 'delivery'
                    })}
                    className="mr-2"
                  />
                  <Truck className="w-4 h-4 mr-2" />
                  Home Delivery
                </label>
              </div>
            </div>

            {orderData.orderType === 'delivery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                <textarea
                  value={orderData.deliveryAddress || ''}
                  onChange={(e) => setOrderData({
                    ...orderData,
                    deliveryAddress: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter delivery address..."
                />
              </div>
            )}

            {showPrescriptionAlert && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prescription Number (Optional if uploading image)</label>
                  <input
                    type="text"
                    value={orderData.prescriptionNumber || ''}
                    onChange={(e) => setOrderData({
                      ...orderData,
                      prescriptionNumber: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter prescription number..."
                  />
                </div>

                {/* Prescription Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor's Prescription Letter
                  </label>
                  <p className="text-xs text-gray-500 mb-3">Upload images of prescription letters or doctor's recommendations</p>
                  
                  {!showPrescriptionCamera ? (
                    <div className="space-y-3">
                      {/* Upload Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={startPrescriptionCamera}
                          className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                        >
                          <Camera className="h-6 w-6 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                        </button>
                        
                        <label className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                          <Upload className="h-6 w-6 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">Upload Files</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            multiple
                            className="sr-only"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                setPrescriptionImages(prev => [...prev, ...files]);
                                toast.success(`${files.length} file(s) added successfully!`);
                              }
                            }}
                          />
                        </label>
                      </div>
                      
                      {/* Uploaded Images Display */}
                      {prescriptionImages.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Uploaded Prescriptions ({prescriptionImages.length})</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {prescriptionImages.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <Image className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">{file.name}</span>
                                  <span className="text-xs text-green-600">
                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePrescriptionImage(index)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Camera Interface */
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={prescriptionVideoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                          <button
                            type="button"
                            onClick={capturePrescriptionPhoto}
                            className="bg-white text-gray-900 px-6 py-2 rounded-full hover:bg-gray-100 flex items-center space-x-2 font-medium"
                          >
                            <Camera className="h-5 w-5" />
                            <span>Capture</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopPrescriptionCamera}
                            className="bg-gray-600 text-white px-6 py-2 rounded-full hover:bg-gray-700 flex items-center space-x-2 font-medium"
                          >
                            <X className="h-5 w-5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                      <canvas ref={prescriptionCanvasRef} className="hidden" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes</label>
              <textarea
                value={orderData.notes || ''}
                onChange={(e) => setOrderData({
                  ...orderData,
                  notes: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Any special instructions or notes..."
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep('customer')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back to Customer Info
              </button>
              <button
                onClick={() => setCurrentStep('review')}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Review Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Step */}
      {currentStep === 'review' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Review Your Order</h3>
          
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Order Items</h4>
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center py-2">
                  <div>
                    <span className="font-medium">{item.product.name}</span>
                    <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    {item.instructions && (
                      <p className="text-sm text-gray-600 mt-1">Instructions: {item.instructions}</p>
                    )}
                  </div>
                  <span className="font-medium">₱{(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span>₱{calculateSubtotal().toFixed(2)}</span>
                </div>
                {discountApproval.isApproved && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>
                      {discountApproval.discountType === 'senior_citizen' ? 'Senior Citizen' : 'PWD'} Discount ({discountApproval.discountPercent}%)
                    </span>
                    <span>-₱{discountApproval.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>₱{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Discount Approval Section */}
            {discountApproval.isEligible && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center text-blue-800">
                  <Percent className="h-5 w-5 mr-2" />
                  Discount Approval Required
                </h4>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        {discountApproval.discountType === 'senior_citizen' ? (
                          <UserCheck className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{discountApproval.customerName}</p>
                        <p className="text-sm text-gray-600">
                          {discountApproval.discountType === 'senior_citizen' ? 'Senior Citizen' : 'Person with Disability (PWD)'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{discountApproval.discountPercent}% OFF</p>
                      <p className="text-sm text-gray-600">₱{discountApproval.discountAmount.toFixed(2)} discount</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-700 mb-3">
                      Please verify the customer's eligibility and approve or reject the discount application.
                    </p>
                    
                    {!discountApproval.isApproved ? (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={approveDiscount}
                          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>Approve Discount</span>
                        </button>
                        <button
                          onClick={rejectDiscount}
                          className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          <span>Reject Discount</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">Discount Approved</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Customer Information</h4>
              {orderData.customerInfo.type === 'existing' ? (
                <p>Existing Customer ID: {orderData.customerInfo.existingCustomerId}</p>
              ) : (
                <div className="space-y-1">
                  <p><strong>Name:</strong> {orderData.customerInfo.newCustomer?.name}</p>
                  <p><strong>Email:</strong> {orderData.customerInfo.newCustomer?.email}</p>
                  <p><strong>Phone:</strong> {orderData.customerInfo.newCustomer?.phone}</p>
                  <p><strong>Address:</strong> {orderData.customerInfo.newCustomer?.address}</p>
                </div>
              )}
            </div>

            {/* Payment & Delivery */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Payment & Delivery</h4>
              <div className="space-y-1">
                <p><strong>Payment Method:</strong> {orderData.paymentMethod}</p>
                <p><strong>Order Type:</strong> {orderData.orderType}</p>
                {orderData.orderType === 'delivery' && (
                  <p><strong>Delivery Address:</strong> {orderData.deliveryAddress}</p>
                )}
                {orderData.prescriptionNumber && (
                  <p><strong>Prescription Number:</strong> {orderData.prescriptionNumber}</p>
                )}
                {orderData.notes && (
                  <p><strong>Notes:</strong> {orderData.notes}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep('payment')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back to Payment
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal (for orders/other purposes) */}
      {showQRScanner && (
        <QRScanner
          onClose={() => setShowQRScanner(false)}
          onOrderScanned={handleOrderScanned}
          mode="order"
        />
      )}

      {/* Prescription Summary Modal */}
      {showPrescriptionSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Prescription Verification Required</h3>
              <button
                onClick={cancelPrescriptionVerification}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-orange-800">Prescription Products in Cart</span>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  The following products require a valid prescription. Customer verification is required to proceed.
                </p>
                
                <div className="space-y-2">
                  {prescriptionProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-2 bg-white border border-orange-200 rounded">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <div className="text-xs text-gray-500">{product.dosage} • {product.form}</div>
                      </div>
                      <div className="text-sm text-orange-600 font-medium">Rx Required</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Please scan the customer's QR code or search for the customer to verify their identity for prescription products.
                </p>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowPrescriptionSummary(false);
                      setShowCustomerQRScanner(true);
                      setPrescriptionVerificationStep('scanning');
                    }}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Scan Customer QR</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPrescriptionSummary(false);
                      setShowCustomerSearch(true);
                      setPrescriptionVerificationStep('searching');
                    }}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Customer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer QR Scanner for Prescription Verification */}
      {showCustomerQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customer Verification Required</h3>
              <button
                onClick={cancelPrescriptionVerification}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-orange-800">Prescription Verification</span>
                </div>
                <p className="text-sm text-orange-700">
                  {prescriptionProducts.length} prescription product(s) require customer verification.
                  Please scan the customer's QR code to verify their identity.
                </p>
              </div>
              
              <QRScanner
                onClose={() => {}}
                onCustomerScanned={handleCustomerScanned}
                onCustomerNotFound={handleCustomerNotFound}
                mode="customer"
                embedded={true}
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCustomerNotFound}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Customer Not Found
                </button>
                <button
                  onClick={cancelPrescriptionVerification}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Find Customer</h3>
              <button
                onClick={cancelPrescriptionVerification}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700 mb-2">
                  <strong>{prescriptionProducts.length} prescription product(s)</strong> require customer verification:
                </p>
                <div className="text-xs text-orange-600">
                  {prescriptionProducts.map(p => p.name).join(', ')}
                </div>
                <p className="text-sm text-orange-700 mt-2">
                  Search for an existing customer or add a new one.
                </p>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers by name, phone, or email..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Customer Results */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customers
                  .filter(customer => 
                    customerSearchTerm === '' || 
                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    customer.phone.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase())
                  )
                  .slice(0, 10)
                  .map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomerFromSearch(customer)}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone} • {customer.email}</div>
                          {(customer.isSeniorCitizen || customer.isPWD) && (
                            <div className="text-xs text-blue-600">
                              {customer.isSeniorCitizen && 'Senior Citizen'} 
                              {customer.isSeniorCitizen && customer.isPWD && ' • '}
                              {customer.isPWD && 'PWD'}
                            </div>
                          )}
                        </div>
                        <UserCheck className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Add New Customer Button */}
              <div className="border-t pt-4">
                <button
                  onClick={addNewCustomerForPrescription}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Add New Customer</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowCustomerSearch(false);
                    setShowCustomerQRScanner(true);
                    setPrescriptionVerificationStep('scanning');
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back to QR Scan
                </button>
                <button
                  onClick={cancelPrescriptionVerification}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
        <p className="text-gray-600">Create new orders and manage order history</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('fast-order')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'fast-order' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🚀 Fast Order
        </button>
        <button
          onClick={() => setActiveTab('new-order')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'new-order' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          New Order
        </button>
        <button
          onClick={() => setActiveTab('online-orders')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors relative ${
            activeTab === 'online-orders' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Online Orders
          {onlineOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {onlineOrders.length > 9 ? '9+' : onlineOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('order-history')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'order-history' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Order History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'fast-order' && <FastOrderTab />}
      {activeTab === 'new-order' && <NewOrderTab />}
      {activeTab === 'online-orders' && <OnlineOrdersTab />}
      {activeTab === 'order-history' && <OrderHistoryTab />}
      
      {/* QR Scanner Modal - Global for both tabs */}
      {showQRScanner && activeTab === 'order-history' && (
        <QRScanner
          onClose={() => setShowQRScanner(false)}
          onOrderScanned={handleOrderScanned}
          mode="order"
        />
      )}
    </div>
  );
};

export default Orders;