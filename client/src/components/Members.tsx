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

export function Members() {
  const [memberData] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('전체');

  const filteredMembers = memberData.filter(
    (member) =>
      (gradeFilter === '전체' || member.grade === gradeFilter) &&
      (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 min-w-[1920px] min-h-[1080px]">
      <div className="mb-8">
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
              <p className="text-gray-900 mt-1">
                {memberData.filter((m) => m.status === '활동중').length}명
              </p>
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
              <p className="text-gray-900 mt-1">
                {memberData.filter((m) => m.grade === 'VIP').length}명
              </p>
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
              <p className="text-gray-900 mt-1">
                {memberData.filter((m) => m.status === '휴면' || m.status === '탈퇴').length}명
              </p>
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
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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