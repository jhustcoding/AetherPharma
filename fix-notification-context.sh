#!/bin/bash
# Script to fix NotificationContext.tsx ownership and update it

echo "This script will fix the NotificationContext.tsx file ownership and update it."
echo "You'll need to enter your sudo password."

# Fix ownership
sudo chown $(whoami):staff frontend/src/contexts/NotificationContext.tsx

# Update the file
cat > frontend/src/contexts/NotificationContext.tsx << 'EOF'
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { OnlineOrder } from '../types';
import { toast } from 'react-hot-toast';
import { config } from '../config';

interface NotificationContextType {
  onlineOrders: OnlineOrder[];
  unreadOrderCount: number;
  fetchOnlineOrders: () => Promise<void>;
  markOrderAsRead: (orderId: string) => void;
  clearAllOrders: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);

  const fetchOnlineOrders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.API_BASE_URL}/orders?status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const orders = await response.json();
        setOnlineOrders(orders);
        
        // Count unread orders
        const unreadCount = orders.filter((order: OnlineOrder) => 
          order.status === 'pending' || order.status === 'processing'
        ).length;
        
        setUnreadOrderCount(unreadCount);
        
        // Show notification for new orders
        if (unreadCount > 0) {
          toast.success(`You have ${unreadCount} new online order(s)!`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch online orders:', error);
    }
  };

  const markOrderAsRead = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${config.API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'processing' })
      });
      
      // Update local state
      setOnlineOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status: 'processing' } : order
        )
      );
      
      // Update unread count
      const newUnreadCount = onlineOrders.filter(order => 
        order.id !== orderId && (order.status === 'pending' || order.status === 'processing')
      ).length;
      
      setUnreadOrderCount(newUnreadCount);
    } catch (error) {
      console.error('Failed to mark order as read:', error);
    }
  };

  const clearAllOrders = () => {
    setOnlineOrders([]);
    setUnreadOrderCount(0);
  };

  // Poll for new orders every 30 seconds
  useEffect(() => {
    fetchOnlineOrders();
    const interval = setInterval(fetchOnlineOrders, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Simulate receiving new orders for demo
  useEffect(() => {
    const demoInterval = setInterval(() => {
      const randomChance = Math.random();
      if (randomChance > 0.7) { // 30% chance of new order
        const newOrder: OnlineOrder = {
          id: `order-${Date.now()}`,
          orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
          customer: {
            id: `cust-${Date.now()}`,
            name: ['John Doe', 'Jane Smith', 'Robert Johnson', 'Maria Garcia'][Math.floor(Math.random() * 4)],
            email: 'customer@email.com',
            phone: '+1234567890'
          },
          items: [
            {
              id: `item-${Date.now()}`,
              productId: 'prod-1',
              productName: ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Vitamin C 1000mg'][Math.floor(Math.random() * 3)],
              quantity: Math.floor(Math.random() * 5) + 1,
              price: Math.random() * 50 + 10,
              subtotal: 0,
              prescriptionRequired: Math.random() > 0.5
            }
          ],
          totalAmount: Math.random() * 200 + 50,
          status: 'pending',
          paymentMethod: ['cash', 'card', 'gcash'][Math.floor(Math.random() * 3)],
          prescriptionImages: [],
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        newOrder.items[0].subtotal = newOrder.items[0].price * newOrder.items[0].quantity;
        
        setOnlineOrders(prev => [newOrder, ...prev]);
        setUnreadOrderCount(prev => prev + 1);
        
        // Show notification
        toast.success(`New order from ${newOrder.customer.name}!`, {
          duration: 5000,
          position: 'top-right'
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(demoInterval);
  }, []);

  // Also try to fetch real orders from API
  useEffect(() => {
    const fetchRealOrders = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${config.API_BASE_URL}/orders?status=pending,processing`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const realOrders = await response.json();
          if (realOrders && realOrders.length > 0) {
            setOnlineOrders(prev => {
              // Merge real orders with demo orders, avoiding duplicates
              const existingIds = new Set(prev.map(o => o.id));
              const newOrders = realOrders.filter((order: OnlineOrder) => !existingIds.has(order.id));
              return [...newOrders, ...prev];
            });
          }
        }
      } catch (error) {
        // Silently fail - demo orders will still work
        console.log('Could not fetch real orders, using demo mode');
      }
    };

    fetchRealOrders();
    const interval = setInterval(fetchRealOrders, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{
      onlineOrders,
      unreadOrderCount,
      fetchOnlineOrders,
      markOrderAsRead,
      clearAllOrders
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
EOF

echo "File updated successfully!"