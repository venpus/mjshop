import { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Truck, CreditCard, Warehouse, Globe, ChevronDown, ChevronRight, Store, FileText, PackageSearch, DollarSign, Users } from 'lucide-react';

type PageType = 'dashboard' | 'products' | 'orders' | 'shipping' | 'payment' | 'inventory' | 'purchase-orders' | 'shipping-history' | 'china-payment' | 'members';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isChinaExpanded, setIsChinaExpanded] = useState(true);
  const [isShopExpanded, setIsShopExpanded] = useState(true);

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <h1 className="text-purple-600">쇼핑몰 관리자</h1>
      </div>
      <nav className="px-4 space-y-1">
        {/* 대시보드 */}
        <button
          onClick={() => onPageChange('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === 'dashboard'
              ? 'bg-purple-50 text-purple-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>대시보드</span>
        </button>

        {/* 상품 관리 */}
        <button
          onClick={() => onPageChange('products')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === 'products'
              ? 'bg-purple-50 text-purple-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>상품 관리</span>
        </button>

        {/* 중국협업 메뉴 */}
        <div className="mt-1">
          <button
            onClick={() => setIsChinaExpanded(!isChinaExpanded)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
          >
            <Globe className="w-5 h-5" />
            <span className="flex-1 text-left">중국협업</span>
            {isChinaExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* 하위 메뉴 */}
          {isChinaExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => onPageChange('purchase-orders')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'purchase-orders'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>발주 관리</span>
              </button>
              <button
                onClick={() => onPageChange('shipping-history')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'shipping-history'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PackageSearch className="w-4 h-4" />
                <span>발송 내역</span>
              </button>
              <button
                onClick={() => onPageChange('china-payment')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'china-payment'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>결제</span>
              </button>
            </div>
          )}
        </div>

        {/* 쇼핑몰 관리 메뉴 */}
        <div className="mt-1">
          <button
            onClick={() => setIsShopExpanded(!isShopExpanded)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
          >
            <Store className="w-5 h-5" />
            <span className="flex-1 text-left">쇼핑몰 관리</span>
            {isShopExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* 쇼핑몰 관리 하위 메뉴 */}
          {isShopExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => onPageChange('orders')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'orders'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>주문 관리</span>
              </button>
              <button
                onClick={() => onPageChange('shipping')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'shipping'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>배송 관리</span>
              </button>
              <button
                onClick={() => onPageChange('payment')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'payment'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>결제 관리</span>
              </button>
              <button
                onClick={() => onPageChange('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'inventory'
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Warehouse className="w-4 h-4" />
                <span>재고 관리</span>
              </button>
            </div>
          )}
        </div>

        {/* 회원 관리 */}
        <button
          onClick={() => onPageChange('members')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === 'members'
              ? 'bg-purple-50 text-purple-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>회원 관리</span>
        </button>
      </nav>
    </aside>
  );
}