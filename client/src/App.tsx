import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Shipping } from './components/Shipping';
import { Payment } from './components/Payment';
import { Inventory } from './components/Inventory';
import { PurchaseOrders } from './components/PurchaseOrders';
import { PurchaseOrderDetail } from './components/PurchaseOrderDetail';
import { ShippingHistory } from './components/ShippingHistory';
import { ChinaPayment } from './components/ChinaPayment';
import { Members } from './components/Members';
import { Gallery } from './components/Gallery';
import { ChinaWarehouse } from './components/ChinaWarehouse';
import { Invoice } from './components/Invoice';
import { AdminAccount } from './components/AdminAccount';

type PageType = 'dashboard' | 'products' | 'orders' | 'shipping' | 'payment' | 'inventory' | 'purchase-orders' | 'purchase-order-detail' | 'shipping-history' | 'china-payment' | 'members' | 'gallery' | 'china-warehouse' | 'invoice' | 'admin-account';

type Language = 'ko' | 'en' | 'zh';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'cost' | 'factory' | 'work' | 'delivery' | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('ko');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const languages = {
    ko: { name: '한국어', flag: '🇰🇷' },
    en: { name: 'English', flag: '🇺🇸' },
    zh: { name: '中文', flag: '🇨🇳' },
  };

  const handleViewOrderDetail = (orderId: string, tab?: 'cost' | 'factory' | 'work' | 'delivery') => {
    setSelectedOrderId(orderId);
    setSelectedTab(tab);
    setCurrentPage('purchase-order-detail');
  };

  const handleBackToPurchaseOrders = () => {
    setSelectedOrderId(null);
    setSelectedTab(undefined);
    setCurrentPage('purchase-orders');
  };

  return (
    <div className="flex h-screen min-h-[1080px] bg-gray-50">
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
      <main className="flex-1 overflow-y-auto min-h-[1080px]">
        {/* Header with Menu Toggle */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 lg:px-8 lg:py-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>

          <div className="flex-1"></div>

          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Globe className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-700">{languages[language].flag} {languages[language].name}</span>
            </button>

            {isLanguageDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsLanguageDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {(Object.keys(languages) as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                        language === lang ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      } ${
                        lang === 'ko' ? 'rounded-t-lg' : lang === 'zh' ? 'rounded-b-lg' : ''
                      }`}
                    >
                      <span className="text-base">{languages[lang].flag}</span>
                      <span>{languages[lang].name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'products' && <Products />}
        {currentPage === 'orders' && <Orders />}
        {currentPage === 'shipping' && <Shipping />}
        {currentPage === 'payment' && <Payment />}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'purchase-orders' && <PurchaseOrders onViewDetail={handleViewOrderDetail} />}
        {currentPage === 'purchase-order-detail' && selectedOrderId && <PurchaseOrderDetail orderId={selectedOrderId} onBack={handleBackToPurchaseOrders} initialTab={selectedTab} />}
        {currentPage === 'shipping-history' && <ShippingHistory />}
        {currentPage === 'china-payment' && <ChinaPayment />}
        {currentPage === 'members' && <Members />}
        {currentPage === 'gallery' && <Gallery />}
        {currentPage === 'china-warehouse' && <ChinaWarehouse />}
        {currentPage === 'invoice' && <Invoice />}
        {currentPage === 'admin-account' && <AdminAccount />}
      </main>
    </div>
  );
}