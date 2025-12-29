import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Calendar, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { MemoSection, type Memo, type Reply } from './MemoSection';
import { ProductImagePreview } from './ui/product-image-preview';
import {
  getProjectById,
  createProjectEntry,
  updateProjectEntry,
  deleteProjectEntry,
  uploadEntryImages,
  deleteEntryImage,
  upsertImageReaction,
  createComment,
  deleteComment,
  createCommentReply,
  deleteCommentReply,
  getFullImageUrl,
  type ProjectPublic,
  type ProjectEntry as ApiProjectEntry,
} from '../api/projectApi';

// 클라이언트용 인터페이스 (서버 응답 구조와 호환)
interface ProjectEntryImage {
  id: number;
  image_url: string;
  display_order: number;
  reactions?: Array<{ id: number; user_id: string; reaction: 'like' | 'dislike' }>;
}

interface ProjectEntryComment {
  id: number | string;
  content: string;
  userId: string;
  createdAt: string | Date;
  replies: Array<{
    id: number | string;
    content: string;
    userId: string;
    createdAt: string | Date;
  }>;
}

interface ProjectEntry {
  id: number | string;
  date: string;
  title: string;
  content: string;
  images: ProjectEntryImage[];
  comments: ProjectEntryComment[];
}

interface Project extends ProjectPublic {
  entries: ProjectEntry[];
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string>('');
  const [newEntryTitle, setNewEntryTitle] = useState<string>('');
  const [newEntryContent, setNewEntryContent] = useState<string>('');
  const [newEntryImages, setNewEntryImages] = useState<File[]>([]);
  const [newEntryImagePreviews, setNewEntryImagePreviews] = useState<string[]>([]);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  
  // 댓글 관련 상태 (각 항목별로 관리)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, Record<string, string>>>({});
  
  // 이미지 좋아요/싫어요 상태 (entryId -> imageId -> reaction)
  const [imageReactions, setImageReactions] = useState<Record<string, Record<number, 'like' | 'dislike' | null>>>({});
  
  // 마우스 오버 관련 상태
  const [hoveredImage, setHoveredImage] = useState<{ entryId: string; imageIndex: number; imageUrl: string } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
      const projectData = await getProjectById(Number(id));
      
      // 서버 응답을 클라이언트 인터페이스로 변환
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      
      // 이미지 반응 상태 초기화
      const reactions: Record<string, Record<number, 'like' | 'dislike' | null>> = {};
      convertedProject.entries.forEach(entry => {
        entry.images.forEach((img, idx) => {
          // 사용자별 반응은 나중에 현재 사용자 반응만 추출
          if (img.reactions && img.reactions.length > 0) {
            // TODO: 현재 사용자 ID로 필터링 필요
            reactions[String(entry.id)] = reactions[String(entry.id)] || {};
            reactions[String(entry.id)][img.id] = img.reactions[0].reaction as 'like' | 'dislike';
          }
        });
      });
      setImageReactions(reactions);
      
