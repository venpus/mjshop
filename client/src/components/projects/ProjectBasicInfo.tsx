import { Image as ImageIcon, ExternalLink, Edit2, Check, X, User } from "lucide-react";
import { useState } from "react";
import { getFullImageUrl, updateProject, deleteInitialImage, type ProjectPublic, type ProjectReferenceLink } from "../../api/projectApi";
import { ProjectReferenceLinks } from "./ProjectReferenceLinks";
import { ProjectStatusSelector } from "./ProjectStatusSelector";

interface ProjectBasicInfoProps {
  project: ProjectPublic;
  onUpdate: () => void;
  onReferenceLinkAdd: (link: { title?: string; url: string }) => Promise<void>;
  onReferenceLinkUpdate: (linkId: number, link: { title?: string; url?: string }) => Promise<void>;
  onReferenceLinkDelete: (linkId: number) => Promise<void>;
  onInitialImageDelete?: (imageId: number) => Promise<void>;
}

export function ProjectBasicInfo({
  project,
  onUpdate,
  onReferenceLinkAdd,
  onReferenceLinkUpdate,
  onReferenceLinkDelete,
  onInitialImageDelete,
}: ProjectBasicInfoProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingRequirements, setIsEditingRequirements] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editRequirements, setEditRequirements] = useState(project.requirements || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      alert('프로젝트명을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await updateProject(project.id, { name: editName.trim() });
      setIsEditingName(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '프로젝트명 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRequirements = async () => {
    try {
      setIsSaving(true);
      await updateProject(project.id, { requirements: editRequirements.trim() || undefined });
      setIsEditingRequirements(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '요청 사항 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 확정된 이미지 필터링
  const confirmedImages = project.entries
    ?.flatMap(entry => entry.images || [])
    .filter(img => img.is_confirmed)
    .sort((a, b) => {
      const dateA = a.confirmed_at ? new Date(a.confirmed_at).getTime() : 0;
      const dateB = b.confirmed_at ? new Date(b.confirmed_at).getTime() : 0;
      return dateB - dateA;
    }) || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>

      {/* 프로젝트명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명</label>
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              disabled={isSaving}
              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsEditingName(false);
                setEditName(project.name);
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <span className="text-sm">취소</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-gray-900">{project.name}</span>
            <button
              onClick={() => setIsEditingName(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 상태 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">진행 상태</label>
        <ProjectStatusSelector
          value={project.status}
          onChange={async (newStatus) => {
            try {
              await updateProject(project.id, { status: newStatus });
              onUpdate();
            } catch (error: any) {
              alert(error.message || '상태 변경에 실패했습니다.');
            }
          }}
        />
      </div>

      {/* 시작일 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
        <span className="text-gray-900">{formatDate(project.start_date)}</span>
      </div>

      {/* 요청 사항 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">요청 사항</label>
        {isEditingRequirements ? (
          <div className="space-y-2">
            <textarea
              value={editRequirements}
              onChange={(e) => setEditRequirements(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="요청 사항을 입력하세요"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveRequirements}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setIsEditingRequirements(false);
                  setEditRequirements(project.requirements || '');
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="flex-1 text-gray-900 whitespace-pre-wrap">
              {project.requirements || '요청 사항이 없습니다.'}
            </p>
            <button
              onClick={() => setIsEditingRequirements(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors flex-shrink-0"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 초기 사진 */}
      {project.initial_images && project.initial_images.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">초기 사진</label>
          <div className="grid grid-cols-5 gap-3">
            {project.initial_images.map((img) => {
              const fullUrl = getFullImageUrl(img.image_url);
              return (
                <div
                  key={img.id}
                  className="relative group aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-green-300 transition-colors"
                  onClick={() => window.open(fullUrl, '_blank')}
                >
                  <img
                    src={fullUrl}
                    alt={`초기 사진 ${img.display_order + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {onInitialImageDelete && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('이 이미지를 삭제하시겠습니까?')) {
                          try {
                            await deleteInitialImage(project.id, img.id);
                            onUpdate();
                          } catch (error: any) {
                            alert(error.message || '이미지 삭제에 실패했습니다.');
                          }
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                      title="삭제"
                    >
                      <X className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 참고 링크 */}
      <div>
        <ProjectReferenceLinks
          links={project.reference_links || []}
          onAdd={onReferenceLinkAdd}
          onUpdate={onReferenceLinkUpdate}
          onDelete={onReferenceLinkDelete}
        />
      </div>

      {/* 최종 승인 사진 */}
      {confirmedImages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">최종 승인 사진</label>
          <div className="grid grid-cols-5 gap-3">
            {confirmedImages.map((img) => {
              const fullUrl = getFullImageUrl(img.image_url);
              return (
                <div
                  key={img.id}
                  className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-green-500 cursor-pointer hover:border-green-600 transition-colors"
                  onClick={() => window.open(fullUrl, '_blank')}
                >
                  <img
                    src={fullUrl}
                    alt={`확정 사진`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                    확정
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

