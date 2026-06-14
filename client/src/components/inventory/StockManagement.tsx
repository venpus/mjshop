import { useState } from 'react';
import { Warehouse, Package } from 'lucide-react';
import { InventoryListPage } from './InventoryListPage';
import { OutboundTab } from './OutboundTab';

type TabType = 'inbound' | 'outbound';

export function StockManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('inbound');

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">재고 관리</h2>
        <p className="text-gray-600">입고 및 출고 현황을 확인하고 관리할 수 있습니다</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('inbound')}
          className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
            activeTab === 'inbound'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md'
              : 'bg-purple-50 text-purple-700 border-transparent hover:bg-purple-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4" />
            <span>입고 관리</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outbound')}
          className={`px-4 py-2.5 font-medium transition-all rounded-t-lg border-b-2 ${
            activeTab === 'outbound'
              ? 'bg-green-600 text-white border-green-600 shadow-md'
              : 'bg-green-50 text-green-700 border-transparent hover:bg-green-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>출고 관리</span>
          </div>
        </button>
      </div>

      {activeTab === 'inbound' && <InventoryListPage />}
      {activeTab === 'outbound' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <OutboundTab />
        </div>
      )}
    </div>
  );
}
