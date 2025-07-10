import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Analytics from './components/Analytics';
import Customers from './components/Customers';
import Inventory from './components/Inventory';
import InventoryMovementAnalysis from './components/InventoryMovementAnalysis';

type Page = 'analytics' | 'customers' | 'inventory' | 'movement-analysis';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('analytics');

  const navigation = [
    { id: 'analytics' as Page, name: 'Analytics', icon: '📊' },
    { id: 'customers' as Page, name: 'Customers', icon: '👥' },
    { id: 'inventory' as Page, name: 'Inventory', icon: '📦' },
    { id: 'movement-analysis' as Page, name: 'Movement Analysis', icon: '📈' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'analytics':
        return <Analytics />;
      case 'customers':
        return <Customers />;
      case 'inventory':
        return <Inventory />;
      case 'movement-analysis':
        return <InventoryMovementAnalysis />;
      default:
        return <Analytics />;
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
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
