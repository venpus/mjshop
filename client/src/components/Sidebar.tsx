import { useState } from "react";
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  CreditCard,
  Warehouse,
  Globe,
  ChevronDown,
  ChevronRight,
  Store,
  FileText,
  PackageSearch,
  DollarSign,
  Users,
  Image as ImageIcon,
  ClipboardList,
  FileSpreadsheet,
  UserCog,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Box,
  Hammer,
  Folder,
} from "lucide-react";

type PageType =
  | "dashboard"
  | "products"
  | "orders"
  | "shipping"
  | "payment"
  | "inventory"
  | "purchase-orders"
  | "shipping-history"
  | "china-payment"
  | "members"
  | "gallery"
  | "china-warehouse"
  | "invoice"
  | "admin-account"
  | "materials"
  | "packaging-work"
  | "projects";

interface SidebarProps {
  currentPage: PageType | 'purchase-order-detail';
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onPageChange: (page: PageType) => void;
}

export function Sidebar({
  currentPage,
  isCollapsed = false,
  onToggleCollapse,
  onPageChange,
}: SidebarProps) {
  const { user } = useAuth();
  // A, S 등급 관리자만 표시
  const isAdminLevelA = user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin';
  const [isChinaExpanded, setIsChinaExpanded] = useState(true);
  const [isShopExpanded, setIsShopExpanded] = useState(true);

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-full flex flex-col`}>
      <div className={`p-6 ${isCollapsed ? 'px-4' : ''} flex items-center justify-between`}>
        {!isCollapsed && <h1 className="text-purple-600 whitespace-nowrap">쇼핑몰 관리자</h1>}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
            title={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {isCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>
      <nav className={`px-4 space-y-1 flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
        {/* 대시보드 */}
        <button
          onClick={() => onPageChange("dashboard")}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            currentPage === "dashboard"
              ? "bg-purple-50 text-purple-600"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          title={isCollapsed ? "대시보드" : undefined}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>대시보드</span>}
        </button>

        {/* 중국협업 메뉴 */}
        <div className="mt-1">
          <button
            onClick={() => setIsChinaExpanded(!isChinaExpanded)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
            title={isCollapsed ? "중국협업" : undefined}
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">중국협업</span>
                {isChinaExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>

          {/* 하위 메뉴 */}
          {!isCollapsed && isChinaExpanded && (
            <div className="ml-4 mt-1 space-y-1">

              상품 관리 (A, S 등급 관리자만 표시)
              {isAdminLevelA && (
                <button
                  onClick={() => onPageChange("products")}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "products"
                      ? "bg-purple-50 text-purple-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? "상품 관리" : undefined}
                >
                  <Package className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>상품 관리</span>}
                </button>
              )}
              {/* 발주 관리 (A, S 등급 관리자만 표시) */}
              {isAdminLevelA && (
                <button
                  onClick={() => onPageChange("purchase-orders")}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "purchase-orders"
                      ? "bg-purple-50 text-purple-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? "발주 관리" : undefined}
                >
                  <FileText className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>발주 관리</span>}
                </button>
              )}
              <button
                onClick={() => onPageChange("shipping-history")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "shipping-history"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "패킹리스트" : undefined}
              >
                <PackageSearch className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>패킹리스트</span>}
              </button>
              <button
                onClick={() => onPageChange("china-payment")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "china-payment"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "결제 내역(구현중)" : undefined}
              >
                <DollarSign className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>결제 내역(구현중)</span>}
              </button>
              <button
                onClick={() => onPageChange("gallery")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "gallery"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "갤러리(구현중)" : undefined}
              >
                <ImageIcon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>갤러리(구현중)</span>}
              </button>
              <button
                onClick={() => onPageChange("china-warehouse")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "china-warehouse"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "중국 입출고 현황(구현중)" : undefined}
              >
                <ClipboardList className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>중국 입출고 현황(구현중)</span>}
              </button>
              <button
                onClick={() => onPageChange("invoice")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "invoice"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "정상 인보이스(구현중)" : undefined}
              >
                <FileSpreadsheet className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>정상 인보이스(구현중)</span>}
              </button>
              <button
                onClick={() => onPageChange("materials")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "materials"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "부자재 관리" : undefined}
              >
                <Box className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>부자재 관리</span>}
              </button>
              <button
                onClick={() => onPageChange("packaging-work")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "packaging-work"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "포장작업 관리" : undefined}
              >
                <Hammer className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>포장작업 관리(구현중)</span>}
              </button>
              <button
                onClick={() => onPageChange("projects")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "projects"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "프로젝트 관리" : undefined}
              >
                <Folder className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>프로젝트 관리(구현중)</span>}
              </button>
            </div>
          )}
        </div>

        {/* 쇼핑몰 관리 메뉴 */}
        <div className="mt-1">
          <button
            onClick={() => setIsShopExpanded(!isShopExpanded)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
            title={isCollapsed ? "쇼핑몰 관리" : undefined}
          >
            <Store className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">쇼핑몰 관리</span>
                {isShopExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>

          {/* 쇼핑몰 관리 하위 메뉴 */}
          {!isCollapsed && isShopExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => onPageChange("orders")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "orders"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "주문 관리" : undefined}
              >
                <ShoppingCart className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>주문 관리</span>}
              </button>
              <button
                onClick={() => onPageChange("shipping")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "shipping"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "배송 관리" : undefined}
              >
                <Truck className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>배송 관리</span>}
              </button>
              <button
                onClick={() => onPageChange("payment")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "payment"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "결제 관리" : undefined}
              >
                <CreditCard className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>결제 관리</span>}
              </button>
              <button
                onClick={() => onPageChange("inventory")}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                  currentPage === "inventory"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title={isCollapsed ? "재고 관리" : undefined}
              >
                <Warehouse className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isCollapsed && <span>재고 관리</span>}
              </button>
            </div>
          )}
        </div>

        {/* 회원 관리 */}
        <button
          onClick={() => onPageChange("members")}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            currentPage === "members"
              ? "bg-purple-50 text-purple-600"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          title={isCollapsed ? "회원 관리" : undefined}
        >
          <Users className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>회원 관리</span>}
        </button>

        {/* 관리자 계정 관리 */}
        <button
          onClick={() => onPageChange("admin-account")}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
            currentPage === "admin-account"
              ? "bg-purple-50 text-purple-600"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          title={isCollapsed ? "관리자 계정 관리" : undefined}
        >
          <UserCog className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>관리자 계정 관리</span>}
        </button>
      </nav>
    </aside>
  );
}