import { Calendar, User, FileText, Clock, MessageSquare } from "lucide-react";
import { getFullImageUrl } from "../../api/projectApi";
import type { ProjectListItem } from "../../api/projectApi";
import { ProjectStatusSelector } from "./ProjectStatusSelector";

interface ProjectCardProps {
  project: ProjectListItem;
  onClick: () => void;
  onStatusChange?: (status: ProjectListItem['status']) => void;
}

export function ProjectCard({ project, onClick, onStatusChange }: ProjectCardProps) {
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusColor = (status: ProjectListItem['status']) => {
    switch (status) {
      case '진행중':
        return 'bg-blue-100 text-blue-800';
      case '홀딩중':
        return 'bg-yellow-100 text-yellow-800';
      case '취소':
        return 'bg-gray-100 text-gray-800';
      case '완성':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBorderColor = (status: ProjectListItem['status']) => {
    switch (status) {
      case '홀딩중':
        return 'border-red-500 border-2';
      case '완성':
        return 'border-green-500 border-2';
      case '취소':
        return 'border-orange-500 border-2';
      case '진행중':
      default:
        return 'border-gray-200 border';
    }
  };

  const thumbnailUrl = project.confirmed_image_url || project.thumbnail_image_url;
  const imageUrl = thumbnailUrl ? getFullImageUrl(thumbnailUrl) : null;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${getStatusBorderColor(project.status)}`}
      onClick={onClick}
    >
      {/* 썸네일 이미지 */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={project.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Calendar className="w-12 h-12" />
          </div>
        )}
        {/* 상태 배지 (이미지 위) */}
        <div className="absolute top-2 right-2">
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              project.status
            )}`}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* 카드 내용 */}
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
          {project.name}
        </h3>

        {/* 요청사항 */}
        {project.requirements && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">요청사항</span>
            </div>
            <p className="text-xs text-gray-700 line-clamp-1 bg-blue-50 px-2 py-1 rounded">
              {project.requirements}
            </p>
          </div>
        )}

        {/* 최종 업데이트 */}
        {(project.last_entry_content || project.last_comment_content) && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-700">최종 업데이트</span>
            </div>
            
            {/* 항목 내용 */}
            {project.last_entry_content && (
              <div className="bg-green-50 px-2 py-1 rounded space-y-1">
                <p className="text-xs text-gray-700 line-clamp-1">
                  {project.last_entry_content}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{project.last_entry_author_name || '관리자'}</span>
                  {project.last_entry_date && (
                    <>
                      <span>•</span>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(project.last_entry_date)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* 최신 댓글 */}
            {project.last_comment_content && (
              <div className="bg-amber-50 px-2 py-1 rounded border-l-2 border-amber-400 space-y-1">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">최신 댓글</span>
                </div>
                <p className="text-xs text-gray-700 line-clamp-1">
                  {project.last_comment_content}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{project.last_comment_author_name || '관리자'}</span>
                  {project.last_comment_date && (
                    <>
                      <span>•</span>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(project.last_comment_date)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 작성자 및 시작일 */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{project.creator_name || '관리자'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(project.start_date)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

