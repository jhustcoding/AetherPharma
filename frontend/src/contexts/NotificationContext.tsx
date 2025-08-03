import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerId: string; // Links to customer database
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  paymentMethod: 'card' | 'cod' | 'gcash' | 'maya';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderDate: string;
  estimatedTime?: string;
  priority: 'normal' | 'urgent';
  notes?: string;
}

interface NotificationContextType {
  notifications: OnlineOrder[];
  unreadCount: number;
  addNotification: (order: OnlineOrder) => void;
  markAsRead: (orderId: string) => void;
  markAllAsRead: () => void;
  updateOrderStatus: (orderId: string, status: OnlineOrder['status']) => void;
  removeNotification: (orderId: string) => void;
  getOrderById: (orderId: string) => OnlineOrder | undefined;
  playNotificationSound: () => void;
  addDemoOrder: () => void;
  clearAllOrders: () => void;
  getCustomerById: (customerId: string) => any;
  addNewCustomerFromOrder: (order: OnlineOrder) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<OnlineOrder[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [customers, setCustomers] = useState<any[]>([]);

  // Load customers from API
  const loadCustomers = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/customers');
      if (response.ok) {
        const customersData = await response.json();
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  // Load real orders from API
  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/v1/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const ordersData = await response.json();
        // Convert backend order format to frontend format
        const convertedOrders = ordersData.map((order: any) => ({
          id: order.id,
          orderNumber: order.order_number || `ORD-${order.id}`,
          customerId: order.customer_id,
          customerName: order.customer_name || 'Unknown Customer',
          customerEmail: order.customer_email || '',
          customerPhone: order.customer_phone || '',
          items: order.items || [],
          total: order.total || 0,
          status: order.status || 'pending',
          orderType: order.order_type || 'delivery',
          deliveryAddress: order.delivery_address,
          paymentMethod: order.payment_method || 'cod',
          paymentStatus: order.payment_status || 'pending',
          orderDate: order.created_at || new Date().toISOString(),
          estimatedTime: order.estimated_time || '30 minutes',
          priority: order.priority || 'normal',
          notes: order.notes
        }));
        setNotifications(convertedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      // Fall back to existing localStorage data if API fails
    }
  };

  // Load real data from API on mount
  useEffect(() => {
    loadCustomers();
    loadOrders();
    
    const savedReadNotifications = localStorage.getItem('read_notifications');
    if (savedReadNotifications) {
      try {
        setReadNotifications(new Set(JSON.parse(savedReadNotifications)));
      } catch (error) {
        console.error('Error loading read notifications:', error);
      }
    }
  }, []);

  // Save read notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(Array.from(readNotifications)));
  }, [readNotifications]);

  // Refresh orders periodically to get real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);


  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const addNotification = (order: OnlineOrder) => {
    setNotifications(prev => [order, ...prev]);
    playNotificationSound();
    toast.success(`New online order from ${order.customerName}`, {
      duration: 5000,
      icon: '🛒',
    });
  };

  const markAsRead = (orderId: string) => {
    setReadNotifications(prev => new Set(Array.from(prev).concat([orderId])));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  const updateOrderStatus = async (orderId: string, status: OnlineOrder['status']) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
        
        const order = notifications.find(n => n.id === orderId);
        if (order) {
          toast.success(`Order ${order.orderNumber} status updated to ${status}`);
        }
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const removeNotification = (orderId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== orderId));
    setReadNotifications(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.delete(orderId);
      return newSet;
    });
  };

  const getOrderById = (orderId: string) => {
    return notifications.find(n => n.id === orderId);
  };

  const addDemoOrder = () => {
    // This functionality is disabled - orders now come from real API
    toast('Demo orders disabled. Orders now load from database.', {
      icon: 'ℹ️',
    });
  };

  const clearAllOrders = () => {
    setNotifications([]);
    setReadNotifications(new Set());
    localStorage.removeItem('read_notifications');
    toast.success('All orders cleared from view');
  };

  const getCustomerById = (customerId: string) => {
    return customers.find(customer => customer.id === customerId);
  };

  const addNewCustomerFromOrder = (order: OnlineOrder) => {
    // In a real app, this would add the customer to the database
    const existingCustomer = customers.find(c => c.email === order.customerEmail);
    if (!existingCustomer) {
      toast(`New customer ${order.customerName} from online order can be added to database`, {
        icon: '👤',
      });
    }
  };

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    updateOrderStatus,
    removeNotification,
    getOrderById,
    playNotificationSound,
    addDemoOrder,
    clearAllOrders,
    getCustomerById,
    addNewCustomerFromOrder
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};