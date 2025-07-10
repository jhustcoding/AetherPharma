import React, { useState } from 'react';
import { Search, Plus, User, Phone, Mail, Calendar, AlertTriangle, Brain, History, Package, Clock, X, Save, UserPlus } from 'lucide-react';
import { Customer, CustomerPurchaseHistory } from '../types';
import { mockCustomers, mockCustomerPurchaseHistory } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [purchaseHistory] = useState<CustomerPurchaseHistory[]>(mockCustomerPurchaseHistory);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    medicalHistory: [],
    allergies: [],
    currentMedications: []
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const getCustomerPurchaseHistory = (customerId: string) => {
    return purchaseHistory
      .filter(purchase => purchase.customerId === customerId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  };

  const getCustomerStats = (customerId: string) => {
    const customerPurchases = getCustomerPurchaseHistory(customerId);
    const totalSpent = customerPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalPurchases = customerPurchases.length;
    const lastPurchase = customerPurchases[0]?.purchaseDate;
    
    // Get unique medications
    const uniqueMedications = [...new Set(customerPurchases.map(p => p.productName))];
    
    return {
      totalSpent,
      totalPurchases,
      lastPurchase,
      uniqueMedications: uniqueMedications.length
    };
  };

  const handleAddCustomer = () => {
    // Validation
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone || !newCustomer.dateOfBirth) {
      toast.error('Please fill in all required fields (Name, Email, Phone, Date of Birth)');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomer.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(newCustomer.phone.replace(/[\s\-\(\)]/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Check for duplicate email
    if (customers.some(customer => customer.email.toLowerCase() === newCustomer.email!.toLowerCase())) {
      toast.error('A customer with this email already exists');
      return;
    }

    // Generate new customer ID and QR code
    const newId = `${customers.length + 1}`;
    const qrCode = `CUST${String(customers.length + 1).padStart(3, '0')}`;

    const customerToAdd: Customer = {
      id: newId,
      name: newCustomer.name!,
      email: newCustomer.email!,
      phone: newCustomer.phone!,
      dateOfBirth: newCustomer.dateOfBirth!,
      medicalHistory: newCustomer.medicalHistory || [],
      allergies: newCustomer.allergies || [],
      currentMedications: newCustomer.currentMedications || [],
      insuranceInfo: newCustomer.insuranceInfo,
      createdAt: new Date().toISOString(),
      qrCode: qrCode
    };

    setCustomers([...customers, customerToAdd]);
    setShowAddModal(false);
    setNewCustomer({
      medicalHistory: [],
      allergies: [],
      currentMedications: []
    });
    toast.success(`Customer ${customerToAdd.name} added successfully! QR Code: ${qrCode}`);
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
                        <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
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
                      {customer.medicalHistory.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Medical History
                        </span>
                      )}
                      {customer.allergies.length > 0 && (
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
                  <h2 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h2>
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
                        Born: {new Date(selectedCustomer.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medical History</label>
                    <div className="mt-2">
                      {selectedCustomer.medicalHistory.length > 0 ? (
                        <div className="space-y-1">
                          {selectedCustomer.medicalHistory.map((condition, index) => (
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
                      {selectedCustomer.allergies.length > 0 ? (
                        <div className="space-y-1">
                          {selectedCustomer.allergies.map((allergy, index) => (
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
                      {selectedCustomer.currentMedications.length > 0 ? (
                        <div className="space-y-1">
                          {selectedCustomer.currentMedications.map((medication, index) => (
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
                      {getCustomerPurchaseHistory(selectedCustomer.id).map((purchase) => (
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
                      
                      {getCustomerPurchaseHistory(selectedCustomer.id).length === 0 && (
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
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
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
                  </div>
                </div>

                {/* Insurance Information */}
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

                {/* Medical Information */}
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

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Add Customer
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