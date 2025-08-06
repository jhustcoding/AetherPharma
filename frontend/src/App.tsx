import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import Login from './components/Login';
import Analytics from './components/Analytics';
import Customers from './components/Customers';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Suppliers from './components/Suppliers';
import NotificationPanel from './components/NotificationPanel';
import { LogOut, User, Shield, Bell } from 'lucide-react';

type Page = 'analytics' | 'customers' | 'inventory' | 'orders' | 'suppliers';

function AppContent() {
  const { user, logout, hasPermission, isEmployee, isAdmin } = useAuth();
  const { unreadCount } = useNotification();
  const [currentPage, setCurrentPage] = useState<Page>('orders');
  const [showNotifications, setShowNotifications] = useState(false);

  const navigation = [
    { id: 'orders' as Page, name: 'Orders', icon: '🛒', permission: 'orders', action: 'read' },
    { id: 'customers' as Page, name: 'Customers', icon: '👥', permission: 'customers', action: 'read' },
    { id: 'inventory' as Page, name: 'Inventory', icon: '📦', permission: 'inventory', action: 'read' },
    { id: 'suppliers' as Page, name: 'Suppliers', icon: '🏢', permission: 'products', action: 'read' },
    { id: 'analytics' as Page, name: 'Analytics', icon: '📊', permission: 'analytics', action: 'read' },
  ].filter(item => hasPermission(item.permission, item.action));

  const renderPage = () => {
    switch (currentPage) {
      case 'analytics':
        return <Analytics />;
      case 'customers':
        return <Customers />;
      case 'inventory':
        return <Inventory />;
      case 'suppliers':
        return <Suppliers />;
      case 'orders':
        return <Orders />;
      default:
        return <Orders />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">💊 AetherPharma</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentPage === item.id
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 capitalize">{user?.role}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{user?.firstName}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-none mx-auto">
          {renderPage()}
        </div>
      </main>
      
      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </div>
  );
}

function AppWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AppContent />;
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppWrapper />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;