      setProject(convertedProject);
    } catch (error: any) {
      console.error('프로젝트 조회 오류:', error);
      alert(error.message || '프로젝트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 서버 응답을 클라이언트 인터페이스로 변환
  const convertEntryToClient = (entry: ApiProjectEntry): ProjectEntry => {
    return {
      id: entry.id,
      date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString().split('T')[0],
      title: entry.title,
      content: entry.content || '',
      images: (entry.images || []).map(img => ({
        id: img.id,
        image_url: img.image_url,
        display_order: img.display_order,
        reactions: img.reactions || [],
      })),
      comments: (entry.comments || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.user_id,
        createdAt: typeof comment.created_at === 'string' ? comment.created_at : comment.created_at.toISOString(),
        replies: (comment.replies || []).map(reply => ({
          id: reply.id,
          content: reply.content,
          userId: reply.user_id,
          createdAt: typeof reply.created_at === 'string' ? reply.created_at : reply.created_at.toISOString(),
        })),
      })),
    };
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
    setNewEntryImagePreviews([]);
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, entryId?: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (entryId && project) {
      // 기존 항목에 이미지 추가 - 서버에 업로드
      handleUploadImages(entryId, files);
    } else {
      // 새 항목에 이미지 추가 - 미리보기만
      const newFiles = [...newEntryImages, ...files];
      setNewEntryImages(newFiles);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setNewEntryImagePreviews([...newEntryImagePreviews, ...newPreviews]);
    }
    
    e.target.value = '';
  };

  // 이미지 업로드
  const handleUploadImages = async (entryId: string, files: File[]) => {
    if (!id || !project) return;

    try {
      const projectData = await uploadEntryImages(Number(id), Number(entryId), files);
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
    } catch (error: any) {
      console.error('이미지 업로드 오류:', error);
      alert(error.message || '이미지 업로드에 실패했습니다.');
    }
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = async (imageId: number, entryId: string) => {
    if (!id || !project) return;

    try {
      const projectData = await deleteEntryImage(Number(id), Number(entryId), imageId);
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
    } catch (error: any) {
      console.error('이미지 삭제 오류:', error);
      alert(error.message || '이미지 삭제에 실패했습니다.');
    }
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
      const projectData = await createProjectEntry(
        Number(id),
        {
          date: newEntryDate,
          title: newEntryTitle,
          content: newEntryContent || undefined,
        },
        newEntryImages.length > 0 ? newEntryImages : undefined
      );
      
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      
      // 날짜 기준 내림차순 정렬
      convertedProject.entries.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setProject(convertedProject);
      
      // 미리보기 URL 정리
      newEntryImagePreviews.forEach(url => URL.revokeObjectURL(url));
      setNewEntryImages([]);
      setNewEntryImagePreviews([]);
      handleCancelAddEntry();
    } catch (error: any) {
      console.error('항목 추가 오류:', error);
      alert(error.message || '항목 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 항목 삭제
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    if (!id || !project) return;

    try {
      const projectData = await deleteProjectEntry(Number(id), Number(entryId));
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
    } catch (error: any) {
      console.error('항목 삭제 오류:', error);
      alert(error.message || '항목 삭제에 실패했습니다.');
    }
  };

  // 항목 업데이트 (debounce 없이 즉시 저장)
  const handleUpdateEntry = async (entryId: string, field: 'title' | 'content' | 'date', value: string) => {
    if (!id || !project) return;

    try {
      const updateData: { title?: string; content?: string; date?: string } = {};
      updateData[field] = value;

      const projectData = await updateProjectEntry(Number(id), Number(entryId), updateData);
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      
      // 날짜 필드가 변경된 경우 최신 날짜가 위로 오도록 정렬
      if (field === 'date') {
        convertedProject.entries.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      }
      
      setProject(convertedProject);
    } catch (error: any) {
      console.error('항목 업데이트 오류:', error);
      alert(error.message || '항목 업데이트에 실패했습니다.');
    }
  };

  // 댓글 추가
  const handleAddComment = async (entryId: string) => {
    const commentContent = commentInputs[entryId]?.trim();
    if (!commentContent || !id || !project) return;

    try {
      const projectData = await createComment(Number(id), Number(entryId), commentContent);
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
      setCommentInputs({ ...commentInputs, [entryId]: '' });
    } catch (error: any) {
      console.error('댓글 추가 오류:', error);
      alert(error.message || '댓글 추가에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (entryId: string, commentId: string) => {
    if (!id || !project) return;

    try {
      const projectData = await deleteComment(Number(id), Number(entryId), Number(commentId));
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
    } catch (error: any) {
      console.error('댓글 삭제 오류:', error);
      alert(error.message || '댓글 삭제에 실패했습니다.');
    }
  };

  // 답글 추가
  const handleAddReply = async (entryId: string, commentId: string) => {
    const replyContent = replyInputs[entryId]?.[commentId]?.trim();
    if (!replyContent || !id || !project) return;

    try {
      const projectData = await createCommentReply(Number(id), Number(entryId), Number(commentId), replyContent);
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
      setReplyInputs({
        ...replyInputs,
        [entryId]: {
          ...replyInputs[entryId],
          [commentId]: '',
        },
      });
    } catch (error: any) {
      console.error('답글 추가 오류:', error);
      alert(error.message || '답글 추가에 실패했습니다.');
    }
  };

  // 답글 삭제
  const handleDeleteReply = async (entryId: string, commentId: string, replyId: string) => {
    if (!id || !project) return;

    try {
      const projectData = await deleteCommentReply(Number(id), Number(entryId), Number(commentId), Number(replyId));
      const convertedProject: Project = {
        ...projectData,
        entries: (projectData.entries || []).map(convertEntryToClient),
      };
      setProject(convertedProject);
    } catch (error: any) {
      console.error('답글 삭제 오류:', error);
      alert(error.message || '답글 삭제에 실패했습니다.');
    }
  };

  // 이미지 반응(좋아요/싫어요) 변경 핸들러
  const handleImageReactionChange = async (entryId: string, imageId: number, reaction: 'like' | 'dislike' | null) => {
    if (!id) return;

    const currentReaction = imageReactions[entryId]?.[imageId] || null;
    const newReaction = currentReaction === reaction ? null : reaction;

    // 낙관적 업데이트
    setImageReactions(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [imageId]: newReaction,
      },
    }));

    if (newReaction) {
      try {
        await upsertImageReaction(Number(id), Number(entryId), imageId, newReaction);
        // 성공 시 프로젝트 다시 로드하여 반응 수 반영
        await loadProject();
      } catch (error: any) {
        console.error('이미지 반응 저장 오류:', error);
        // 실패 시 원래 상태로 복구
        setImageReactions(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            [imageId]: currentReaction,
          },
        }));
        alert(error.message || '반응 저장에 실패했습니다.');
      }
    } else {
      // 반응 제거 (서버에서 반응 삭제 API 필요 시 구현)
      // 현재는 upsertImageReaction을 호출하지 않음
      try {
        await loadProject();
      } catch (error: any) {
        console.error('이미지 반응 제거 오류:', error);
        setImageReactions(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            [imageId]: currentReaction,
          },
        }));
      }
    }
  };

  // 마우스 이동 핸들러
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // 이미지 호버 시작
  const handleImageHoverEnter = (entryId: string, imageIndex: number, imageUrl: string) => {
    const fullUrl = getFullImageUrl(imageUrl);
    setHoveredImage({ entryId, imageIndex, imageUrl: fullUrl });
  };

  // 이미지 호버 종료
  const handleImageHoverLeave = () => {
    setHoveredImage(null);
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
                  <ImageIcon className="w-4 h-4" />
                  <span>사진 추가</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e)}
                    className="hidden"
                  />
                </label>
                {newEntryImagePreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-4 mt-2">
                    {newEntryImagePreviews.map((preview, index) => {
                      const currentReaction = imageReactions['new']?.[index] || null;
                      const isHovered = hoveredImage?.entryId === 'new' && hoveredImage?.imageIndex === index;

                      return (
                        <div 
                          key={index} 
                          className="relative group"
                          onMouseEnter={() => handleImageHoverEnter('new', index, preview)}
                          onMouseLeave={handleImageHoverLeave}
                          onMouseMove={handleMouseMove}
                        >
                          <div
                            className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer shadow-sm"
                            onClick={() => setSelectedImage(preview)}
                          >
                            <img
                              src={preview}
                              alt={`미리보기 ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                            {/* 삭제 버튼 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const previewToRemove = newEntryImagePreviews[index];
                                URL.revokeObjectURL(previewToRemove);
                                const newFiles = newEntryImages.filter((_, i) => i !== index);
                                const newPreviews = newEntryImagePreviews.filter((_, i) => i !== index);
                                setNewEntryImages(newFiles);
                                setNewEntryImagePreviews(newPreviews);
                              }}
                              className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                              title="삭제"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                            {/* 이미지 번호 */}
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                              #{index + 1}
                            </div>
                          </div>
                          {/* 마우스 오버 미리보기 */}
                          {isHovered && (
                            <ProductImagePreview
                              imageUrl={preview}
                              mousePosition={mousePosition}
                              isVisible={true}
                              size={320}
                            />
                          )}
                        </div>
                      );
                    })}
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
        {project.entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">등록된 항목이 없습니다.</p>
            <p className="text-sm mt-2">위의 "항목 추가" 버튼을 클릭하여 새 항목을 추가하세요.</p>
          </div>
        ) : (
          project.entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              {/* 항목 헤더 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleUpdateEntry(String(entry.id), 'date', e.target.value)}
                      className="text-sm font-medium text-gray-600 border-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1 -ml-2"
                    />
                  </div>
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => handleUpdateEntry(String(entry.id), 'title', e.target.value)}
                    className="text-xl font-bold text-gray-900 w-full border-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1 -ml-2"
                    placeholder="제목을 입력하세요"
                  />
                </div>
                <button
                  onClick={() => handleDeleteEntry(String(entry.id))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* 내용 */}
              <div className="mb-4">
                <textarea
                  value={entry.content}
                  onChange={(e) => handleUpdateEntry(String(entry.id), 'content', e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* 사진 */}
              {entry.images.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-5 gap-4">
                    {entry.images.map((img, index) => {
                      const fullUrl = getFullImageUrl(img.image_url);
                      const currentReaction = imageReactions[String(entry.id)]?.[img.id] || null;
                      const isHovered = hoveredImage?.entryId === String(entry.id) && hoveredImage?.imageIndex === index;

                      return (
                        <div
                          key={img.id}
                          className="relative group"
                          onMouseEnter={() => handleImageHoverEnter(String(entry.id), index, img.image_url)}
                          onMouseLeave={handleImageHoverLeave}
                          onMouseMove={handleMouseMove}
                        >
                          <div
                            className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer shadow-sm"
                            onClick={() => setSelectedImage(fullUrl)}
                          >
                            <img
                              src={fullUrl}
                              alt={`사진 ${index + 1}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error('이미지 로드 실패:', img.image_url);
                                (e.target as HTMLImageElement).src = '';
                              }}
                            />
                            {/* 좋아요/싫어요 버튼 */}
                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageReactionChange(String(entry.id), img.id, 'like');
                                }}
                                className={`p-1.5 rounded-md shadow-md transition-all ${
                                  currentReaction === 'like'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-gray-600 hover:bg-blue-50'
                                }`}
                                title="좋아요"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageReactionChange(String(entry.id), img.id, 'dislike');
                                }}
                                className={`p-1.5 rounded-md shadow-md transition-all ${
                                  currentReaction === 'dislike'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-white text-gray-600 hover:bg-red-50'
                                }`}
                                title="싫어요"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                            {/* 삭제 버튼 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(img.id, String(entry.id));
                              }}
                              className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                              title="삭제"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                            {/* 이미지 번호 */}
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                              #{index + 1}
                            </div>
                          </div>
                          {/* 마우스 오버 미리보기 */}
                          {isHovered && (
                            <ProductImagePreview
                              imageUrl={fullUrl}
                              mousePosition={mousePosition}
                              isVisible={true}
                              size={320}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 사진 추가 버튼 */}
              <div className="mb-4">
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-green-300 rounded-lg text-sm text-green-700 hover:bg-green-50 cursor-pointer transition-colors w-fit">
                  <ImageIcon className="w-4 h-4" />
                  <span>사진 추가</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, String(entry.id))}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 댓글 섹션 */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <MemoSection
                  memos={entry.comments as Memo[]}
                  newMemoContent={commentInputs[String(entry.id)] || ''}
                  replyInputs={replyInputs[String(entry.id)] || {}}
                  onSetNewMemoContent={(value) =>
                    setCommentInputs({ ...commentInputs, [String(entry.id)]: value })
                  }
                  onSetReplyInputs={(inputs) =>
                    setReplyInputs({ ...replyInputs, [String(entry.id)]: inputs })
                  }
                  onAddMemo={() => handleAddComment(String(entry.id))}
                  onDeleteMemo={(commentId) => handleDeleteComment(String(entry.id), String(commentId))}
                  onAddReply={(commentId) => handleAddReply(String(entry.id), String(commentId))}
                  onDeleteReply={(commentId, replyId) =>
                    handleDeleteReply(String(entry.id), String(commentId), String(replyId))
                  }
                />
              </div>
            </div>
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
