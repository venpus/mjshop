import { TrendingUp, ShoppingCart, Package, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const stats = [
  {
    title: '총 매출',
    value: '₩12,450,000',
    change: '+12.5%',
    icon: TrendingUp,
    color: 'bg-blue-500',
  },
  {
    title: '주문 수',
    value: '1,234',
    change: '+8.2%',
    icon: ShoppingCart,
    color: 'bg-green-500',
  },
  {
    title: '상품 수',
    value: '456',
    change: '+3.1%',
    icon: Package,
    color: 'bg-purple-500',
  },
  {
    title: '회원 수',
    value: '8,920',
    change: '+15.3%',
    icon: Users,
    color: 'bg-orange-500',
  },
];

const salesData = [
  { name: '1월', sales: 4000 },
  { name: '2월', sales: 3000 },
  { name: '3월', sales: 5000 },
  { name: '4월', sales: 4500 },
  { name: '5월', sales: 6000 },
  { name: '6월', sales: 7000 },
];

const categoryData = [
  { name: '의류', value: 4000 },
  { name: '전자제품', value: 3000 },
  { name: '식품', value: 2000 },
  { name: '도서', value: 2780 },
  { name: '스포츠', value: 1890 },
];

export function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">대시보드</h2>
        <p className="text-gray-600">쇼핑몰 운영 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-gray-900 mb-6">월별 매출 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-gray-900 mb-6">카테고리별 판매</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">최근 주문</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-600">주문번호</th>
                <th className="px-6 py-3 text-left text-gray-600">고객명</th>
                <th className="px-6 py-3 text-left text-gray-600">상품</th>
                <th className="px-6 py-3 text-left text-gray-600">금액</th>
                <th className="px-6 py-3 text-left text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { id: '#ORD-001', customer: '김민수', product: '무선 이어폰', amount: '₩89,000', status: '배송중' },
                { id: '#ORD-002', customer: '이지은', product: '스마트워치', amount: '₩320,000', status: '결제완료' },
                { id: '#ORD-003', customer: '박준영', product: '노트북 가방', amount: '₩45,000', status: '배송완료' },
                { id: '#ORD-004', customer: '최서연', product: '블루투스 스피커', amount: '₩125,000', status: '배송중' },
                { id: '#ORD-005', customer: '정우진', product: '휴대폰 케이스', amount: '₩25,000', status: '결제완료' },
              ].map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-gray-600">{order.customer}</td>
                  <td className="px-6 py-4 text-gray-600">{order.product}</td>
                  <td className="px-6 py-4 text-gray-900">{order.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full ${
                      order.status === '배송완료' ? 'bg-green-100 text-green-800' :
                      order.status === '배송중' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
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
