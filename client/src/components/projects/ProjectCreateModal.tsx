import { useState } from "react";
import { X, Image as ImageIcon, Plus } from "lucide-react";
import { createProject, uploadInitialImages, createReferenceLink } from "../../api/projectApi";
import { ProjectStatusSelector } from "./ProjectStatusSelector";
import { LinkInputField } from "./LinkInputField";

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LinkInput {
  title: string;
  url: string;
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'진행중' | '홀딩중' | '취소' | '완성'>('진행중');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [requirements, setRequirements] = useState('');
  const [initialImages, setInitialImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkInput[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...initialImages, ...files];
    setInitialImages(newFiles);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const previewToRemove = imagePreviews[index];
    URL.revokeObjectURL(previewToRemove);
    setInitialImages(initialImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    setLinks([...links, { title: '', url: '' }]);
  };

  const handleUpdateLink = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('프로젝트명을 입력해주세요.');
      return;
    }

    if (!startDate) {
      alert('시작일을 선택해주세요.');
      return;
    }

    // URL 검증
    for (const link of links) {
      if (link.url.trim()) {
        try {
          new URL(link.url);
        } catch {
          alert('유효하지 않은 URL 형식입니다.');
          return;
        }
      }
    }

    try {
      setIsCreating(true);

      // 프로젝트 생성
      const project = await createProject({
        name: name.trim(),
        status,
        start_date: startDate,
        requirements: requirements.trim() || undefined,
      });

      // 초기 이미지 업로드
      if (initialImages.length > 0) {
        await uploadInitialImages(project.id, initialImages);
      }

      // 참고 링크 추가
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link.url.trim()) {
          await createReferenceLink(project.id, {
            title: link.title.trim() || undefined,
            url: link.url.trim(),
            display_order: i,
          });
        }
      }

      // 정리
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('프로젝트 생성 오류:', error);
      alert(error.message || '프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setStatus('진행중');
    setStartDate(new Date().toISOString().split('T')[0]);
    setRequirements('');
    setInitialImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setLinks([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">프로젝트 추가</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 프로젝트명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트명 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="프로젝트명을 입력하세요"
            />
          </div>

          {/* 상태 및 시작일 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태 *
              </label>
              <ProjectStatusSelector value={status} onChange={setStatus} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일 *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 요청 사항 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              요청 사항
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="요청 사항을 입력하세요"
            />
          </div>

          {/* 참고 링크 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                참고 링크
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                링크 추가
              </button>
            </div>
            <div className="space-y-2">
              {links.map((link, index) => (
                <LinkInputField
                  key={index}
                  title={link.title}
                  url={link.url}
                  onTitleChange={(value) => handleUpdateLink(index, 'title', value)}
                  onUrlChange={(value) => handleUpdateLink(index, 'url', value)}
                  onDelete={() => handleRemoveLink(index)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* 초기 사진 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              초기 사진
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors">
              <ImageIcon className="w-4 h-4" />
              <span>사진 추가</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-3 mt-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={preview}
                      alt={`미리보기 ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 bg-white rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isCreating}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isCreating}
          >
            {isCreating ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </div>
  );
}

