import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Plus, Search, Filter, X } from "lucide-react";
import { getProjectsPaginated, type ProjectListItem } from "../api/projectApi";
import { ProjectCard } from "./projects/ProjectCard";
import { ProjectCreateModal } from "./projects/ProjectCreateModal";

interface ProjectsProps {
  onViewDetail?: (projectId: number | string) => void;
}

const PAGE_SIZE = 18; // 6열 × 3행

export function Projects({ onViewDetail }: ProjectsProps = {}) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectListItem['status'] | '전체'>('전체');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Intersection Observer를 위한 ref
  const observerTarget = useRef<HTMLDivElement>(null);

  // 프로젝트 목록 로드 (첫 페이지)
  const loadProjects = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setProjects([]);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const result = await getProjectsPaginated({
        page,
        limit: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== '전체' ? statusFilter : undefined,
        startDate: dateFilter.start || undefined,
        endDate: dateFilter.end || undefined,
      });

      if (reset) {
        setProjects(result.items);
      } else {
        setProjects((prev) => [...prev, ...result.items]);
      }

      setTotal(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('프로젝트 목록 조회 오류:', err);
      setError(err.message || '프로젝트 목록을 불러오는데 실패했습니다.');
      if (reset) {
        alert('프로젝트 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, statusFilter, dateFilter]);

  // 초기 로드
  useEffect(() => {
    loadProjects(1, true);
  }, []);

  // 검색/필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    if (currentPage > 1) {
      loadProjects(1, true);
    }
  }, [searchQuery, statusFilter, dateFilter.start, dateFilter.end]);

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadProjects(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage, loadProjects]);

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

      {/* 검색 및 필터 영역 */}
      <div className="mb-6 space-y-4">
        {/* 검색어 입력 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="프로젝트명, 요청사항, 내용, 작성자로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 필터 영역 */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">상태:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectListItem['status'] | '전체')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="전체">전체</option>
              <option value="진행중">진행중</option>
              <option value="홀딩중">홀딩중</option>
              <option value="완성">완성</option>
              <option value="취소">취소</option>
            </select>
          </div>

          {/* 날짜 필터 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">시작일:</label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <span className="text-sm text-gray-500">~</span>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {(dateFilter.start || dateFilter.end) && (
              <button
                onClick={() => setDateFilter({ start: '', end: '' })}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 필터 결과 표시 */}
          <div className="ml-auto text-sm text-gray-600">
            {searchQuery || statusFilter !== '전체' || dateFilter.start || dateFilter.end ? (
              <>
                검색 결과: <span className="font-semibold text-blue-600">{total}</span>개
              </>
            ) : (
              <>
                전체: <span className="font-semibold text-blue-600">{total}</span>개
              </>
            )}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
          <p className="text-lg text-red-600 mb-2">오류가 발생했습니다.</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => loadProjects(1, true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-500">
            {searchQuery || statusFilter !== '전체' || dateFilter.start || dateFilter.end
              ? '검색 조건에 맞는 프로젝트가 없습니다.'
              : '등록된 프로젝트가 없습니다.'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {searchQuery || statusFilter !== '전체' || dateFilter.start || dateFilter.end
              ? '검색어나 필터 조건을 변경해보세요.'
              : '위의 "프로젝트 추가" 버튼을 클릭하여 새 프로젝트를 생성하세요.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => {
                  if (onViewDetail) {
                    onViewDetail(String(project.id));
                  } else {
                    navigate(`/admin/projects/${project.id}`);
                  }
                }}
              />
            ))}
          </div>

          {/* 무한 스크롤 감지 영역 */}
          {hasMore && (
            <div ref={observerTarget} className="flex items-center justify-center py-8">
              {loadingMore ? (
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">더 많은 프로젝트를 불러오는 중...</p>
                </div>
              ) : (
                <div className="h-20" /> // 스크롤 감지를 위한 공간
              )}
            </div>
          )}

          {/* 더 이상 불러올 데이터가 없을 때 */}
          {!hasMore && projects.length > 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              모든 프로젝트를 불러왔습니다.
            </div>
          )}
        </>
      )}

      {/* 프로젝트 생성 모달 */}
      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadProjects(1, true)}
      />
    </div>
  );
}
