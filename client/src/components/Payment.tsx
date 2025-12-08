import { useState } from 'react';
import { Search, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface PaymentItem {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: '신용카드' | '계좌이체' | '무통장입금' | '간편결제';
  status: '결제완료' | '결제대기' | '결제취소' | '환불완료';
  paymentDate?: string;
  refundDate?: string;
}

const initialPaymentData: PaymentItem[] = [
  {
    id: 'PAY001',
    orderId: 'ORD001',
    customerName: '김민수',
    amount: 178000,
    method: '신용카드',
    status: '결제완료',
    paymentDate: '2024-12-01',
  },
  {
    id: 'PAY002',
    orderId: 'ORD002',
    customerName: '이영희',
    amount: 320000,
    method: '계좌이체',
    status: '결제완료',
    paymentDate: '2024-12-03',
  },
  {
    id: 'PAY003',
    orderId: 'ORD003',
    customerName: '박지훈',
    amount: 135000,
    method: '무통장입금',
    status: '결제대기',
  },
  {
    id: 'PAY004',
    orderId: 'ORD004',
    customerName: '최수진',
    amount: 125000,
    method: '간편결제',
    status: '결제완료',
    paymentDate: '2024-12-05',
  },
  {
    id: 'PAY005',
    orderId: 'ORD005',
    customerName: '정다은',
    amount: 125000,
    method: '신용카드',
    status: '환불완료',
    paymentDate: '2024-11-28',
    refundDate: '2024-12-02',
  },
  {
    id: 'PAY006',
    orderId: 'ORD006',
    customerName: '한지우',
    amount: 450000,
    method: '신용카드',
    status: '결제취소',
    paymentDate: '2024-12-04',
  },
  {
    id: 'PAY007',
    orderId: 'ORD007',
    customerName: '강민지',
    amount: 89000,
    method: '계좌이체',
    status: '결제완료',
    paymentDate: '2024-12-06',
  },
  {
    id: 'PAY008',
    orderId: 'ORD008',
    customerName: '윤서현',
    amount: 280000,
    method: '간편결제',
    status: '결제완료',
    paymentDate: '2024-12-05',
  },
];

export function Payment() {
  const [paymentData, setPaymentData] = useState<PaymentItem[]>(initialPaymentData);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = paymentData.filter(
    (item) =>
      item.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: PaymentItem['status']) => {
    switch (status) {
      case '결제완료':
        return <CheckCircle className="w-4 h-4" />;
      case '결제대기':
        return <Clock className="w-4 h-4" />;
      case '결제취소':
        return <XCircle className="w-4 h-4" />;
      case '환불완료':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: PaymentItem['status']) => {
    switch (status) {
      case '결제완료':
        return 'bg-green-100 text-green-800';
      case '결제대기':
        return 'bg-yellow-100 text-yellow-800';
      case '결제취소':
        return 'bg-red-100 text-red-800';
      case '환불완료':
        return 'bg-purple-100 text-purple-800';
    }
  };

  const statusCounts = {
    결제완료: paymentData.filter((item) => item.status === '결제완료').length,
    결제대기: paymentData.filter((item) => item.status === '결제대기').length,
    결제취소: paymentData.filter((item) => item.status === '결제취소').length,
    환불완료: paymentData.filter((item) => item.status === '환불완료').length,
  };

  const totalAmount = paymentData
    .filter((item) => item.status === '결제완료')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">결제 관리</h2>
        <p className="text-gray-600">결제 내역을 확인하고 관리할 수 있습니다</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 결제금액</p>
              <p className="text-gray-900 mt-1">¥{totalAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">결제완료</p>
              <p className="text-gray-900 mt-1">{statusCounts.결제완료}건</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">결제대기</p>
              <p className="text-gray-900 mt-1">{statusCounts.결제대기}건</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">환불완료</p>
              <p className="text-gray-900 mt-1">{statusCounts.환불완료}건</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
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
            placeholder="결제번호, 주문번호, 고객명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">결제번호</th>
                <th className="px-4 py-3 text-left text-gray-600">주문번호</th>
                <th className="px-4 py-3 text-left text-gray-600">고객명</th>
                <th className="px-4 py-3 text-left text-gray-600">결제금액</th>
                <th className="px-4 py-3 text-left text-gray-600">결제수단</th>
                <th className="px-4 py-3 text-left text-gray-600">결제일</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{item.id}</td>
                  <td className="px-4 py-3 text-gray-900">{item.orderId}</td>
                  <td className="px-4 py-3 text-gray-900">{item.customerName}</td>
                  <td className="px-4 py-3 text-gray-900">¥{item.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{item.method}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.paymentDate || '-'}
                  </td>
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
