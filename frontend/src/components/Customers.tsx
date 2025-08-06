import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, User, Phone, Mail, Calendar, AlertTriangle, Brain, History, Package, Clock, X, Save, UserPlus, Upload, Shield, Percent, Camera, Image } from 'lucide-react';
import { Customer, CustomerPurchaseHistory } from '../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { config } from '../config';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    medicalHistory: [],
    allergies: [],
    currentMedications: [],
    isSeniorCitizen: false,
    isPWD: false
  });
  const [customerType, setCustomerType] = useState<'full' | 'guest'>('full');
  const [selectedIDFile, setSelectedIDFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  // Load customers from database
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setCustomers([]);
        return;
      }

      const apiUrl = config.API_BASE_URL;
      const response = await fetch(`${apiUrl}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const customerList = data.customers || data || [];
        setCustomers(Array.isArray(customerList) ? customerList : []);
      } else {
        const errorText = await response.text();
        console.error('Failed to load customers:', response.status, errorText);
        
        // Only clear tokens if specifically told the token is invalid/expired
        if (response.status === 401 && (errorText.includes('invalid') || errorText.includes('expired') || errorText.includes('malformed'))) {
          // Clear invalid token and redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_info');
          
          // Try to re-authenticate with default credentials
          try {
            const apiUrl = config.API_BASE_URL;
            const loginResponse = await fetch(`${apiUrl}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });
            
            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              localStorage.setItem('auth_token', loginData.access_token);
              localStorage.setItem('refresh_token', loginData.refresh_token);
              localStorage.setItem('user_info', JSON.stringify({
                id: loginData.user.id,
                username: loginData.user.username,
                email: loginData.user.email,
                firstName: loginData.user.first_name,
                lastName: loginData.user.last_name,
                role: loginData.user.role
              }));
              
              // Retry loading customers with new token
              const retryResponse = await fetch(`${apiUrl}/customers`, {
                headers: { 'Authorization': `Bearer ${loginData.access_token}` }
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                const customerList = retryData.customers || retryData || [];
                setCustomers(Array.isArray(customerList) ? customerList : []);
                return;
              }
            }
          } catch (refreshError) {
            console.error('Failed to refresh session:', refreshError);
          }
        }
        
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const loadCustomerPurchaseHistory = async (customerId: string) => {
    try {
      const apiUrl = config.API_BASE_URL;
      const response = await fetch(`${apiUrl}/customers/${customerId}/purchases`);
      if (response.ok) {
        const historyData = await response.json();
        setPurchaseHistory(historyData.orders || []);
      }
    } catch (error) {
      console.error('Error loading purchase history:', error);
      setPurchaseHistory([]);
    }
  };

  // Load purchase history when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerPurchaseHistory(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const filteredCustomers = (customers || []).filter(customer => {
    const customerName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
    return (
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
    );
  });

  const getCustomerPurchaseHistory = (customerId: string) => {
    return (purchaseHistory || [])
      .sort((a, b) => new Date(b.createdAt || b.purchaseDate).getTime() - new Date(a.createdAt || a.purchaseDate).getTime());
  };

  const getCustomerStats = (customerId: string) => {
    const customerPurchases = getCustomerPurchaseHistory(customerId);
    const totalSpent = (customerPurchases || []).reduce((sum, purchase) => sum + (purchase.totalAmount || purchase.total), 0);
    const totalPurchases = (customerPurchases || []).length;
    const lastPurchase = (customerPurchases || [])[0]?.createdAt || (customerPurchases || [])[0]?.purchaseDate;
    
    // Get unique medications from order items
    const uniqueMedications = Array.from(new Set(
      (customerPurchases || []).flatMap(purchase => 
        purchase.OrderItems ? (purchase.OrderItems || []).map((item: any) => item.Product?.name) : [purchase.productName]
      ).filter(Boolean)
    ));
    
    return {
      totalSpent,
      totalPurchases,
      lastPurchase,
      uniqueMedications: uniqueMedications.length
    };
  };

  const handleAddCustomer = async () => {
    // Different validation for full customer vs guest customer
    if (customerType === 'full') {
      if (!newCustomer.name || !newCustomer.email || !newCustomer.phone || !newCustomer.dateOfBirth) {
        toast.error('Please fill in all required fields (Name, Email, Phone, Date of Birth)');
        return;
      }
    } else {
      // Guest customer only needs basic info if they have discount eligibility
      if (!newCustomer.name) {
        toast.error('Please provide customer name');
        return;
      }
      if (!newCustomer.isSeniorCitizen && !newCustomer.isPWD) {
        toast.error('Guest customers must have Senior Citizen or PWD eligibility');
        return;
      }
      if (newCustomer.isSeniorCitizen && !newCustomer.seniorCitizenID) {
        toast.error('Please provide Senior Citizen ID number');
        return;
      }
      if (newCustomer.isPWD && !newCustomer.pwdId) {
        toast.error('Please provide PWD ID number');
        return;
      }
    }

    // Email validation for full customers
    if (customerType === 'full' && newCustomer.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newCustomer.email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    // Phone validation for full customers
    if (customerType === 'full' && newCustomer.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(newCustomer.phone.replace(/[\s\-\(\)]/g, ''))) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }

    // Check for duplicate email (only for full customers with email)
    if (customerType === 'full' && newCustomer.email && (customers || []).some(customer => customer.email?.toLowerCase() === newCustomer.email!.toLowerCase())) {
      toast.error('A customer with this email already exists');
      return;
    }

    // Split name into first and last name
    const nameParts = newCustomer.name!.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    // Prepare customer data for backend API (using snake_case field names)
    const customerData = {
      first_name: firstName,
      last_name: lastName,
      email: customerType === 'full' ? newCustomer.email! : `guest-${Date.now()}@pharmacy.local`,
      phone: customerType === 'full' ? newCustomer.phone! : '09000000000',
      date_of_birth: customerType === 'full' ? new Date(newCustomer.dateOfBirth!).toISOString() : '1900-01-01T00:00:00Z',
      medical_history: customerType === 'full' ? (newCustomer.medicalHistory || []) : [],
      allergies: customerType === 'full' ? (newCustomer.allergies || []) : [],
      current_medications: customerType === 'full' ? (newCustomer.currentMedications || []) : [],
      insurance_info: customerType === 'full' ? newCustomer.insuranceInfo : '',
      // Discount fields
      is_senior_citizen: newCustomer.isSeniorCitizen || false,
      is_pwd: newCustomer.isPWD || false,
      senior_citizen_id: newCustomer.seniorCitizenID || '',
      pwd_id: newCustomer.pwdId || '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'Philippines'
    };

    // Save customer to database via API
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = config.API_BASE_URL;
      const response = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        const savedCustomer = await response.json();
        await loadCustomers(); // Reload the full customer list
        toast.success(`${customerType === 'full' ? 'Customer' : 'Guest customer'} ${firstName} ${lastName} added successfully!`);
      } else {
        const errorText = await response.text();
        console.error('Customer creation failed:', errorText);
        toast.error('Failed to create customer: ' + errorText);
      }
    } catch (error) {
      // Fallback to local state if API fails
      console.error('Error saving customer to database:', error);
      const fallbackCustomer = {
        ...customerData,
        id: `local-${Date.now()}`,
        name: `${customerData.first_name} ${customerData.last_name}`,
        qr_code: `QR-${Date.now()}`
      };
      setCustomers([...customers, fallbackCustomer]);
      toast.success(`${customerType === 'full' ? 'Customer' : 'Guest customer'} ${customerData.first_name} ${customerData.last_name} added locally!`);
    }

    setShowAddModal(false);
    setNewCustomer({
      medicalHistory: [],
      allergies: [],
      currentMedications: [],
      isSeniorCitizen: false,
      isPWD: false
    });
    setCustomerType('full');
    setSelectedIDFile(null);
    stopCamera();
  };

  const handleInputChange = (field: keyof Customer, value: any) => {
    setNewCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field: 'medicalHistory' | 'allergies' | 'currentMedications', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setNewCustomer(prev => ({
      ...prev,
      [field]: items
    }));
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Set video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions or use file upload instead.');
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `id-document-${timestamp}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });
            setSelectedIDFile(file);
            stopCamera();
            toast.success('Photo captured successfully!');
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer.id);
              
              return (
                <div
                  key={customer.id}
                  className={`p-6 cursor-pointer hover:bg-gray-50 ${
                    selectedCustomer?.id === customer.id ? 'bg-primary-50 border-r-4 border-primary-500' : ''
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-primary-100 rounded-full p-3">
                        <User className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {customer.phone}
                          </span>
                          <span className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {customer.email}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>Total Spent: ₱{stats.totalSpent.toFixed(2)}</span>
                          <span>Purchases: {stats.totalPurchases}</span>
                          {stats.lastPurchase && (
                            <span>Last: {formatDistanceToNow(new Date(stats.lastPurchase), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {customer.isSeniorCitizen && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Percent className="h-3 w-3 mr-1" />
                          Senior Citizen
                        </span>
                      )}
                      {customer.isPWD && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <Percent className="h-3 w-3 mr-1" />
                          PWD
                        </span>
                      )}
                      {(customer.medicalHistory || customer.medical_history || []).length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Medical History
                        </span>
                      )}
                      {(customer.allergies || []).length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Allergies
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {selectedCustomer ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-primary-100 rounded-full p-4">
                  <User className="h-8 w-8 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedCustomer.name || `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'Unknown Customer'}
                  </h2>
                  <p className="text-gray-600">Customer Details</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'details'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <User className="h-4 w-4 inline mr-2" />
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'history'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <History className="h-4 w-4 inline mr-2" />
                    Purchase History
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Information</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedCustomer.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedCustomer.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Born: {selectedCustomer.dateOfBirth ? new Date(selectedCustomer.dateOfBirth).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medical History</label>
                    <div className="mt-2">
                      {selectedCustomer && (selectedCustomer.medicalHistory || selectedCustomer.medical_history || []).length > 0 ? (
                        <div className="space-y-1">
                          {(selectedCustomer.medicalHistory || selectedCustomer.medical_history || []).map((condition, index) => (
                            <span
                              key={index}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No medical history recorded</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Allergies</label>
                    <div className="mt-2">
                      {selectedCustomer && (selectedCustomer.allergies || []).length > 0 ? (
                        <div className="space-y-1">
                          {(selectedCustomer.allergies || []).map((allergy, index) => (
                            <span
                              key={index}
                              className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                            >
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {allergy}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No known allergies</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Medications</label>
                    <div className="mt-2">
                      {selectedCustomer && (selectedCustomer.currentMedications || selectedCustomer.current_medications || []).length > 0 ? (
                        <div className="space-y-1">
                          {(selectedCustomer.currentMedications || selectedCustomer.current_medications || []).map((medication, index) => (
                            <span
                              key={index}
                              className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                            >
                              {medication}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No current medications</p>
                      )}
                    </div>
                  </div>

                  {selectedCustomer.insuranceInfo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Insurance</label>
                      <p className="mt-1 text-sm text-gray-600">{selectedCustomer.insuranceInfo}</p>
                    </div>
                  )}

                  {/* Discount Eligibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Discount Eligibility</label>
                    <div className="mt-2 space-y-2">
                      {selectedCustomer.isSeniorCitizen && (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Senior Citizen
                          </span>
                          {selectedCustomer.seniorCitizenID && (
                            <span className="text-xs text-gray-600">ID: {selectedCustomer.seniorCitizenID}</span>
                          )}
                        </div>
                      )}
                      {selectedCustomer.isPWD && (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <Shield className="h-3 w-3 mr-1" />
                            PWD
                          </span>
                          {selectedCustomer.pwdId && (
                            <span className="text-xs text-gray-600">ID: {selectedCustomer.pwdId}</span>
                          )}
                        </div>
                      )}
                      {!selectedCustomer.isSeniorCitizen && !selectedCustomer.isPWD && (
                        <p className="text-sm text-gray-500">No special discounts available</p>
                      )}
                      {(selectedCustomer.isSeniorCitizen || selectedCustomer.isPWD) && (
                        <div className="flex items-center space-x-1 text-xs text-green-600">
                          <Percent className="h-3 w-3" />
                          <span>Eligible for 20% medication discount</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 flex items-center justify-center">
                      <Brain className="h-5 w-5 mr-2" />
                      Generate AI Medication Plan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Purchase Statistics */}
                  {(() => {
                    const stats = getCustomerStats(selectedCustomer.id);
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">₱{stats.totalSpent.toFixed(2)}</div>
                          <div className="text-sm text-blue-600">Total Spent</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{stats.totalPurchases}</div>
                          <div className="text-sm text-green-600">Total Purchases</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{stats.uniqueMedications}</div>
                          <div className="text-sm text-purple-600">Unique Medicines</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-sm font-bold text-orange-600">
                            {stats.lastPurchase ? formatDistanceToNow(new Date(stats.lastPurchase), { addSuffix: true }) : 'Never'}
                          </div>
                          <div className="text-sm text-orange-600">Last Purchase</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Purchase History List */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Purchase History
                    </h3>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(getCustomerPurchaseHistory(selectedCustomer.id) || []).map((purchase) => (
                        <div key={purchase.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{purchase.productName}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                <div className="flex items-center space-x-4">
                                  <span>Qty: {purchase.quantity}</span>
                                  <span>₱{purchase.price} each</span>
                                  <span className="font-medium">Total: ₱{purchase.total.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDistanceToNow(new Date(purchase.purchaseDate), { addSuffix: true })}</span>
                                  <span>({new Date(purchase.purchaseDate).toLocaleDateString()})</span>
                                </div>
                                {purchase.prescriptionNumber && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Prescription: {purchase.prescriptionNumber}
                                  </div>
                                )}
                                {purchase.notes && (
                                  <div className="text-xs text-gray-500 mt-1 italic">
                                    {purchase.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(getCustomerPurchaseHistory(selectedCustomer.id) || []).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No purchase history found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <UserPlus className="h-6 w-6 mr-2" />
                  Add New Customer
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCustomer({
                      medicalHistory: [],
                      allergies: [],
                      currentMedications: [],
                      isSeniorCitizen: false,
                      isPWD: false
                    });
                    setCustomerType('full');
                    setSelectedIDFile(null);
                    stopCamera();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Type Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Type</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                      customerType === 'full' 
                        ? 'border-primary-600 bg-primary-50 text-primary-900' 
                        : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="customer-type"
                        value="full"
                        checked={customerType === 'full'}
                        onChange={(e) => setCustomerType(e.target.value as 'full' | 'guest')}
                        className="sr-only"
                      />
                      <div className="flex flex-1">
                        <div className="flex flex-col">
                          <span className="block text-sm font-medium">Full Customer</span>
                          <span className="mt-1 flex items-center text-xs text-gray-500">
                            Complete profile with all information
                          </span>
                        </div>
                      </div>
                    </label>
                    
                    <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                      customerType === 'guest' 
                        ? 'border-primary-600 bg-primary-50 text-primary-900' 
                        : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="customer-type"
                        value="guest"
                        checked={customerType === 'guest'}
                        onChange={(e) => setCustomerType(e.target.value as 'full' | 'guest')}
                        className="sr-only"
                      />
                      <div className="flex flex-1">
                        <div className="flex flex-col">
                          <span className="block text-sm font-medium">Guest Customer</span>
                          <span className="mt-1 flex items-center text-xs text-gray-500">
                            Quick setup for Senior/PWD discounts only
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={newCustomer.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter full name"
                      />
                    </div>

                    {customerType === 'full' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                          <input
                            type="email"
                            value={newCustomer.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Enter email address"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                          <input
                            type="tel"
                            value={newCustomer.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="+1-555-0123"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                          <input
                            type="date"
                            value={newCustomer.dateOfBirth || ''}
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Insurance Information - Only for full customers */}
                {customerType === 'full' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Information</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
                      <input
                        type="text"
                        value={newCustomer.insuranceInfo || ''}
                        onChange={(e) => handleInputChange('insuranceInfo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter insurance provider (optional)"
                      />
                    </div>
                  </div>
                )}

                {/* Medical Information - Only for full customers */}
                {customerType === 'full' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                        <textarea
                          value={newCustomer.medicalHistory?.join(', ') || ''}
                          onChange={(e) => handleArrayInputChange('medicalHistory', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter medical conditions separated by commas (e.g., Diabetes, Hypertension)"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple conditions with commas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                        <textarea
                          value={newCustomer.allergies?.join(', ') || ''}
                          onChange={(e) => handleArrayInputChange('allergies', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter allergies separated by commas (e.g., Penicillin, Sulfa drugs)"
                          rows={2}
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple allergies with commas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
                        <textarea
                          value={newCustomer.currentMedications?.join(', ') || ''}
                          onChange={(e) => handleArrayInputChange('currentMedications', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter current medications separated by commas (e.g., Metformin, Lisinopril)"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple medications with commas</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discount Eligibility Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Percent className="h-5 w-5 mr-2" />
                    Discount Eligibility
                    {customerType === 'guest' && (
                      <span className="ml-2 text-sm text-orange-600 font-normal">(Required for Guest Customers)</span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {/* Senior Citizen Checkbox */}
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          id="senior-citizen"
                          type="checkbox"
                          checked={newCustomer.isSeniorCitizen || false}
                          onChange={(e) => handleInputChange('isSeniorCitizen', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="senior-citizen" className="text-sm font-medium text-gray-700">
                          Senior Citizen (60+ years old)
                        </label>
                        <p className="text-xs text-gray-500">Eligible for 20% discount on medications</p>
                      </div>
                    </div>

                    {/* Senior Citizen ID Field */}
                    {newCustomer.isSeniorCitizen && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Senior Citizen ID Number</label>
                        <input
                          type="text"
                          value={newCustomer.seniorCitizenID || ''}
                          onChange={(e) => handleInputChange('seniorCitizenID', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter Senior Citizen ID number"
                        />
                      </div>
                    )}

                    {/* PWD Checkbox */}
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          id="pwd"
                          type="checkbox"
                          checked={newCustomer.isPWD || false}
                          onChange={(e) => handleInputChange('isPWD', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="pwd" className="text-sm font-medium text-gray-700">
                          Person with Disability (PWD)
                        </label>
                        <p className="text-xs text-gray-500">Eligible for 20% discount on medications</p>
                      </div>
                    </div>

                    {/* PWD ID Field */}
                    {newCustomer.isPWD && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PWD ID Number</label>
                        <input
                          type="text"
                          value={newCustomer.pwdId || ''}
                          onChange={(e) => handleInputChange('pwdId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter PWD ID number"
                        />
                      </div>
                    )}

                    {/* ID Document Upload */}
                    {(newCustomer.isSeniorCitizen || newCustomer.isPWD) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ID Document Upload
                        </label>
                        
                        {!showCamera ? (
                          <div className="space-y-4">
                            {/* Upload Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Camera Option */}
                              <button
                                type="button"
                                onClick={startCamera}
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors"
                              >
                                <Camera className="h-12 w-12 text-gray-400 mb-2" />
                                <span className="text-sm font-medium text-gray-900">Take Photo</span>
                                <span className="text-xs text-gray-500">Use camera to capture ID</span>
                              </button>
                              
                              {/* File Upload Option */}
                              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors cursor-pointer">
                                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                                <span className="text-sm font-medium text-gray-900">Upload File</span>
                                <span className="text-xs text-gray-500">JPG, PNG, PDF up to 10MB</span>
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
                            
                            {/* Selected File Display */}
                            {selectedIDFile && (
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <Image className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">
                                    {selectedIDFile.name}
                                  </span>
                                  <span className="text-xs text-green-600">
                                    ({(selectedIDFile.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
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
                          </div>
                        ) : (
                          /* Camera Interface */
                          <div className="space-y-4">
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
                                  className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 flex items-center space-x-2 font-medium"
                                >
                                  <X className="h-5 w-5" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 text-center">
                              Position the ID document within the frame and click Capture
                            </p>
                          </div>
                        )}
                        
                        <p className="mt-2 text-xs text-gray-500">
                          Please capture or upload a clear photo of the {newCustomer.isSeniorCitizen ? 'Senior Citizen' : ''} 
                          {newCustomer.isSeniorCitizen && newCustomer.isPWD ? ' or ' : ''}
                          {newCustomer.isPWD ? 'PWD' : ''} ID for verification.
                        </p>
                        
                        {/* Hidden canvas for photo capture */}
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewCustomer({
                        medicalHistory: [],
                        allergies: [],
                        currentMedications: [],
                        isSeniorCitizen: false,
                        isPWD: false
                      });
                      setSelectedIDFile(null);
                      stopCamera();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {customerType === 'full' ? 'Add Customer' : 'Add Guest Customer'}
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

export default Customers;