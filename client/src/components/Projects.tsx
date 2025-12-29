import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Plus, X } from "lucide-react";
import { getAllProjects, createProject, type Project as ProjectApi } from "../api/projectApi";

interface Project {
  id: number;
  startDate: string; // 시작날짜
  name: string; // 프로젝트명
  status: '진행중' | 'PENDING' | '취소'; // 현재 상태
  content: string; // 텍스트 내용
  lastUpdatedDate: string; // 최종 업데이트 날짜
  nextStep: string; // 다음 진행 단계
}

interface ProjectsProps {
  onViewDetail?: (projectId: number | string) => void;
}

export function Projects({ onViewDetail }: ProjectsProps = {}) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<'진행중' | 'PENDING' | '취소'>('진행중');
  const [newProjectStartDate, setNewProjectStartDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 프로젝트 목록 로드
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const apiProjects = await getAllProjects();
      // API 응답을 로컬 인터페이스로 변환 (임시 - 추후 API 응답 구조에 맞게 수정 필요)
      const convertedProjects: Project[] = apiProjects.map((p: ProjectApi) => ({
        id: p.id,
        startDate: typeof p.start_date === 'string' ? p.start_date : p.start_date.toISOString().split('T')[0],
        name: p.name,
        status: p.status,
        content: '', // API에 content 필드가 없으므로 빈 문자열
        lastUpdatedDate: typeof p.updated_at === 'string' ? p.updated_at : p.updated_at.toISOString().split('T')[0],
        nextStep: '', // API에 nextStep 필드가 없으므로 빈 문자열
      }));
      setProjects(convertedProjects);
    } catch (error) {
      console.error('프로젝트 목록 조회 오류:', error);
      alert('프로젝트 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('프로젝트명을 입력해주세요.');
      return;
    }

    if (!newProjectStartDate) {
      alert('시작일을 선택해주세요.');
      return;
    }

    try {
      setIsCreating(true);
      await createProject({
        name: newProjectName,
        status: newProjectStatus,
        start_date: newProjectStartDate,
      });
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectStatus('진행중');
      setNewProjectStartDate('');
      await loadProjects();
    } catch (error: any) {
      console.error('프로젝트 생성 오류:', error);
      alert(error.message || '프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case '진행중':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case '취소':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="p-8 min-h-[1080px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
              <Folder className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-900">프로젝트 관리</h2>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            프로젝트 추가
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          프로젝트 진행 현황 및 관리를 수행합니다.
        </p>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시작날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  프로젝트명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  현재 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  내용
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  최종 업데이트 날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  다음 진행 단계
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    등록된 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (onViewDetail) {
                        onViewDetail(String(project.id));
                      } else {
                        navigate(`/admin/projects/${project.id}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(project.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="line-clamp-2">{project.content}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(project.lastUpdatedDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="line-clamp-2">{project.nextStep}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 프로젝트 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">프로젝트 추가</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트명 *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="프로젝트명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태 *
                </label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as '진행중' | 'PENDING' | '취소')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="진행중">진행중</option>
                  <option value="PENDING">PENDING</option>
                  <option value="취소">취소</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일 *
                </label>
                <input
                  type="date"
                  value={newProjectStartDate}
                  onChange={(e) => setNewProjectStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isCreating}
              >
                취소
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isCreating}
              >
                {isCreating ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
