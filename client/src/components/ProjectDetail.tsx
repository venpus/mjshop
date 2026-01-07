import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, X, Eye } from 'lucide-react';
import {
  getProjectById,
  createProjectEntry,
  createComment,
  deleteComment,
  createCommentReply,
  deleteCommentReply,
  createReferenceLink,
  updateReferenceLink,
  deleteReferenceLink,
  deleteInitialImage,
  type ProjectPublic,
} from '../api/projectApi';
import { ProjectBasicInfo } from './projects/ProjectBasicInfo';
import { ProjectEntryItem } from './projects/ProjectEntryItem';
import { ProjectCreateModal } from './projects/ProjectCreateModal';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string>('');
  const [newEntryTitle, setNewEntryTitle] = useState<string>('');
  const [newEntryContent, setNewEntryContent] = useState<string>('');
  const [newEntryImages, setNewEntryImages] = useState<File[]>([]);
  const [newEntryImagePreviews, setNewEntryImagePreviews] = useState<string[]>([]);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  
  // 댓글 관련 상태
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, Record<string, string>>>({});

  // 프로젝트 로드
  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setIsLoadingProject(true);
      const projectData = await getProjectById(Number(id));
      setProject(projectData);
    } catch (error: any) {
      console.error('프로젝트 조회 오류:', error);
      alert(error.message || '프로젝트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
      setIsLoadingProject(false);
    }
  };

  // 새 항목 추가 핸들러
  const handleAddEntry = () => {
    setIsAddingEntry(true);
    setNewEntryDate(new Date().toISOString().split('T')[0]);
    setNewEntryTitle('');
    setNewEntryContent('');
    setNewEntryImages([]);
    setNewEntryImagePreviews([]);
  };

  // 새 항목 취소
  const handleCancelAddEntry = () => {
    setIsAddingEntry(false);
    setNewEntryDate('');
    setNewEntryTitle('');
    setNewEntryContent('');
    setNewEntryImages([]);
    newEntryImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setNewEntryImagePreviews([]);
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...newEntryImages, ...files];
    setNewEntryImages(newFiles);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setNewEntryImagePreviews([...newEntryImagePreviews, ...newPreviews]);
    e.target.value = '';
  };

  // 새 항목 저장
  const handleSaveNewEntry = async () => {
    if (!newEntryDate || !newEntryTitle.trim()) {
      alert('날짜와 제목을 입력해주세요.');
      return;
    }

    if (!id || !project) return;

    try {
      setIsSaving(true);
      await createProjectEntry(
        Number(id),
        {
          date: newEntryDate,
          title: newEntryTitle,
          content: newEntryContent || undefined,
        },
        newEntryImages.length > 0 ? newEntryImages : undefined
      );
      
      // 미리보기 URL 정리
      newEntryImagePreviews.forEach(url => URL.revokeObjectURL(url));
      setNewEntryImages([]);
      setNewEntryImagePreviews([]);
      handleCancelAddEntry();
      await loadProject();
    } catch (error: any) {
      console.error('항목 추가 오류:', error);
      alert(error.message || '항목 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };


  // 참고 링크 추가
  const handleAddReferenceLink = async (link: { title?: string; url: string }) => {
    if (!id || !project) return;

    try {
      await createReferenceLink(Number(id), link);
      await loadProject();
    } catch (error: any) {
      alert(error.message || '참고 링크 추가에 실패했습니다.');
      throw error;
    }
  };

  // 참고 링크 수정
  const handleUpdateReferenceLink = async (linkId: number, link: { title?: string; url?: string }) => {
    if (!id || !project) return;

    try {
      await updateReferenceLink(Number(id), linkId, link);
      await loadProject();
    } catch (error: any) {
      alert(error.message || '참고 링크 수정에 실패했습니다.');
      throw error;
    }
  };

  // 참고 링크 삭제
  const handleDeleteReferenceLink = async (linkId: number) => {
    if (!id || !project) return;

    try {
      await deleteReferenceLink(Number(id), linkId);
      await loadProject();
    } catch (error: any) {
      alert(error.message || '참고 링크 삭제에 실패했습니다.');
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 min-h-[1080px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 min-h-[1080px]">
        <div className="text-center text-gray-500">
          <p>프로젝트를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/admin/projects')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const startDate = typeof project.start_date === 'string' ? project.start_date : project.start_date.toISOString().split('T')[0];

  return (
    <div className="p-8 min-h-[1080px]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/projects')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              시작일: {formatDate(startDate)}
            </p>
          </div>
        </div>
        <button
          onClick={handleAddEntry}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>항목 추가</span>
        </button>
      </div>

      {/* 기본 정보 영역 */}
      <div className="mb-6">
        <ProjectBasicInfo
          project={project}
          onUpdate={loadProject}
          onReferenceLinkAdd={handleAddReferenceLink}
          onReferenceLinkUpdate={handleUpdateReferenceLink}
          onReferenceLinkDelete={handleDeleteReferenceLink}
          onInitialImageDelete={async (imageId) => {
            if (!id) return;
            try {
              await deleteInitialImage(Number(id), imageId);
              await loadProject();
            } catch (error: any) {
              alert(error.message || '초기 이미지 삭제에 실패했습니다.');
              throw error;
            }
          }}
        />
      </div>

      {/* 조회 이력 */}
      {project.recent_viewers && project.recent_viewers.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">최근 조회자</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.recent_viewers.slice(0, 10).map((viewer, index) => (
              <span
                key={`${viewer.user_id}-${index}`}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {viewer.user_name || viewer.user_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 새 항목 추가 폼 */}
      {isAddingEntry && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">새 항목 추가</h3>
            <button
              onClick={handleCancelAddEntry}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                날짜 *
              </label>
              <input
                type="date"
                value={newEntryDate}
                onChange={(e) => setNewEntryDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 *
              </label>
              <input
                type="text"
                value={newEntryTitle}
                onChange={(e) => setNewEntryTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                value={newEntryContent}
                onChange={(e) => setNewEntryContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사진
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-green-300 rounded-lg text-sm text-green-700 hover:bg-green-50 cursor-pointer transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span>사진 추가</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                {newEntryImagePreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-4 mt-2">
                    {newEntryImagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img
                          src={preview}
                          alt={`미리보기 ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => {
                            const previewToRemove = newEntryImagePreviews[index];
                            URL.revokeObjectURL(previewToRemove);
                            setNewEntryImages(newEntryImages.filter((_, i) => i !== index));
                            setNewEntryImagePreviews(newEntryImagePreviews.filter((_, i) => i !== index));
                          }}
                          className="absolute top-2 right-2 p-1 bg-white rounded shadow-md hover:bg-red-50"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelAddEntry}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveNewEntry}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 항목 목록 */}
      <div className="space-y-6">
        {!project.entries || project.entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">등록된 항목이 없습니다.</p>
            <p className="text-sm mt-2">위의 "항목 추가" 버튼을 클릭하여 새 항목을 추가하세요.</p>
          </div>
        ) : (
          project.entries.map((entry) => (
            <ProjectEntryItem
              key={entry.id}
              entry={entry}
              projectId={project.id}
              onUpdate={loadProject}
              onImageClick={(imageUrl) => setSelectedImage(imageUrl)}
              commentInputs={commentInputs}
              replyInputs={replyInputs}
              onSetCommentInput={(entryId, value) => {
                setCommentInputs({ ...commentInputs, [entryId]: value });
              }}
              onSetReplyInput={(entryId, commentId, value) => {
                setReplyInputs({
                  ...replyInputs,
                  [entryId]: {
                    ...replyInputs[entryId],
                    [commentId]: value,
                  },
                });
              }}
            />
          ))
        )}
      </div>

      {/* 이미지 모달 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
            <img
              src={selectedImage}
              alt="확대 이미지"
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
