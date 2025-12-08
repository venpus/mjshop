import { useState } from 'react';
import { Search, Users, UserCheck, UserX, Crown } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: 'VIP' | '골드' | '실버' | '일반';
  status: '활동중' | '휴면' | '탈퇴';
  joinDate: string;
  totalOrders: number;
  totalAmount: number;
}

const initialMemberData: Member[] = [
  {
    id: 'M001',
    name: '김민수',
    email: 'minsu.kim@email.com',
    phone: '010-1234-5678',
    grade: 'VIP',
    status: '활동중',
    joinDate: '2023-01-15',
    totalOrders: 45,
    totalAmount: 5600000,
  },
  {
    id: 'M002',
    name: '이영희',
    email: 'younghee.lee@email.com',
    phone: '010-2345-6789',
    grade: '골드',
    status: '활동중',
    joinDate: '2023-03-22',
    totalOrders: 28,
    totalAmount: 3200000,
  },
  {
    id: 'M003',
    name: '박지훈',
    email: 'jihoon.park@email.com',
    phone: '010-3456-7890',
    grade: '실버',
    status: '활동중',
    joinDate: '2023-06-10',
    totalOrders: 15,
    totalAmount: 1800000,
  },
  {
    id: 'M004',
    name: '최수진',
    email: 'sujin.choi@email.com',
    phone: '010-4567-8901',
    grade: '일반',
    status: '활동중',
    joinDate: '2024-01-05',
    totalOrders: 8,
    totalAmount: 950000,
  },
  {
    id: 'M005',
    name: '정다은',
    email: 'daeun.jung@email.com',
    phone: '010-5678-9012',
    grade: '실버',
    status: '휴면',
    joinDate: '2022-11-20',
    totalOrders: 12,
    totalAmount: 1400000,
  },
  {
    id: 'M006',
    name: '한지우',
    email: 'jiwoo.han@email.com',
    phone: '010-6789-0123',
    grade: 'VIP',
    status: '활동중',
    joinDate: '2022-08-14',
    totalOrders: 52,
    totalAmount: 6800000,
  },
  {
    id: 'M007',
    name: '강민지',
    email: 'minji.kang@email.com',
    phone: '010-7890-1234',
    grade: '골드',
    status: '활동중',
    joinDate: '2023-05-18',
    totalOrders: 22,
    totalAmount: 2700000,
  },
  {
    id: 'M008',
    name: '윤서현',
    email: 'seohyun.yoon@email.com',
    phone: '010-8901-2345',
    grade: '일반',
    status: '탈퇴',
    joinDate: '2024-02-28',
    totalOrders: 3,
    totalAmount: 280000,
  },
  {
    id: 'M009',
    name: '송하늘',
    email: 'haneul.song@email.com',
    phone: '010-9012-3456',
    grade: '골드',
    status: '활동중',
    joinDate: '2023-07-30',
    totalOrders: 31,
    totalAmount: 3900000,
  },
  {
    id: 'M010',
    name: '배준서',
    email: 'junseo.bae@email.com',
    phone: '010-0123-4567',
    grade: '실버',
    status: '활동중',
    joinDate: '2023-09-12',
    totalOrders: 18,
    totalAmount: 2100000,
  },
];

export function Members() {
  const [memberData] = useState<Member[]>(initialMemberData);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = memberData.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGradeColor = (grade: Member['grade']) => {
    switch (grade) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800';
      case '골드':
        return 'bg-yellow-100 text-yellow-800';
      case '실버':
        return 'bg-gray-100 text-gray-800';
      case '일반':
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: Member['status']) => {
    switch (status) {
      case '활동중':
        return 'bg-green-100 text-green-800';
      case '휴면':
        return 'bg-orange-100 text-orange-800';
      case '탈퇴':
        return 'bg-red-100 text-red-800';
    }
  };

  const statusCounts = {
    활동중: memberData.filter((m) => m.status === '활동중').length,
    휴면: memberData.filter((m) => m.status === '휴면').length,
    탈퇴: memberData.filter((m) => m.status === '탈퇴').length,
  };

  const gradeCounts = {
    VIP: memberData.filter((m) => m.grade === 'VIP').length,
    골드: memberData.filter((m) => m.grade === '골드').length,
    실버: memberData.filter((m) => m.grade === '실버').length,
    일반: memberData.filter((m) => m.grade === '일반').length,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">회원 관리</h2>
        <p className="text-gray-600">회원 정보를 확인하고 관리할 수 있습니다</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 회원</p>
              <p className="text-gray-900 mt-1">{memberData.length}명</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활동중</p>
              <p className="text-gray-900 mt-1">{statusCounts.활동중}명</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">VIP 회원</p>
              <p className="text-gray-900 mt-1">{gradeCounts.VIP}명</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">휴면/탈퇴</p>
              <p className="text-gray-900 mt-1">{statusCounts.휴면 + statusCounts.탈퇴}명</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserX className="w-6 h-6 text-orange-600" />
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
            placeholder="회원명, 이메일, 전화번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">회원번호</th>
                <th className="px-4 py-3 text-left text-gray-600">회원명</th>
                <th className="px-4 py-3 text-left text-gray-600">이메일</th>
                <th className="px-4 py-3 text-left text-gray-600">전화번호</th>
                <th className="px-4 py-3 text-left text-gray-600">등급</th>
                <th className="px-4 py-3 text-left text-gray-600">가입일</th>
                <th className="px-4 py-3 text-left text-gray-600">주문수</th>
                <th className="px-4 py-3 text-left text-gray-600">누적구매액</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{member.id}</td>
                  <td className="px-4 py-3 text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 text-gray-600">{member.email}</td>
                  <td className="px-4 py-3 text-gray-600">{member.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getGradeColor(
                        member.grade
                      )}`}
                    >
                      {member.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{member.joinDate}</td>
                  <td className="px-4 py-3 text-gray-900">{member.totalOrders}건</td>
                  <td className="px-4 py-3 text-gray-900">₩{member.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status}
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
