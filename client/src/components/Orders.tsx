import { useState } from 'react';
import { Search, Filter, Download, Eye, Package, Plus } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  quantity: number;
  amount: number;
  status: '결제완료' | '배송준비' | '배송중' | '배송완료' | '취소';
  date: string;
}

const initialOrders: Order[] = [
  { id: '1', orderNumber: 'ORD-001', customer: '김민수', product: '무선 이어폰', quantity: 1, amount: 89000, status: '배송중', date: '2024-12-08' },
  { id: '2', orderNumber: 'ORD-002', customer: '이지은', product: '스마트워치', quantity: 1, amount: 320000, status: '결제완료', date: '2024-12-08' },
  { id: '3', orderNumber: 'ORD-003', customer: '박준영', product: '노트북 가방', quantity: 2, amount: 90000, status: '배송완료', date: '2024-12-07' },
  { id: '4', orderNumber: 'ORD-004', customer: '최서연', product: '블루투스 스피커', quantity: 1, amount: 125000, status: '배송중', date: '2024-12-07' },
  { id: '5', orderNumber: 'ORD-005', customer: '정우진', product: '휴대폰 케이스', quantity: 3, amount: 75000, status: '결제완료', date: '2024-12-07' },
  { id: '6', orderNumber: 'ORD-006', customer: '강하늘', product: '무선 충전기', quantity: 2, amount: 70000, status: '배송준비', date: '2024-12-06' },
  { id: '7', orderNumber: 'ORD-007', customer: '윤아름', product: '캠핑 텐트', quantity: 1, amount: 280000, status: '배송완료', date: '2024-12-06' },
  { id: '8', orderNumber: 'ORD-008', customer: '송지훈', product: '요가 매트', quantity: 1, amount: 42000, status: '취소', date: '2024-12-05' },
];

export function Orders() {
  const [orders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('전체');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '전체' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ['전체', '결제완료', '배송준비', '배송중', '배송완료', '취소'];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">주문 관리</h2>
        <p className="text-gray-600">고객 주문을 확인하고 배송 상태를 관리할 수 있습니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statusOptions.slice(1).map((status) => {
          const count = orders.filter(o => o.status === status).length;
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
            placeholder="주문번호, 고객명, 상품명으로 검색..."
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
            <span>주문 생성</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-600">주문번호</th>
                <th className="px-6 py-3 text-left text-gray-600">주문일자</th>
                <th className="px-6 py-3 text-left text-gray-600">고객명</th>
                <th className="px-6 py-3 text-left text-gray-600">상품명</th>
                <th className="px-6 py-3 text-left text-gray-600">수량</th>
                <th className="px-6 py-3 text-left text-gray-600">주문금액</th>
                <th className="px-6 py-3 text-left text-gray-600">상태</th>
                <th className="px-6 py-3 text-left text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{order.orderNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{order.date}</td>
                  <td className="px-6 py-4 text-gray-900">{order.customer}</td>
                  <td className="px-6 py-4 text-gray-600">{order.product}</td>
                  <td className="px-6 py-4 text-gray-600">{order.quantity}개</td>
                  <td className="px-6 py-4 text-gray-900">₩{order.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full ${
                      order.status === '배송완료' ? 'bg-green-100 text-green-800' :
                      order.status === '배송중' ? 'bg-blue-100 text-blue-800' :
                      order.status === '배송준비' ? 'bg-purple-100 text-purple-800' :
                      order.status === '결제완료' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
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
          <span className="text-gray-600">총 주문 금액</span>
          <span className="text-gray-900">
            ₩{filteredOrders.reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}