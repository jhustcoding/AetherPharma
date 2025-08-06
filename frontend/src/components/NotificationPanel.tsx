import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNotification, OnlineOrder } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bell, 
  X, 
  Clock, 
  User, 
  MapPin, 
  CreditCard, 
  Package,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Truck,
  ShoppingBag,
  Eye,
  Check,
  AlertTriangle
} from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { onlineOrders, unreadOrderCount, markOrderAsRead, clearAllOrders } = useNotification();
  const { hasPermission } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);

  if (!isOpen) return null;

  const getStatusColor = (status: OnlineOrder['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OnlineOrder['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'ready': return <Check className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: OnlineOrder['priority']) => {
    return priority === 'urgent' ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500';
  };

  const handleOrderClick = (order: OnlineOrder) => {
    markAsRead(order.id);
    setSelectedOrder(order);
  };

  const handleStatusUpdate = (orderId: string, newStatus: OnlineOrder['status']) => {
    updateOrderStatus(orderId, newStatus);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const canManageOrders = hasPermission('orders', 'update');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-96 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Online Orders</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto">
          {onlineOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingBag className="w-12 h-12 mb-4 opacity-50" />
              <p>No online orders yet</p>
              <p className="text-sm">New orders will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {onlineOrders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${getPriorityColor(order.priority)}`}
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-sm">{order.orderNumber}</h3>
                      {order.priority === 'urgent' && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <User className="w-3 h-3" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-3 h-3" />
                      <span>₱{order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {order.orderType === 'delivery' ? <Truck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      <span className="capitalize">{order.orderType}</span>
                      {order.estimatedTime && (
                        <>
                          <Clock className="w-3 h-3 ml-2" />
                          <span>{order.estimatedTime}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(order.orderDate).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Order Number</h4>
                    <p className="text-sm">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Status</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 w-fit ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="capitalize">{selectedOrder.status}</span>
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Customer</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.customerEmail}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedOrder.customerPhone}</span>
                    </div>
                    
                    {/* Additional Customer Information from Database */}
                    {(() => {
                      const customer = getCustomerById(selectedOrder.customerId);
                      if (customer) {
                        return (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">From Customer Database:</div>
                            {customer.dateOfBirth && (
                              <div className="text-xs text-gray-600">
                                <strong>DOB:</strong> {new Date(customer.dateOfBirth).toLocaleDateString()}
                              </div>
                            )}
                            {customer.allergies && customer.allergies.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <strong>Allergies:</strong> {customer.allergies.join(', ')}
                              </div>
                            )}
                            {customer.medicalHistory && customer.medicalHistory.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <strong>Medical History:</strong> {customer.medicalHistory.join(', ')}
                              </div>
                            )}
                            {customer.currentMedications && customer.currentMedications.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <strong>Current Medications:</strong> {customer.currentMedications.join(', ')}
                              </div>
                            )}
                            {customer.insuranceInfo && (
                              <div className="text-xs text-gray-600">
                                <strong>Insurance:</strong> {customer.insuranceInfo}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              <strong>Customer ID:</strong> {selectedOrder.customerId}
                            </div>
                            <button 
                              onClick={() => {
                                toast('Customer profile integration - would navigate to customer details', {
                                  icon: 'ℹ️',
                                });
                              }}
                              className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                            >
                              View Customer Profile
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-red-500">
                            Customer not found in database (ID: {selectedOrder.customerId})
                          </div>
                          <button 
                            onClick={() => {
                              toast('Would add new customer to database from order info', {
                                icon: '➕',
                              });
                            }}
                            className="mt-1 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
                          >
                            Add to Customer Database
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 font-medium">
                      <div className="flex items-center justify-between">
                        <span>Total</span>
                        <span>₱{selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Order Type</h4>
                    <div className="flex items-center space-x-1 text-sm">
                      {selectedOrder.orderType === 'delivery' ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      <span className="capitalize">{selectedOrder.orderType}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Payment</h4>
                    <div className="flex items-center space-x-1 text-sm">
                      <CreditCard className="w-4 h-4" />
                      <span className="capitalize">{selectedOrder.paymentMethod}</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedOrder.deliveryAddress && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Delivery Address</h4>
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                      <span>{selectedOrder.deliveryAddress}</span>
                    </div>
                  </div>
                )}

                {selectedOrder.notes && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Notes</h4>
                    <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Status Update */}
                {canManageOrders && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Update Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['confirmed', 'preparing', 'ready', 'completed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(selectedOrder.id, status as OnlineOrder['status'])}
                          disabled={selectedOrder.status === status}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            selectedOrder.status === status
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3 h-3" />
                    <span>Ordered: {new Date(selectedOrder.orderDate).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;