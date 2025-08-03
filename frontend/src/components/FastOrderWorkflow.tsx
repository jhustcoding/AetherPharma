import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Scan, 
  User, 
  UserCheck, 
  Camera, 
  Upload, 
  ShoppingCart, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  X,
  QrCode,
  FileText,
  Package,
  Clock,
  Save,
  Search
} from 'lucide-react';
import { Product, Customer } from '../types';

interface CartItem {
  product: Product;
  quantity: number;
  needsPrescription: boolean;
  prescriptionProvided?: boolean;
  prescriptionImages?: File[];
  existingPrescription?: {
    id: string;
    number: string;
    date: string;
    prescribed_by: string;
  };
}

interface WorkflowStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

// Helper functions to handle both field naming conventions
const getCustomerName = (customer: Customer) => {
  if (customer.first_name && customer.last_name) {
    return `${customer.first_name} ${customer.last_name}`;
  }
  return customer.name || 'Unknown Customer';
};

const getCustomerFirstName = (customer: Customer) => {
  return customer.first_name || customer.name?.split(' ')[0] || 'Customer';
};

const isCustomerSeniorCitizen = (customer: Customer) => {
  return customer.is_senior_citizen || customer.isSeniorCitizen || false;
};

const isCustomerPWD = (customer: Customer) => {
  return customer.is_pwd || customer.isPWD || false;
};

