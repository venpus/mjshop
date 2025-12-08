import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Shipping } from './components/Shipping';
import { Payment } from './components/Payment';
import { Inventory } from './components/Inventory';
import { PurchaseOrders } from './components/PurchaseOrders';
import { ShippingHistory } from './components/ShippingHistory';
import { ChinaPayment } from './components/ChinaPayment';
import { Members } from './components/Members';

type PageType = 'dashboard' | 'products' | 'orders' | 'shipping' | 'payment' | 'inventory' | 'purchase-orders' | 'shipping-history' | 'china-payment' | 'members';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header with Menu Toggle */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 lg:px-8 lg:py-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'products' && <Products />}
        {currentPage === 'orders' && <Orders />}
        {currentPage === 'shipping' && <Shipping />}
        {currentPage === 'payment' && <Payment />}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'purchase-orders' && <PurchaseOrders />}
        {currentPage === 'shipping-history' && <ShippingHistory />}
        {currentPage === 'china-payment' && <ChinaPayment />}
        {currentPage === 'members' && <Members />}
      </main>
    </div>
  );
}