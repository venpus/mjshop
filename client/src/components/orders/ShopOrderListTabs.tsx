export type ShopOrderListTab = 'products' | 'lines';

interface ShopOrderListTabsProps {
  activeTab: ShopOrderListTab;
  onTabChange: (tab: ShopOrderListTab) => void;
  productCount: number;
  lineCount: number;
}

export function ShopOrderListTabs({
  activeTab,
  onTabChange,
  productCount,
  lineCount,
}: ShopOrderListTabsProps) {
  return (
    <div className="flex gap-2 mb-6 border-b border-gray-200">
      <button
        type="button"
        onClick={() => onTabChange('products')}
        className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-b-2 -mb-px ${
          activeTab === 'products'
            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
            : 'bg-purple-50 text-purple-700 border-transparent hover:bg-purple-100'
        }`}
      >
        제품별 주문 관리
        <span className="ml-1.5 opacity-80">({productCount})</span>
      </button>
      <button
        type="button"
        onClick={() => onTabChange('lines')}
        className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-b-2 -mb-px ${
          activeTab === 'lines'
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
            : 'bg-emerald-50 text-emerald-700 border-transparent hover:bg-emerald-100'
        }`}
      >
        주문 건별 관리
        <span className="ml-1.5 opacity-80">({lineCount})</span>
      </button>
    </div>
  );
}