const FastOrderWorkflow: React.FC = () => {
  // Workflow states
  const [currentStep, setCurrentStep] = useState<'customer' | 'products' | 'prescriptions' | 'payment' | 'complete'>('customer');
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([
    { id: 'customer', title: 'Customer ID', status: 'active' },
    { id: 'products', title: 'Scan Products', status: 'pending' },
    { id: 'prescriptions', title: 'Prescriptions', status: 'pending' },
    { id: 'payment', title: 'Payment', status: 'pending' },
    { id: 'complete', title: 'Complete', status: 'pending' }
  ]);

  // Customer data
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState<'new' | 'existing' | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);

  // Product scanning
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isListeningForBarcode, setIsListeningForBarcode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [prescriptionProducts, setPrescriptionProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Prescription handling
  const [showPrescriptionCamera, setShowPrescriptionCamera] = useState(false);
  const [prescriptionCameraStream, setPrescriptionCameraStream] = useState<MediaStream | null>(null);
  const [currentPrescriptionProduct, setCurrentPrescriptionProduct] = useState<Product | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance' | 'gcash'>('cash');
  const [total, setTotal] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Camera refs
  const prescriptionVideoRef = useRef<HTMLVideoElement>(null);
  const prescriptionCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // QR Scanner state
  const [qrCameraStream, setQrCameraStream] = useState<MediaStream | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // USB Barcode scanner for products
  useEffect(() => {
    if (currentStep === 'products') {
      setIsListeningForBarcode(true);
    } else {
      setIsListeningForBarcode(false);
      setBarcodeInput('');
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isListeningForBarcode) return;

    let barcodeBuffer = '';
    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      if (event.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          processBarcodeInput(barcodeBuffer);
          barcodeBuffer = '';
        }
        return;
      }

      if (event.key.length === 1) {
        barcodeBuffer += event.key;
        setBarcodeInput(barcodeBuffer);
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (barcodeBuffer.length > 3) {
            processBarcodeInput(barcodeBuffer);
          }
          barcodeBuffer = '';
          setBarcodeInput('');
        }, 100);
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [isListeningForBarcode, products]);

  // Calculate totals
  useEffect(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const discountAmount = customer && (isCustomerSeniorCitizen(customer) || isCustomerPWD(customer)) ? subtotal * 0.2 : 0;
    setDiscount(discountAmount);
    setTotal(subtotal - discountAmount);
  }, [cart, customer]);

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8080/api/v1/products/browse', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('FastOrderWorkflow - Products loaded:', data); // Debug log
        console.log('FastOrderWorkflow - Product names:', data.products?.map(p => p.name) || 'No products array');
        setProducts(data.products || data);
      } else {
        console.error('Failed to load products, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const processBarcodeInput = async (barcode: string) => {
    try {
      setBarcodeInput('');
      
      const product = products.find(p => 
        p.barcode === barcode || 
        p.sku === barcode ||
        p.name.toLowerCase().includes(barcode.toLowerCase())
      );

      if (product) {
        addToCart(product);
      } else {
        toast.error(`Product not found for barcode: ${barcode}`);
      }
    } catch (error) {
      console.error('Barcode processing error:', error);
      toast.error('Error processing barcode');
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Check both possible field names for prescription requirement
      const needsPrescription = product.prescriptionRequired || product.prescription_required || false;
      console.log(`Adding ${product.name} to cart - Rx required:`, needsPrescription);
      
      setCart([...cart, {
        product,
        quantity: 1,
        needsPrescription,
        prescriptionProvided: false
      }]);

      if (needsPrescription) {
        setPrescriptionProducts(prev => [...prev, product]);
        toast.success(`Added ${product.name} to cart - Prescription required!`);
      } else {
        toast.success(`Added ${product.name} to cart`);
      }
    }
  };

  const updateWorkflowStep = (stepId: string, status: 'completed' | 'error' | 'active') => {
    setWorkflow(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const startQRCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        } 
      });
      
      setQrCameraStream(stream);
      
      setTimeout(() => {
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
        }
      }, 100);
      
    } catch (error) {
      console.error('Camera error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else {
        toast.error(`Camera error: ${error.message}`);
      }
    }
  };

  const stopQRCamera = () => {
    if (qrCameraStream) {
      qrCameraStream.getTracks().forEach(track => track.stop());
      setQrCameraStream(null);
    }
    setShowQRScanner(false);
  };

  const handleQRScannerOpen = () => {
    setShowQRScanner(true);
    startQRCamera();
  };

  const handleCustomerQRScan = async (qrData: string) => {
    try {
      // Parse QR data and fetch customer
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8080/api/v1/customers/qr/${qrData}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
        setCustomerType('existing');
        stopQRCamera();
        updateWorkflowStep('customer', 'completed');
        setCurrentStep('products');
        
        // Check for existing prescriptions
        await loadCustomerPrescriptions(customerData.id);
        toast.success(`Welcome back, ${getCustomerFirstName(customerData)}!`);
      } else {
        toast.error('Customer not found');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error('Error scanning QR code');
    }
  };

  const searchCustomers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8080/api/v1/customers?search=${encodeURIComponent(searchTerm)}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerSearchResults(data.customers || []);
      } else {
        setCustomerSearchResults([]);
      }
    } catch (error) {
      console.error('Customer search error:', error);
      setCustomerSearchResults([]);
    }
  };

  const selectCustomer = async (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer);
    setCustomerType('existing');
    setShowCustomerSearch(false);
    setCustomerSearchTerm('');
    setCustomerSearchResults([]);
    updateWorkflowStep('customer', 'completed');
    setCurrentStep('products');
    
    // Check for existing prescriptions
    await loadCustomerPrescriptions(selectedCustomer.id);
    toast.success(`Welcome back, ${getCustomerFirstName(selectedCustomer)}!`);
  };

  const loadCustomerPrescriptions = async (customerId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8080/api/v1/customers/${customerId}/prescriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const prescriptions = await response.json();
        // Update cart items with existing prescriptions
        setCart(prev => prev.map(item => {
          if (item.needsPrescription) {
            const existingPrescription = prescriptions.find((p: any) => 
              p.products.includes(item.product.id)
            );
            if (existingPrescription) {
              return {
                ...item,
                prescriptionProvided: true,
                existingPrescription
              };
            }
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  const handleNewCustomer = async (customerData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8080/api/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomer(newCustomer);
        setCustomerType('new');
        setShowCustomerForm(false);
        updateWorkflowStep('customer', 'completed');
        setCurrentStep('products');
        toast.success('Customer created successfully!');
      } else {
        toast.error('Error creating customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Error creating customer');
    }
  };

  const handleGuestCustomer = () => {
    // Create a temporary guest customer object
    const guestCustomer = {
      id: `guest_${Date.now()}`,
      firstName: 'Guest',
      lastName: 'Customer',
      email: '',
      phone: '',
      isSeniorCitizen: false,
      isPWD: false,
      isGuest: true
    };
    
    setCustomer(guestCustomer as any);
    setCustomerType('new');
    updateWorkflowStep('customer', 'completed');
    setCurrentStep('products');
    toast.success('Proceeding as guest customer');
  };

  const startPrescriptionCamera = async (product: Product) => {
    try {
      console.log('Starting prescription camera for product:', product.name);
      
      // Check if browser supports camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera if available
        } 
      });
      
      console.log('Camera stream obtained successfully');
      setPrescriptionCameraStream(stream);
      setCurrentPrescriptionProduct(product);
      setShowPrescriptionCamera(true);
      
      // Wait a bit for the modal to render
      setTimeout(() => {
        if (prescriptionVideoRef.current) {
          prescriptionVideoRef.current.srcObject = stream;
          console.log('Video stream assigned to element');
        }
      }, 100);
      
    } catch (error) {
      console.error('Camera error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else {
        toast.error(`Camera error: ${error.message}`);
      }
    }
  };

  const capturePrescriptionPhoto = () => {
    if (prescriptionVideoRef.current && prescriptionCanvasRef.current && currentPrescriptionProduct) {
      const canvas = prescriptionCanvasRef.current;
      const video = prescriptionVideoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `prescription_${currentPrescriptionProduct.id}_${Date.now()}.jpg`, {
              type: 'image/jpeg'
            });

            // Update cart item with prescription image
            setCart(prev => prev.map(item =>
              item.product.id === currentPrescriptionProduct.id
                ? {
                    ...item,
                    prescriptionProvided: true,
                    prescriptionImages: [...(item.prescriptionImages || []), file]
                  }
                : item
            ));

            stopPrescriptionCamera();
            toast.success('Prescription photo captured!');
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handlePrescriptionUpload = (product: Product, files: FileList) => {
    const fileArray = Array.from(files);
    
    // Update cart item with uploaded prescription files
    setCart(prev => prev.map(item =>
      item.product.id === product.id
        ? {
            ...item,
            prescriptionProvided: true,
            prescriptionImages: [...(item.prescriptionImages || []), ...fileArray]
          }
        : item
    ));

    toast.success(`${fileArray.length} prescription file(s) uploaded!`);
  };

  const stopPrescriptionCamera = () => {
    if (prescriptionCameraStream) {
      prescriptionCameraStream.getTracks().forEach(track => track.stop());
      setPrescriptionCameraStream(null);
    }
    setShowPrescriptionCamera(false);
    setCurrentPrescriptionProduct(null);
  };

  const handlePrescriptionComplete = () => {
    const pendingPrescriptions = cart.filter(item => 
      item.needsPrescription && !item.prescriptionProvided
    );

    if (pendingPrescriptions.length === 0) {
      updateWorkflowStep('prescriptions', 'completed');
      setCurrentStep('payment');
    } else {
      toast.error(`${pendingPrescriptions.length} prescription(s) still needed`);
    }
  };

  const handlePayment = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // For guest customers, don't include customer_id
      const isGuest = customer?.id?.toString().startsWith('guest_');
      
      // Create sale
      const saleData = {
        customer_id: isGuest ? null : customer?.id,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        })),
        total,
        subtotal: total + discount,
        discount,
        notes: isGuest ? 'Fast workflow order - Guest customer' : 'Fast workflow order'
      };

      const response = await fetch('http://localhost:8080/api/v1/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const sale = await response.json();
        
        try {
          // Save purchase history for AI medical plans (only for registered customers)
          if (!isGuest) {
            await savePurchaseHistory(sale.id);
            await savePrescriptionsToProfile(sale.id);
          }
        } catch (historyError) {
          // Don't block completion on history save errors
        }
        
        // Update workflow steps
        setWorkflow(prev => prev.map(step => {
          if (step.id === 'payment') return { ...step, status: 'completed' };
          if (step.id === 'complete') return { ...step, status: 'completed' };
          return step;
        }));
        
        setCurrentStep('complete');
        
        // Show success message
        const prescriptionItemsCount = cart.filter(item => item.needsPrescription && item.prescriptionProvided).length;
        if (!isGuest && prescriptionItemsCount > 0) {
          toast.success(`Order completed! ${prescriptionItemsCount} prescription(s) saved for AI medical planning.`);
        } else {
          toast.success('Order completed successfully!');
        }
      } else {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || 'Unknown error';
        } catch (parseError) {
          errorMessage = errorText || 'Unknown error';
        }
        toast.error(`Payment failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(`Payment processing error: ${error.message}`);
    }
  };

  const savePurchaseHistory = async (saleId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      for (const item of cart) {
        await fetch('http://localhost:8080/api/v1/customers/purchase-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            customer_id: customer?.id,
            product_id: item.product.id,
            sale_id: saleId,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: item.product.price * item.quantity,
            prescription_number: item.existingPrescription?.number,
            prescribed_by: item.existingPrescription?.prescribed_by,
            notes: `Fast workflow - ${item.product.category}`
          })
        });
      }
    } catch (error) {
      console.error('Error saving purchase history:', error);
    }
  };

  const savePrescriptionsToProfile = async (saleId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Process prescription items for AI medical planning
      const prescriptionItems = cart.filter(item => item.needsPrescription && item.prescriptionProvided);
      
      for (const item of prescriptionItems) {
        // Save prescription record to customer profile
        const prescriptionData = {
          customer_id: customer?.id,
          product_id: item.product.id,
          sale_id: saleId,
          prescription_type: item.existingPrescription ? 'existing' : 'new',
          prescription_number: item.existingPrescription?.number || `RX-${Date.now()}-${item.product.id.slice(-4)}`,
          prescribed_by: item.existingPrescription?.prescribed_by || 'Unknown Doctor',
          prescription_date: new Date().toISOString(),
          dosage: item.product.dosage || 'As prescribed',
          quantity_prescribed: item.quantity,
          refills_remaining: 0,
          notes: `AI Medical Plan - ${item.product.category} - ${item.product.name}`,
          // Medical data for AI analysis
          medical_context: {
            product_category: item.product.category,
            therapeutic_class: item.product.therapeuticClassification,
            active_ingredient: item.product.activeIngredient,
            drug_interactions: item.product.drugInteractions,
            side_effects: item.product.sideEffects,
            contraindications: item.product.contraindications,
            purchase_frequency: 'first_time', // This would be calculated from history
            adherence_score: 100 // Initial score, would be updated based on refill patterns
          }
        };

        await fetch('http://localhost:8080/api/v1/customers/prescriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(prescriptionData)
        });

        // Upload prescription images if available
        if (item.prescriptionImages && item.prescriptionImages.length > 0) {
          await uploadPrescriptionImages(customer?.id, item.product.id, item.prescriptionImages);
        }
      }

      // Update customer medical profile for AI insights
      if (prescriptionItems.length > 0) {
        await updateCustomerMedicalProfile(prescriptionItems);
      }

    } catch (error) {
      console.error('Error saving prescriptions to profile:', error);
    }
  };

  const uploadPrescriptionImages = async (customerId: string, productId: string, images: File[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      for (const image of images) {
        const formData = new FormData();
        formData.append('prescription_image', image);
        formData.append('customer_id', customerId);
        formData.append('product_id', productId);
        formData.append('image_type', 'prescription');
        formData.append('description', `Prescription for ${productId}`);

        await fetch('http://localhost:8080/api/v1/customers/prescription-images', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      }
    } catch (error) {
      console.error('Error uploading prescription images:', error);
    }
  };

  const updateCustomerMedicalProfile = async (prescriptionItems: CartItem[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Extract medical insights for AI processing
      const medicalInsights = {
        medications_added: prescriptionItems.map(item => ({
          name: item.product.name,
          category: item.product.category,
          active_ingredient: item.product.activeIngredient,
          therapeutic_class: item.product.therapeuticClassification
        })),
        potential_interactions: [], // Would be calculated by AI
        health_conditions_inferred: [], // Would be inferred from medication patterns
        risk_factors: [], // Would be calculated based on drug combinations
        adherence_reminders: prescriptionItems.map(item => ({
          medication: item.product.name,
          frequency: 'daily', // Would be parsed from prescription
          next_refill_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })),
        ai_recommendations: {
          dietary_suggestions: [],
          lifestyle_recommendations: [],
          monitoring_requirements: [],
          potential_side_effects_to_watch: prescriptionItems.flatMap(item => item.product.sideEffects || [])
        }
      };

      await fetch(`http://localhost:8080/api/v1/customers/${customer?.id}/medical-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medical_insights: medicalInsights,
          last_prescription_update: new Date().toISOString(),
          ai_analysis_status: 'pending'
        })
      });

    } catch (error) {
      console.error('Error updating customer medical profile:', error);
    }
  };

  const resetWorkflow = () => {
    setCustomer(null);
    setCustomerType(null);
    setCart([]);
    setPrescriptionProducts([]);
    setCurrentStep('customer');
    setWorkflow([
      { id: 'customer', title: 'Customer ID', status: 'active' },
      { id: 'products', title: 'Scan Products', status: 'pending' },
      { id: 'prescriptions', title: 'Prescriptions', status: 'pending' },
      { id: 'payment', title: 'Payment', status: 'pending' },
      { id: 'complete', title: 'Complete', status: 'pending' }
    ]);
  };


  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Workflow Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {workflow.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                step.status === 'active' ? 'bg-blue-500 border-blue-500 text-white' :
                step.status === 'error' ? 'bg-red-500 border-red-500 text-white' :
                'bg-gray-200 border-gray-300 text-gray-500'
              }`}>
                {step.status === 'completed' ? <CheckCircle size={20} /> : index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{step.title}</span>
              {index < workflow.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'customer' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Customer Identification</h2>
            <button
              onClick={resetWorkflow}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Start Over
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={handleQRScannerOpen}
              className="flex flex-col items-center p-6 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <QrCode size={48} className="text-blue-500 mb-2" />
              <span className="font-medium">Scan QR Code</span>
              <span className="text-sm text-gray-500">Existing Member</span>
            </button>
            <button
              onClick={() => setShowCustomerSearch(true)}
              className="flex flex-col items-center p-6 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 transition-colors"
            >
              <Search size={48} className="text-purple-500 mb-2" />
              <span className="font-medium">Search Customer</span>
              <span className="text-sm text-gray-500">Find Existing</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowCustomerForm(true)}
              className="flex flex-col items-center p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 transition-colors"
            >
              <User size={48} className="text-green-500 mb-2" />
              <span className="font-medium">New Customer</span>
              <span className="text-sm text-gray-500">Create Profile</span>
            </button>
            <button
              onClick={() => handleGuestCustomer()}
              className="flex flex-col items-center p-6 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 transition-colors"
            >
              <ShoppingCart size={48} className="text-orange-500 mb-2" />
              <span className="font-medium">Guest Purchase</span>
              <span className="text-sm text-gray-500">No Account Needed</span>
            </button>
          </div>
        </div>
      )}

      {currentStep === 'products' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => {
                  updateWorkflowStep('customer', 'active');
                  setCurrentStep('customer');
                }}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 mb-2"
              >
                ← Back to Customer
              </button>
              <h2 className="text-xl font-semibold">Scan Products</h2>
              {customer?.id?.toString().startsWith('guest_') && (
                <p className="text-sm text-orange-600 mt-1">
                  🛒 Guest purchase - No medical history will be saved
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Scan size={16} className="mr-1" />
                Listening for barcode: {barcodeInput || 'Ready'}
              </div>
              <button
                onClick={() => {
                  console.log('Manual refresh - Current products:', products.length);
                  console.log('Current auth token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');
                  loadProducts();
                }}
                className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
              >
                Refresh Products ({products.length})
              </button>
            </div>
          </div>

          {/* Search and Manual Add */}
          <div className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search products or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Search Results */}
            {searchTerm && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                {products.length === 0 && (
                  <div className="p-3 text-center text-yellow-600 text-sm">
                    Loading products... ({products.length} loaded)
                  </div>
                )}
                {(() => {
                  const filteredProducts = products.filter(product => 
                    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  console.log(`Search "${searchTerm}": ${filteredProducts.length} of ${products.length} products found`);
                  return filteredProducts.slice(0, 10).map(product => (
                    <div
                      key={product.id}
                      onClick={() => {
                        addToCart(product);
                        setSearchTerm('');
                      }}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            SKU: {product.sku} | Stock: {product.stock} | ₱{product.price}
                          </div>
                        </div>
                        <Plus size={16} className="text-blue-500" />
                      </div>
                    </div>
                  ));
                })()}
                {searchTerm && products.length > 0 && products.filter(product => 
                  product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    No products found matching "{searchTerm}" (Total products: {products.length})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="space-y-2 mb-4">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Package size={20} className="text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-sm text-gray-500">
                      ₱{item.product.price} × {item.quantity} = ₱{(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {item.needsPrescription && (
                    <span className={`px-2 py-1 rounded text-xs mr-2 ${
                      item.prescriptionProvided ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.prescriptionProvided ? 'Prescription ✓' : 'Needs Prescription'}
                    </span>
                  )}
                  <div className="flex items-center mr-2">
                    <button
                      onClick={() => setCart(cart.map(cartItem =>
                        cartItem.product.id === item.product.id && cartItem.quantity > 1
                          ? { ...cartItem, quantity: cartItem.quantity - 1 }
                          : cartItem
                      ))}
                      className="text-gray-500 hover:text-gray-700 p-1"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="mx-2 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => setCart(cart.map(cartItem =>
                        cartItem.product.id === item.product.id
                          ? { ...cartItem, quantity: cartItem.quantity + 1 }
                          : cartItem
                      ))}
                      className="text-gray-500 hover:text-gray-700 p-1"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => setCart(cart.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => {
                const needsPrescriptions = cart.some(item => item.needsPrescription && !item.prescriptionProvided);
                if (needsPrescriptions) {
                  updateWorkflowStep('products', 'completed');
                  setCurrentStep('prescriptions');
                } else {
                  updateWorkflowStep('products', 'completed');
                  updateWorkflowStep('prescriptions', 'completed');
                  setCurrentStep('payment');
                }
              }}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Continue to {cart.some(item => item.needsPrescription && !item.prescriptionProvided) ? 'Prescriptions' : 'Payment'}
            </button>
          )}
        </div>
      )}

      {currentStep === 'prescriptions' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => {
                  updateWorkflowStep('products', 'active');
                  setCurrentStep('products');
                }}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 mb-2"
              >
                ← Back to Products
              </button>
              <h2 className="text-xl font-semibold">Prescription Required</h2>
            </div>
          </div>
          
          
          <div className="space-y-4">
            {cart.filter(item => item.needsPrescription).length === 0 && (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Package size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No prescription items in cart.</p>
                <p className="text-sm text-gray-500 mt-1">All items can proceed to payment directly.</p>
              </div>
            )}
            
            {cart.filter(item => item.needsPrescription).map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">{item.product.name}</div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    item.prescriptionProvided ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.prescriptionProvided ? 'Provided' : 'Required'}
                  </div>
                </div>
                
                {!item.prescriptionProvided && (
                  <div className="space-y-3 mb-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 font-medium text-sm mb-2">
                        ⚠️ Prescription Required for this medication
                      </p>
                      <p className="text-red-600 text-xs">
                        Please provide a valid prescription to proceed with this item.
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => startPrescriptionCamera(item.product)}
                        className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Camera size={20} className="mr-2" />
                        Take Photo
                      </button>
                      <label className="flex-1 flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors">
                        <Upload size={20} className="mr-2" />
                        Upload File(s)
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            console.log('File input changed:', e.target.files);
                            if (e.target.files && e.target.files.length > 0) {
                              handlePrescriptionUpload(item.product, e.target.files);
                            }
                          }}
                        />
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center">
                      Accepted formats: JPG, PNG, PDF • Multiple files allowed
                    </p>
                  </div>
                )}

                {item.prescriptionImages && item.prescriptionImages.length > 0 && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <div className="text-sm font-medium text-green-800 mb-1">
                      Prescription Files ({item.prescriptionImages.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.prescriptionImages.map((file, idx) => (
                        <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {file.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.existingPrescription && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <div className="text-sm">
                      <strong>Existing Prescription:</strong> {item.existingPrescription.number}
                      <br />
                      <strong>Prescribed by:</strong> {item.existingPrescription.prescribed_by}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handlePrescriptionComplete}
            className="w-full mt-4 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {currentStep === 'payment' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => {
                  const needsPrescriptions = cart.some(item => item.needsPrescription && !item.prescriptionProvided);
                  if (needsPrescriptions) {
                    updateWorkflowStep('prescriptions', 'active');
                    setCurrentStep('prescriptions');
                  } else {
                    updateWorkflowStep('products', 'active');
                    setCurrentStep('products');
                  }
                }}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 mb-2"
              >
                ← Back to {cart.some(item => item.needsPrescription && !item.prescriptionProvided) ? 'Prescriptions' : 'Products'}
              </button>
              <h2 className="text-xl font-semibold">Payment</h2>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Order Summary</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                customer?.id?.toString().startsWith('guest_') 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {customer?.id?.toString().startsWith('guest_') ? 'Guest Purchase' : 'Member Purchase'}
              </span>
            </div>
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>₱{(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 border-t pt-2 mt-2">
                <span>Discount ({customer && isCustomerSeniorCitizen(customer) ? 'Senior' : 'PWD'})</span>
                <span>-₱{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-lg border-t pt-2 mt-2">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Payment Method</h3>
            <div className="grid grid-cols-2 gap-2">
              {['cash', 'card', 'gcash', 'insurance'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as any)}
                  className={`p-3 border rounded-lg capitalize ${
                    paymentMethod === method ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePayment}
            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Complete Payment (₱{total.toFixed(2)})
          </button>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Order Complete!</h2>
          <p className="text-gray-600 mb-6">
            {customer?.id?.toString().startsWith('guest_') 
              ? 'Guest transaction completed successfully.'
              : 'Transaction completed successfully. Purchase history saved for AI medical planning.'
            }
          </p>
          
          {/* Member Benefits Summary */}
          {!customer?.id?.toString().startsWith('guest_') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-green-800 mb-2">✅ Member Benefits Applied:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Purchase history saved for AI medical insights</li>
                {cart.filter(item => item.needsPrescription && item.prescriptionProvided).length > 0 && (
                  <li>• {cart.filter(item => item.needsPrescription && item.prescriptionProvided).length} prescription(s) added to medical profile</li>
                )}
                {cart.filter(item => item.prescriptionImages && item.prescriptionImages.length > 0).length > 0 && (
                  <li>• Prescription images stored securely</li>
                )}
                <li>• AI will analyze for potential drug interactions</li>
                <li>• Personalized health recommendations will be generated</li>
                {customer && (isCustomerSeniorCitizen(customer) || isCustomerPWD(customer)) && discount > 0 && (
                  <li>• Discount applied: ₱{discount.toFixed(2)} saved</li>
                )}
              </ul>
            </div>
          )}

          {/* Guest Conversion Prompt */}
          {customer?.id?.toString().startsWith('guest_') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm">
                💡 <strong>Want to track your medical history?</strong><br />
                Create an account to save your purchases for personalized AI health insights!
              </p>
              {cart.filter(item => item.needsPrescription).length > 0 && (
                <p className="text-blue-600 text-xs mt-2">
                  You purchased {cart.filter(item => item.needsPrescription).length} prescription item(s) - 
                  members get AI-powered medication management!
                </p>
              )}
            </div>
          )}
          <button
            onClick={resetWorkflow}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start New Order
          </button>
        </div>
      )}

      {/* Prescription Camera Modal */}
      {showPrescriptionCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Take Prescription Photo</h3>
              <button 
                onClick={stopPrescriptionCamera} 
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={24} />
              </button>
            </div>
            
            {currentPrescriptionProduct && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Prescription for:</strong> {currentPrescriptionProduct.name}
                </p>
              </div>
            )}
            
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <video
                ref={prescriptionVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover rounded-lg"
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded');
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                  toast.error('Video display error');
                }}
              />
              <canvas
                ref={prescriptionCanvasRef}
                className="hidden"
              />
              
              {/* Camera loading indicator */}
              {!prescriptionCameraStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Starting camera...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={capturePrescriptionPhoto}
                disabled={!prescriptionCameraStream}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                📸 Capture Photo
              </button>
              <button
                onClick={stopPrescriptionCamera}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              Position the prescription clearly in the camera view and click capture
            </p>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Customer QR Code</h3>
              <button onClick={stopQRCamera} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4">
              <video
                ref={qrVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover rounded-lg"
                onLoadedMetadata={() => {
                  console.log('QR Scanner video loaded');
                }}
              />
              <canvas
                ref={qrCanvasRef}
                className="hidden"
              />
              
              {/* Camera loading indicator */}
              {!qrCameraStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <QrCode size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Starting camera...</p>
                  </div>
                </div>
              )}
              
              {/* QR Code detection overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-blue-300 rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-blue-500 w-48 h-48 rounded-lg">
                  <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-4">Position the customer's QR code within the frame</p>
              <button
                onClick={() => {
                  // For demo purposes, simulate QR scan with a test customer ID
                  const testQRData = "customer_12345";
                  handleCustomerQRScan(testQRData);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mr-2"
              >
                🧪 Simulate QR Scan (Demo)
              </button>
              <button
                onClick={stopQRCamera}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              For actual QR scanning, a QR code library like jsQR would be integrated here
            </p>
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Search Customer</h3>
              <button 
                onClick={() => {
                  setShowCustomerSearch(false);
                  setCustomerSearchTerm('');
                  setCustomerSearchResults([]);
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, phone, or email..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-2">
              {customerSearchTerm.length >= 2 && customerSearchResults.length === 0 && (
                <div className="text-center p-4 text-gray-500">
                  <User size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No customers found matching "{customerSearchTerm}"</p>
                </div>
              )}
              
              {customerSearchResults.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {getCustomerName(customer)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.phone} • {customer.email}
                      </div>
                      {(isCustomerSeniorCitizen(customer) || isCustomerPWD(customer)) && (
                        <div className="mt-1">
                          {isCustomerSeniorCitizen(customer) && (
                            <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded mr-1">
                              Senior
                            </span>
                          )}
                          {isCustomerPWD(customer) && (
                            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              PWD
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <UserCheck size={16} className="text-blue-500" />
                  </div>
                </div>
              ))}
            </div>

            {customerSearchTerm.length < 2 && (
              <div className="text-center p-4 text-gray-400">
                <Search size={32} className="mx-auto mb-2" />
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">New Customer</h3>
              <button onClick={() => setShowCustomerForm(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            {/* Customer form would go here */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="First Name"
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone"
                className="w-full p-2 border rounded-lg"
              />
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Senior Citizen
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  PWD
                </label>
              </div>
              <button
                onClick={() => handleNewCustomer({})} // Would pass actual form data
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Create Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastOrderWorkflow;