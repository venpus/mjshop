import { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ShippingHistoryItem {
  id: string;
  poNumber: string;
  supplier: string;
  product: string;
  quantity: number;
  destination: string;
  trackingNumber: string;
  status: '발송대기' | '운송중' | '통관중' | '입고완료' | '발송취소';
  poDate: string;
  shippingDate?: string;
  arrivalDate?: string;
}

const initialShippingHistory: ShippingHistoryItem[] = [
  {
    id: 'CH001',
    poNumber: 'PO-001',
    supplier: '광저우 제조사',
    product: '봉제인형 세트 A',
    quantity: 500,
    destination: '인천항 물류센터',
    trackingNumber: 'CN-TRK-2024-001',
    status: '입고완료',
    poDate: '2024-11-15',
    shippingDate: '2024-11-20',
    arrivalDate: '2024-11-28',
  },
  {
    id: 'CH002',
    poNumber: 'PO-002',
    supplier: '선전 공장',
    product: '피규어 A타입',
    quantity: 1000,
    destination: '부산항 물류센터',
    trackingNumber: 'CN-TRK-2024-002',
    status: '통관중',
    poDate: '2024-11-20',
    shippingDate: '2024-11-25',
  },
  {
    id: 'CH003',
    poNumber: 'PO-003',
    supplier: '상하이 제조사',
    product: '키링 세트',
    quantity: 2000,
    destination: '인천항 물류센터',
    trackingNumber: 'CN-TRK-2024-003',
    status: '운송중',
    poDate: '2024-11-25',
    shippingDate: '2024-11-30',
  },
  {
    id: 'CH004',
    poNumber: 'PO-004',
    supplier: '베이징 공장',
    product: '잡화 묶음',
    quantity: 800,
    destination: '부산항 물류센터',
    trackingNumber: 'CN-TRK-2024-004',
    status: '발송대기',
    poDate: '2024-12-01',
  },
  {
    id: 'CH005',
    poNumber: 'PO-005',
    supplier: '광저우 제조사',
    product: '봉제인형 B타입',
    quantity: 300,
    destination: '인천항 물류센터',
    trackingNumber: 'CN-TRK-2024-005',
    status: '입고완료',
    poDate: '2024-11-10',
    shippingDate: '2024-11-15',
    arrivalDate: '2024-11-23',
  },
  {
    id: 'CH006',
    poNumber: 'PO-006',
    supplier: '선전 공장',
    product: '피규어 C타입',
    quantity: 1500,
    destination: '부산항 물류센터',
    trackingNumber: 'CN-TRK-2024-006',
    status: '운송중',
    poDate: '2024-11-28',
    shippingDate: '2024-12-03',
  },
];

export function ShippingHistory() {
  const [shippingHistory, setShippingHistory] = useState<ShippingHistoryItem[]>(initialShippingHistory);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = shippingHistory.filter(
    (item) =>
      item.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: ShippingHistoryItem['status']) => {
    switch (status) {
      case '입고완료':
        return <CheckCircle className="w-4 h-4" />;
      case '통관중':
        return <Package className="w-4 h-4" />;
      case '운송중':
        return <Truck className="w-4 h-4" />;
      case '발송대기':
        return <Clock className="w-4 h-4" />;
      case '발송취소':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: ShippingHistoryItem['status']) => {
    switch (status) {
      case '입고완료':
        return 'bg-green-100 text-green-800';
      case '통관중':
        return 'bg-purple-100 text-purple-800';
      case '운송중':
        return 'bg-blue-100 text-blue-800';
      case '발송대기':
        return 'bg-yellow-100 text-yellow-800';
      case '발송취소':
        return 'bg-red-100 text-red-800';
    }
  };

  const statusCounts = {
    발송대기: shippingHistory.filter((item) => item.status === '발송대기').length,
    운송중: shippingHistory.filter((item) => item.status === '운송중').length,
    통관중: shippingHistory.filter((item) => item.status === '통관중').length,
    입고완료: shippingHistory.filter((item) => item.status === '입고완료').length,
    발송취소: shippingHistory.filter((item) => item.status === '발송취소').length,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">발송 내역</h2>
        <p className="text-gray-600">중국에서 발송된 상품의 운송 현황을 확인하고 관리할 수 있습니다</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">발송대기</p>
              <p className="text-gray-900 mt-1">{statusCounts.발송대기}건</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">운송중</p>
              <p className="text-gray-900 mt-1">{statusCounts.운송중}건</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">통관중</p>
              <p className="text-gray-900 mt-1">{statusCounts.통관중}건</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">입고완료</p>
              <p className="text-gray-900 mt-1">{statusCounts.입고완료}건</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">발송취소</p>
              <p className="text-gray-900 mt-1">{statusCounts.발송취소}건</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="발주번호, 제조사명, 송장번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Shipping History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">발송번호</th>
                <th className="px-4 py-3 text-left text-gray-600">발주번호</th>
                <th className="px-4 py-3 text-left text-gray-600">제조사명</th>
                <th className="px-4 py-3 text-left text-gray-600">상품명</th>
                <th className="px-4 py-3 text-left text-gray-600">수량</th>
                <th className="px-4 py-3 text-left text-gray-600">도착지</th>
                <th className="px-4 py-3 text-left text-gray-600">송장번호</th>
                <th className="px-4 py-3 text-left text-gray-600">발주일</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{item.id}</td>
                  <td className="px-4 py-3 text-gray-900">{item.poNumber}</td>
                  <td className="px-4 py-3 text-gray-900">{item.supplier}</td>
                  <td className="px-4 py-3 text-gray-700">{item.product}</td>
                  <td className="px-4 py-3 text-gray-600">{item.quantity}개</td>
                  <td className="px-4 py-3 text-gray-600">{item.destination}</td>
                  <td className="px-4 py-3 text-gray-600">{item.trackingNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{item.poDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
