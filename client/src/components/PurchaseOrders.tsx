import { useState } from 'react';
import { Search, Filter, Download, Eye, Package, Plus } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  product: string;
  quantity: number;
  amount: number;
  status: '발주대기' | '발주완료' | '제조중' | '출고완료' | '취소';
  date: string;
}

const initialPurchaseOrders: PurchaseOrder[] = [
  { id: '1', poNumber: 'PO-001', supplier: '광저우 제조사', product: '봉제인형 세트', quantity: 500, amount: 3500000, status: '제조중', date: '2024-12-08' },
  { id: '2', poNumber: 'PO-002', supplier: '선전 공장', product: '피규어 A타입', quantity: 1000, amount: 5200000, status: '발주완료', date: '2024-12-08' },
  { id: '3', poNumber: 'PO-003', supplier: '상하이 제조사', product: '키링 세트', quantity: 2000, amount: 1800000, status: '출고완료', date: '2024-12-07' },
  { id: '4', poNumber: 'PO-004', supplier: '베이징 공장', product: '잡화 묶음', quantity: 800, amount: 2400000, status: '제조중', date: '2024-12-07' },
  { id: '5', poNumber: 'PO-005', supplier: '광저우 제조사', product: '봉제인형 B타입', quantity: 300, amount: 2100000, status: '발주완료', date: '2024-12-07' },
  { id: '6', poNumber: 'PO-006', supplier: '선전 공장', product: '피규어 C타입', quantity: 1500, amount: 7800000, status: '발주대기', date: '2024-12-06' },
  { id: '7', poNumber: 'PO-007', supplier: '상하이 제조사', product: '키링 특별판', quantity: 500, amount: 950000, status: '출고완료', date: '2024-12-06' },
  { id: '8', poNumber: 'PO-008', supplier: '베이징 공장', product: '잡화 프리미엄', quantity: 200, amount: 1200000, status: '취소', date: '2024-12-05' },
];

export function PurchaseOrders() {
  const [purchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('전체');

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.product.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '전체' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ['전체', '발주대기', '발주완료', '제조중', '출고완료', '취소'];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">발주 관리</h2>
        <p className="text-gray-600">중국 제조사에 발주한 상품을 확인하고 제조 상태를 관리할 수 있습니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statusOptions.slice(1).map((status) => {
          const count = purchaseOrders.filter(po => po.status === status).length;
          return (
            <div key={status} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <p className="text-gray-600 mb-1">{status}</p>
              <p className="text-gray-900">{count}건</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="발주번호, 제조사명, 상품명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5" />
            <span>내보내기</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>발주 생성</span>
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-600">발주번호</th>
                <th className="px-6 py-3 text-left text-gray-600">발주일자</th>
                <th className="px-6 py-3 text-left text-gray-600">제조사명</th>
                <th className="px-6 py-3 text-left text-gray-600">상품명</th>
                <th className="px-6 py-3 text-left text-gray-600">수량</th>
                <th className="px-6 py-3 text-left text-gray-600">발주금액</th>
                <th className="px-6 py-3 text-left text-gray-600">상태</th>
                <th className="px-6 py-3 text-left text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPurchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{po.poNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{po.date}</td>
                  <td className="px-6 py-4 text-gray-900">{po.supplier}</td>
                  <td className="px-6 py-4 text-gray-600">{po.product}</td>
                  <td className="px-6 py-4 text-gray-600">{po.quantity}개</td>
                  <td className="px-6 py-4 text-gray-900">₩{po.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full ${
                      po.status === '출고완료' ? 'bg-green-100 text-green-800' :
                      po.status === '제조중' ? 'bg-blue-100 text-blue-800' :
                      po.status === '발주완료' ? 'bg-purple-100 text-purple-800' :
                      po.status === '발주대기' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                        <Package className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">총 발주 금액</span>
          <span className="text-gray-900">
            ₩{filteredPurchaseOrders.reduce((sum, po) => sum + po.amount, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
