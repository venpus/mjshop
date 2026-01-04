interface StockDetailTabNavigationProps {
  activeTab: 'inbound' | 'outbound';
  onTabChange: (tab: 'inbound' | 'outbound') => void;
}

export function StockDetailTabNavigation({
  activeTab,
  onTabChange,
}: StockDetailTabNavigationProps) {
  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => onTabChange('inbound')}
        className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
          activeTab === 'inbound'
            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
            : 'bg-blue-50 text-blue-700 border-transparent hover:bg-blue-100'
        }`}
      >
        입고 기록
      </button>
      <button
        onClick={() => onTabChange('outbound')}
        className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
          activeTab === 'outbound'
            ? 'bg-green-600 text-white border-green-600 shadow-md'
            : 'bg-green-50 text-green-700 border-transparent hover:bg-green-100'
        }`}
      >
        출고/판매 관리
      </button>
    </div>
  );
}

