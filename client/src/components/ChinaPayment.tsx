import { useState } from 'react';
import { Search, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface ChinaPaymentItem {
  id: string;
  poNumber: string;
  supplier: string;
  amount: number;
  method: '해외송금' | 'PayPal' | '알리페이' | '위챗페이';
  status: '결제완료' | '결제대기' | '결제취소' | '환불완료';
  paymentDate?: string;
  refundDate?: string;
}

const initialChinaPaymentData: ChinaPaymentItem[] = [
  {
    id: 'CPAY001',
    poNumber: 'PO-001',
    supplier: '광저우 제조사',
    amount: 25000,
    method: '해외송금',
    status: '결제완료',
    paymentDate: '2024-11-16',
  },
  {
    id: 'CPAY002',
    poNumber: 'PO-002',
    supplier: '선전 공장',
    amount: 38500,
    method: '알리페이',
    status: '결제완료',
    paymentDate: '2024-11-21',
  },
  {
    id: 'CPAY003',
    poNumber: 'PO-003',
    supplier: '상하이 제조사',
    amount: 13200,
    method: '위챗페이',
    status: '결제완료',
    paymentDate: '2024-11-26',
  },
  {
    id: 'CPAY004',
    poNumber: 'PO-004',
    supplier: '베이징 공장',
    amount: 17800,
    method: 'PayPal',
    status: '결제대기',
  },
  {
    id: 'CPAY005',
    poNumber: 'PO-005',
    supplier: '광저우 제조사',
    amount: 15500,
    method: '해외송금',
    status: '결제완료',
    paymentDate: '2024-11-11',
  },
  {
    id: 'CPAY006',
    poNumber: 'PO-006',
    supplier: '선전 공장',
    amount: 57800,
    method: '알리페이',
    status: '결제대기',
  },
  {
    id: 'CPAY007',
    poNumber: 'PO-007',
    supplier: '상하이 제조사',
    amount: 7000,
    method: '위챗페이',
    status: '결제완료',
    paymentDate: '2024-11-07',
  },
  {
    id: 'CPAY008',
    poNumber: 'PO-008',
    supplier: '베이징 공장',
    amount: 8900,
    method: 'PayPal',
    status: '결제취소',
    paymentDate: '2024-12-06',
  },
];

export function ChinaPayment() {
  const [chinaPaymentData, setChinaPaymentData] = useState<ChinaPaymentItem[]>(initialChinaPaymentData);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = chinaPaymentData.filter(
    (item) =>
      item.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: ChinaPaymentItem['status']) => {
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

  const getStatusColor = (status: ChinaPaymentItem['status']) => {
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
    결제완료: chinaPaymentData.filter((item) => item.status === '결제완료').length,
    결제대기: chinaPaymentData.filter((item) => item.status === '결제대기').length,
    결제취소: chinaPaymentData.filter((item) => item.status === '결제취소').length,
    환불완료: chinaPaymentData.filter((item) => item.status === '환불완료').length,
  };

  const totalAmount = chinaPaymentData
    .filter((item) => item.status === '결제완료')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">결제</h2>
        <p className="text-gray-600">중국 제조사 결제 내역을 확인하고 관리할 수 있습니다</p>
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
            placeholder="결제번호, 발주번호, 제조사명으로 검색..."
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
                <th className="px-4 py-3 text-left text-gray-600">발주번호</th>
                <th className="px-4 py-3 text-left text-gray-600">제조사명</th>
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
                  <td className="px-4 py-3 text-gray-900">{item.poNumber}</td>
                  <td className="px-4 py-3 text-gray-900">{item.supplier}</td>
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
