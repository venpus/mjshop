import { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ShippingItem {
  id: string;
  orderId: string;
  customerName: string;
  product: string;
  quantity: number;
  address: string;
  trackingNumber: string;
  status: '배송대기' | '배송중' | '배송완료' | '배송취소';
  orderDate: string;
  shippingDate?: string;
  deliveryDate?: string;
}

const initialShippingData: ShippingItem[] = [
  {
    id: 'S001',
    orderId: 'ORD001',
    customerName: '김민수',
    product: '테디베어 봉제인형',
    quantity: 2,
    address: '서울시 강남구 테헤란로 123',
    trackingNumber: 'TRK-2024-001',
    status: '배송완료',
    orderDate: '2024-12-01',
    shippingDate: '2024-12-02',
    deliveryDate: '2024-12-05',
  },
  {
    id: 'S002',
    orderId: 'ORD002',
    customerName: '이영희',
    product: '브라운 곰돌이 인형',
    quantity: 1,
    address: '서울시 송파구 올림픽로 456',
    trackingNumber: 'TRK-2024-002',
    status: '배송중',
    orderDate: '2024-12-03',
    shippingDate: '2024-12-04',
  },
  {
    id: 'S003',
    orderId: 'ORD003',
    customerName: '박지훈',
    product: '토끼 인형 키링',
    quantity: 3,
    address: '부산시 해운대구 해운대로 789',
    trackingNumber: 'TRK-2024-003',
    status: '배송대기',
    orderDate: '2024-12-06',
  },
  {
    id: 'S004',
    orderId: 'ORD004',
    customerName: '최수진',
    product: '판다 봉제인형',
    quantity: 1,
    address: '인천시 남동구 구월로 234',
    trackingNumber: 'TRK-2024-004',
    status: '배송중',
    orderDate: '2024-12-05',
    shippingDate: '2024-12-06',
  },
  {
    id: 'S005',
    orderId: 'ORD005',
    customerName: '정다은',
    product: '고양이 피규어',
    quantity: 5,
    address: '대구시 중구 동성로 567',
    trackingNumber: 'TRK-2024-005',
    status: '배송완료',
    orderDate: '2024-11-28',
    shippingDate: '2024-11-29',
    deliveryDate: '2024-12-01',
  },
];

export function Shipping() {
  const [shippingData, setShippingData] = useState<ShippingItem[]>(initialShippingData);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = shippingData.filter(
    (item) =>
      item.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: ShippingItem['status']) => {
    switch (status) {
      case '배송완료':
        return <CheckCircle className="w-4 h-4" />;
      case '배송중':
        return <Truck className="w-4 h-4" />;
      case '배송대기':
        return <Clock className="w-4 h-4" />;
      case '배송취소':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: ShippingItem['status']) => {
    switch (status) {
      case '배송완료':
        return 'bg-green-100 text-green-800';
      case '배송중':
        return 'bg-blue-100 text-blue-800';
      case '배송대기':
        return 'bg-yellow-100 text-yellow-800';
      case '배송취소':
        return 'bg-red-100 text-red-800';
    }
  };

  const statusCounts = {
    배송대기: shippingData.filter((item) => item.status === '배송대기').length,
    배송중: shippingData.filter((item) => item.status === '배송중').length,
    배송완료: shippingData.filter((item) => item.status === '배송완료').length,
    배송취소: shippingData.filter((item) => item.status === '배송취소').length,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">배송 관리</h2>
        <p className="text-gray-600">배송 현황을 확인하고 관리할 수 있습니다</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">배송대기</p>
              <p className="text-gray-900 mt-1">{statusCounts.배송대기}건</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">배송중</p>
              <p className="text-gray-900 mt-1">{statusCounts.배송중}건</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">배송완료</p>
              <p className="text-gray-900 mt-1">{statusCounts.배송완료}건</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">배송취소</p>
              <p className="text-gray-900 mt-1">{statusCounts.배송취소}건</p>
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
            placeholder="주문번호, 고객명, 송장번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Shipping Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">배송번호</th>
                <th className="px-4 py-3 text-left text-gray-600">주문번호</th>
                <th className="px-4 py-3 text-left text-gray-600">고객명</th>
                <th className="px-4 py-3 text-left text-gray-600">상품명</th>
                <th className="px-4 py-3 text-left text-gray-600">수량</th>
                <th className="px-4 py-3 text-left text-gray-600">배송지</th>
                <th className="px-4 py-3 text-left text-gray-600">송장번호</th>
                <th className="px-4 py-3 text-left text-gray-600">주문일</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{item.id}</td>
                  <td className="px-4 py-3 text-gray-900">{item.orderId}</td>
                  <td className="px-4 py-3 text-gray-900">{item.customerName}</td>
                  <td className="px-4 py-3 text-gray-700">{item.product}</td>
                  <td className="px-4 py-3 text-gray-600">{item.quantity}개</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{item.address}</td>
                  <td className="px-4 py-3 text-gray-600">{item.trackingNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{item.orderDate}</td>
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
