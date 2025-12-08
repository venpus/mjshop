import { useState } from 'react';
import { Search, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastRestocked?: string;
  status: '정상' | '부족' | '과다';
}

const initialInventoryData: InventoryItem[] = [
  {
    id: 'P001',
    productName: '테디베어 봉제인형',
    category: '봉제',
    currentStock: 45,
    minStock: 20,
    maxStock: 100,
    unit: '개',
    lastRestocked: '2024-11-15',
    status: '정상',
  },
  {
    id: 'P002',
    productName: '브라운 곰돌이 인형',
    category: '봉제',
    currentStock: 12,
    minStock: 20,
    maxStock: 50,
    unit: '개',
    lastRestocked: '2024-10-20',
    status: '부족',
  },
  {
    id: 'P003',
    productName: '토끼 인형 키링',
    category: '키링',
    currentStock: 0,
    minStock: 10,
    maxStock: 50,
    unit: '개',
    lastRestocked: '2024-09-10',
    status: '부족',
  },
  {
    id: 'P004',
    productName: '판다 봉제인형',
    category: '봉제',
    currentStock: 28,
    minStock: 15,
    maxStock: 60,
    unit: '개',
    lastRestocked: '2024-11-25',
    status: '정상',
  },
  {
    id: 'P005',
    productName: '고양이 피규어',
    category: '피규어',
    currentStock: 156,
    minStock: 30,
    maxStock: 100,
    unit: '개',
    lastRestocked: '2024-12-01',
    status: '과다',
  },
  {
    id: 'P006',
    productName: '강아지 미니 인형',
    category: '키링',
    currentStock: 67,
    minStock: 20,
    maxStock: 80,
    unit: '개',
    lastRestocked: '2024-11-18',
    status: '정상',
  },
  {
    id: 'P007',
    productName: '펭귄 봉제인형',
    category: '봉제',
    currentStock: 8,
    minStock: 10,
    maxStock: 30,
    unit: '개',
    lastRestocked: '2024-08-15',
    status: '부족',
  },
  {
    id: 'P008',
    productName: '사슴 인형',
    category: '봉제',
    currentStock: 34,
    minStock: 15,
    maxStock: 50,
    unit: '개',
    lastRestocked: '2024-11-20',
    status: '정상',
  },
  {
    id: 'P009',
    productName: '여우 봉제인형',
    category: '봉제',
    currentStock: 42,
    minStock: 20,
    maxStock: 60,
    unit: '개',
    lastRestocked: '2024-11-28',
    status: '정상',
  },
  {
    id: 'P010',
    productName: '다람쥐 키링',
    category: '키링',
    currentStock: 88,
    minStock: 25,
    maxStock: 100,
    unit: '개',
    lastRestocked: '2024-12-03',
    status: '정상',
  },
];

export function Inventory() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(initialInventoryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'전체' | '정상' | '부족' | '과다'>('전체');

  const filteredData = inventoryData.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === '전체' || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case '정상':
        return 'bg-green-100 text-green-800';
      case '부족':
        return 'bg-red-100 text-red-800';
      case '과다':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStockPercentage = (item: InventoryItem) => {
    return Math.round((item.currentStock / item.maxStock) * 100);
  };

  const statusCounts = {
    정상: inventoryData.filter((item) => item.status === '정상').length,
    부족: inventoryData.filter((item) => item.status === '부족').length,
    과다: inventoryData.filter((item) => item.status === '과다').length,
  };

  const totalProducts = inventoryData.length;
  const totalStock = inventoryData.reduce((sum, item) => sum + item.currentStock, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">재고 관리</h2>
        <p className="text-gray-600">재고 현황을 확인하고 관리할 수 있습니다</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 상품</p>
              <p className="text-gray-900 mt-1">{totalProducts}개</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정상재고</p>
              <p className="text-gray-900 mt-1">{statusCounts.정상}개</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">재고부족</p>
              <p className="text-gray-900 mt-1">{statusCounts.부족}개</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">재고과다</p>
              <p className="text-gray-900 mt-1">{statusCounts.과다}개</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="상품명, 카테고리, 상품 ID로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-2">
          {['전체', '정상', '부족', '과다'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as typeof filterStatus)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">상품 ID</th>
                <th className="px-4 py-3 text-left text-gray-600">상품명</th>
                <th className="px-4 py-3 text-left text-gray-600">카테고리</th>
                <th className="px-4 py-3 text-left text-gray-600">현재재고</th>
                <th className="px-4 py-3 text-left text-gray-600">최소재고</th>
                <th className="px-4 py-3 text-left text-gray-600">최대재고</th>
                <th className="px-4 py-3 text-left text-gray-600">재고율</th>
                <th className="px-4 py-3 text-left text-gray-600">마지막 입고</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => {
                const stockPercentage = getStockPercentage(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{item.id}</td>
                    <td className="px-4 py-3 text-gray-900">{item.productName}</td>
                    <td className="px-4 py-3 text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {item.currentStock}{item.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.minStock}{item.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.maxStock}{item.unit}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              stockPercentage < 30
                                ? 'bg-red-500'
                                : stockPercentage > 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{stockPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.lastRestocked || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
