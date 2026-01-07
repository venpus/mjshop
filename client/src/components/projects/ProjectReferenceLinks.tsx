import { Plus, ExternalLink, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { LinkInputField } from "./LinkInputField";
import type { ProjectReferenceLink } from "../../api/projectApi";

interface ProjectReferenceLinksProps {
  links: ProjectReferenceLink[];
  onAdd: (link: { title?: string; url: string }) => Promise<void>;
  onUpdate: (linkId: number, link: { title?: string; url?: string }) => Promise<void>;
  onDelete: (linkId: number) => Promise<void>;
  isLoading?: boolean;
}

export function ProjectReferenceLinks({
  links,
  onAdd,
  onUpdate,
  onDelete,
  isLoading = false,
}: ProjectReferenceLinksProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    try {
      await onAdd({ title: newLinkTitle.trim() || undefined, url: newLinkUrl.trim() });
      setNewLinkTitle('');
      setNewLinkUrl('');
      setIsAdding(false);
    } catch (error: any) {
      alert(error.message || '링크 추가에 실패했습니다.');
    }
  };

  const handleStartEdit = (link: ProjectReferenceLink) => {
    setEditingId(link.id);
    setEditTitle(link.title || '');
    setEditUrl(link.url);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    try {
      await onUpdate(editingId, {
        title: editTitle.trim() || undefined,
        url: editUrl.trim(),
      });
      setEditingId(null);
      setEditTitle('');
      setEditUrl('');
    } catch (error: any) {
      alert(error.message || '링크 수정에 실패했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditUrl('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">참고 링크</h4>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            링크 추가
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-2">
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="링크 제목 (선택)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddLink}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                추가
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewLinkTitle('');
                  setNewLinkUrl('');
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {links.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500">등록된 링크가 없습니다.</p>
      )}

      {links.map((link) => (
        <div key={link.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 group">
          {editingId === link.id ? (
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="링크 제목 (선택)"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                {link.title ? (
                  <div className="text-sm font-medium text-gray-900 truncate">{link.title}</div>
                ) : null}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 truncate block flex items-center gap-1"
                >
                  {link.url}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleStartEdit(link)}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  title="편집"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('이 링크를 삭제하시겠습니까?')) {
                      onDelete(link.id);
                    }
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

