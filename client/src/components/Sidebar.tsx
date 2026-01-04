import { useState } from "react";
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePermission } from '../contexts/PermissionContext';
import {
  LayoutDashboard,
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
  Shield,
} from "lucide-react";

type PageType =
  | "dashboard"
  | "products"
  | "orders"
  | "shipping"
  | "payment"
  | "payment-history"
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
  | "projects"
  | "permissions";

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
  const { t } = useLanguage();
  const { hasPermission } = usePermission();
  // 권한 체크 변수
  const isLevelA = user?.level === 'A-SuperAdmin';
  const isLevelB0 = user?.level === 'B0: 중국Admin';
  const isLevelC0 = user?.level === 'C0: 한국Admin';
  // A, B0, C0 레벨 관리자 (중국협업 메뉴 접근 가능) - 권한 시스템 적용 시 변경 필요
  const canAccessChinaCooperation = isLevelA || isLevelB0 || isLevelC0;
  // A, C0 레벨 관리자 (쇼핑몰 관리 메뉴 접근 가능)
  const canAccessShopManagement = isLevelA || isLevelC0;
  const [isChinaExpanded, setIsChinaExpanded] = useState(true);
  const [isShopExpanded, setIsShopExpanded] = useState(true);

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} h-full flex flex-col`}>
      <div className={`p-6 ${isCollapsed ? 'px-4' : ''} flex items-center justify-between`}>
        {!isCollapsed && <h1 className="text-purple-600 whitespace-nowrap">{t('menu.adminTitle')}</h1>}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
            title={isCollapsed ? t('menu.sidebarExpand') : t('menu.sidebarCollapse')}
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
          title={isCollapsed ? t('menu.dashboard') : undefined}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>{t('menu.dashboard')}</span>}
        </button>

        {/* 중국협업 메뉴 (A, B0, C0 레벨만 표시) */}
        {canAccessChinaCooperation && (
          <div className="mt-1">
            <button
              onClick={() => setIsChinaExpanded(!isChinaExpanded)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
              title={isCollapsed ? t('menu.chinaCooperation') : undefined}
            >
              <Globe className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{t('menu.chinaCooperation')}</span>
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
                {/* 발주 관리 */}
                {hasPermission('purchase-orders', 'read') && (
                  <button
                    onClick={() => onPageChange("purchase-orders")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "purchase-orders"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.purchaseOrders') : undefined}
                  >
                    <FileText className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.purchaseOrders')}</span>}
                  </button>
                )}
                {/* 패킹리스트 */}
                {hasPermission('shipping-history', 'read') && (
                  <button
                    onClick={() => onPageChange("shipping-history")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "shipping-history"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.packingList') : undefined}
                  >
                    <PackageSearch className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.packingList')}</span>}
                  </button>
                )}
                {/* 결제내역 */}
                {hasPermission('payment-history', 'read') && (
                  <button
                    onClick={() => onPageChange("payment-history")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "payment-history"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? "결제내역" : undefined}
                  >
                    <FileText className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>결제내역</span>}
                  </button>
                )}
                {/* 갤러리 */}
                {hasPermission('gallery', 'read') && (
                  <button
                    onClick={() => onPageChange("gallery")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "gallery"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.gallery') : undefined}
                  >
                    <ImageIcon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.gallery')}</span>}
                  </button>
                )}
                {/* 자재 */}
                {hasPermission('materials', 'read') && (
                  <button
                    onClick={() => onPageChange("materials")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "materials"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.materials') : undefined}
                  >
                    <Box className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.materials')}</span>}
                  </button>
                )}
                {/* 프로젝트 */}
                {hasPermission('projects', 'read') && (
                  <button
                    onClick={() => onPageChange("projects")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "projects"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.projects') : undefined}
                  >
                    <Folder className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.projects')}</span>}
                  </button>
                )}
                {/* 중국창고 */}
                {hasPermission('china-warehouse', 'read') && (
                  <button
                    onClick={() => onPageChange("china-warehouse")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "china-warehouse"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.chinaWarehouse') : undefined}
                  >
                    <ClipboardList className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.chinaWarehouse')}</span>}
                  </button>
                )}
                {/* 송장 */}
                {hasPermission('invoice', 'read') && (
                  <button
                    onClick={() => onPageChange("invoice")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "invoice"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.invoice') : undefined}
                  >
                    <FileSpreadsheet className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.invoice')}</span>}
                  </button>
                )}
                {/* 포장작업 */}
                {hasPermission('packaging-work', 'read') && (
                  <button
                    onClick={() => onPageChange("packaging-work")}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                      currentPage === "packaging-work"
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    title={isCollapsed ? t('menu.packagingWork') : undefined}
                  >
                    <Hammer className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && <span>{t('menu.packagingWork')}</span>}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 쇼핑몰 관리 메뉴 (A, C0 레벨만 표시) */}
        {canAccessShopManagement && (
          <div className="mt-1">
            <button
              onClick={() => setIsShopExpanded(!isShopExpanded)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
              title={isCollapsed ? t('menu.shopManagement') : undefined}
            >
              <Store className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{t('menu.shopManagement')}</span>
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
                  title={isCollapsed ? t('menu.orders') : undefined}
                >
                  <ShoppingCart className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>{t('menu.orders')}</span>}
                </button>
                <button
                  onClick={() => onPageChange("shipping")}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "shipping"
                      ? "bg-purple-50 text-purple-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? t('menu.shipping') : undefined}
                >
                  <Truck className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>{t('menu.shipping')}</span>}
                </button>
                <button
                  onClick={() => onPageChange("payment")}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "payment"
                      ? "bg-purple-50 text-purple-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? t('menu.payment') : undefined}
                >
                  <CreditCard className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>{t('menu.payment')}</span>}
                </button>
                <button
                  onClick={() => onPageChange("inventory")}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2 rounded-lg transition-colors ${
                    currentPage === "inventory"
                      ? "bg-purple-50 text-purple-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? t('menu.inventory') : undefined}
                >
                  <Warehouse className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!isCollapsed && <span>{t('menu.inventory')}</span>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 회원 관리 (A레벨만 표시) */}
        {isLevelA && (
          <button
            onClick={() => onPageChange("members")}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
              currentPage === "members"
                ? "bg-purple-50 text-purple-600"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            title={isCollapsed ? t('menu.members') : undefined}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{t('menu.members')}</span>}
          </button>
        )}

        {/* 관리자 계정 관리 (A레벨 관리자만 표시) */}
        {isLevelA && (
          <button
            onClick={() => onPageChange("admin-account")}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
              currentPage === "admin-account"
                ? "bg-purple-50 text-purple-600"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            title={isCollapsed ? t('menu.adminAccount') : undefined}
          >
            <UserCog className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{t('menu.adminAccount')}</span>}
          </button>
        )}

        {/* 권한 관리 (A레벨 관리자만 표시) */}
        {isLevelA && (
          <button
            onClick={() => onPageChange("permissions")}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
              currentPage === "permissions"
                ? "bg-purple-50 text-purple-600"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            title={isCollapsed ? t('menu.permissions') : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{t('menu.permissions')}</span>}
          </button>
        )}
      </nav>
    </aside>
  );
}