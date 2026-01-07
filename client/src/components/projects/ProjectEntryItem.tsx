import { Calendar, Trash2, Image as ImageIcon, Edit2, Check, X } from "lucide-react";
import { useState } from "react";
import { getFullImageUrl, type ProjectEntry, deleteProjectEntry, updateProjectEntry, uploadEntryImages, deleteEntryImage, confirmImage, unconfirmImage, updateEntryImageDescription, createComment, deleteComment, createCommentReply, deleteCommentReply } from "../../api/projectApi";
import { ProjectImageItem } from "./ProjectImageItem";
import { MemoSection, type Memo, type Reply } from "../MemoSection";

interface ProjectEntryItemProps {
  entry: ProjectEntry;
  projectId: number;
  onUpdate: () => void;
  onImageClick?: (imageUrl: string) => void;
  commentInputs: Record<string, string>;
  replyInputs: Record<string, Record<string, string>>;
  onSetCommentInput: (entryId: string, value: string) => void;
  onSetReplyInput: (entryId: string, commentId: string, value: string) => void;
  isLoadingProject?: boolean;
}

export function ProjectEntryItem({
  entry,
  projectId,
  onUpdate,
  onImageClick,
  commentInputs,
  replyInputs,
  onSetCommentInput,
  onSetReplyInput,
  isLoadingProject = false,
}: ProjectEntryItemProps) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editDate, setEditDate] = useState(
    typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString().split('T')[0]
  );
  const [editTitle, setEditTitle] = useState(entry.title);
  const [editContent, setEditContent] = useState(entry.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await updateProjectEntry(projectId, Number(entry.id), { title: editTitle.trim() });
      setIsEditingTitle(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '제목 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setIsSaving(true);
      await updateProjectEntry(projectId, Number(entry.id), { content: editContent.trim() || undefined });
      setIsEditingContent(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '내용 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDate = async () => {
    if (!editDate) {
      alert('날짜를 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await updateProjectEntry(projectId, Number(entry.id), { date: editDate });
      setIsEditingDate(false);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '날짜 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;

    try {
      await deleteProjectEntry(projectId, Number(entry.id));
      onUpdate();
    } catch (error: any) {
      alert(error.message || '항목 삭제에 실패했습니다.');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 프로젝트 로딩 중이면 이미지 업로드 차단
    if (isLoadingProject) {
      alert('프로젝트 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      e.target.value = '';
      return;
    }

    // entry.id 검증
    if (!entry.id || isNaN(Number(entry.id))) {
      alert('항목 정보가 올바르지 않습니다. 페이지를 새로고침해주세요.');
      e.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      await uploadEntryImages(projectId, Number(entry.id), files);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteEntryImage(projectId, Number(entry.id), imageId);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '이미지 삭제에 실패했습니다.');
    }
  };

  const handleConfirmImage = async (imageId: number) => {
    try {
      await confirmImage(projectId, Number(entry.id), imageId);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '이미지 확정에 실패했습니다.');
    }
  };

  const handleUnconfirmImage = async (imageId: number) => {
    try {
      await unconfirmImage(projectId, Number(entry.id), imageId);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '이미지 확정 해제에 실패했습니다.');
    }
  };

  const handleUpdateImageDescription = async (imageId: number, description: string | null) => {
    try {
      await updateEntryImageDescription(projectId, Number(entry.id), imageId, description);
      onUpdate();
    } catch (error: any) {
      alert(error.message || '이미지 설명 업데이트에 실패했습니다.');
      throw error;
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      {/* 항목 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            {isEditingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="text-sm font-medium text-gray-600 border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveDate}
                  disabled={isSaving}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                  title="저장"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingDate(false);
                    setEditDate(
                      typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString().split('T')[0]
                    );
                  }}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="취소"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  {formatDate(entry.date)}
                </span>
                <button
                  onClick={() => setIsEditingDate(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="날짜 편집"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-xl font-bold text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                disabled={isSaving}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setIsEditingTitle(false);
                  setEditTitle(entry.title);
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          ) : (
            <h4
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {entry.title}
            </h4>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* 내용 */}
      {isEditingContent ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="내용을 입력하세요"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveContent}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              저장
            </button>
            <button
              onClick={() => {
                setIsEditingContent(false);
                setEditContent(entry.content || '');
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p
          className="text-gray-700 whitespace-pre-wrap cursor-pointer hover:text-green-600 transition-colors"
          onClick={() => setIsEditingContent(true)}
        >
          {entry.content || '내용을 입력하세요 (클릭하여 편집)'}
        </p>
      )}

      {/* 사진 */}
      {entry.images && entry.images.length > 0 && (
        <div>
          <div className="grid grid-cols-5 gap-3">
            {entry.images.map((img, index) => (
              <ProjectImageItem
                key={img.id}
                image={img}
                index={index}
                onDelete={() => handleDeleteImage(img.id)}
                onConfirm={() => handleConfirmImage(img.id)}
                onUnconfirm={() => handleUnconfirmImage(img.id)}
                onDescriptionUpdate={(description) => handleUpdateImageDescription(img.id, description)}
                onImageClick={onImageClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* 사진 추가 버튼 */}
      <div>
        <label className={`flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed rounded-lg text-sm transition-colors w-fit ${
          isLoadingProject || isUploading
            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
            : 'border-green-300 text-green-700 hover:bg-green-50 cursor-pointer'
        }`}>
          <ImageIcon className="w-4 h-4" />
          <span>사진 추가</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isUploading || isLoadingProject}
          />
        </label>
        {isUploading && (
          <p className="text-xs text-gray-500 mt-1">업로드 중...</p>
        )}
        {isLoadingProject && (
          <p className="text-xs text-gray-500 mt-1">프로젝트 정보를 불러오는 중...</p>
        )}
      </div>

      {/* 댓글 섹션 */}
      <div className="border-t border-gray-200 pt-4">
        <MemoSection
          memos={(entry.comments || []).map(comment => ({
            id: String(comment.id),
            content: comment.content,
            userId: comment.user_id,
            userName: comment.user_name || null,
            createdAt: typeof comment.created_at === 'string' ? comment.created_at : comment.created_at.toISOString(),
            replies: (comment.replies || []).map(reply => ({
              id: String(reply.id),
              content: reply.content,
              userId: reply.user_id,
              userName: reply.user_name || null,
              createdAt: typeof reply.created_at === 'string' ? reply.created_at : reply.created_at.toISOString(),
            })),
          })) as Memo[]}
          newMemoContent={commentInputs[String(entry.id)] || ''}
          replyInputs={replyInputs[String(entry.id)] || {}}
          onSetNewMemoContent={(value) => onSetCommentInput(String(entry.id), value)}
          onSetReplyInputs={(inputs) => {
            // inputs는 { commentId: replyContent } 형태
            // 각 댓글별로 개별 업데이트
            Object.keys(inputs).forEach(commentId => {
              onSetReplyInput(String(entry.id), commentId, inputs[commentId]);
            });
          }}
          onAddMemo={async () => {
            const content = commentInputs[String(entry.id)]?.trim();
            if (!content) return;
            try {
              await createComment(projectId, Number(entry.id), content);
              onSetCommentInput(String(entry.id), '');
              onUpdate();
            } catch (error: any) {
              alert(error.message || '댓글 추가에 실패했습니다.');
            }
          }}
          onDeleteMemo={async (commentId) => {
            try {
              await deleteComment(projectId, Number(entry.id), Number(commentId));
              onUpdate();
            } catch (error: any) {
              alert(error.message || '댓글 삭제에 실패했습니다.');
            }
          }}
          onAddReply={async (commentId) => {
            const replyContent = replyInputs[String(entry.id)]?.[commentId]?.trim();
            if (!replyContent) return;
            try {
              await createCommentReply(projectId, Number(entry.id), Number(commentId), replyContent);
              onSetReplyInput(String(entry.id), commentId, '');
              onUpdate();
            } catch (error: any) {
              alert(error.message || '답글 추가에 실패했습니다.');
            }
          }}
          onDeleteReply={async (commentId, replyId) => {
            try {
              await deleteCommentReply(projectId, Number(entry.id), Number(commentId), Number(replyId));
              onUpdate();
            } catch (error: any) {
              alert(error.message || '답글 삭제에 실패했습니다.');
            }
          }}
        />
      </div>
    </div>
  );
}

