import { useState, useRef, useEffect } from 'react';
import type { MessageTag } from '../types';
import { createMessage, uploadProductImages, getMentionableUsers, type MentionableUser } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ImageModal } from '../shared/ImageModal';
import { ImagePlus, AtSign } from 'lucide-react';

/** 선택한 파일과 미리보기용 object URL */
interface FileWithPreview {
  file: File;
  objectUrl: string;
}

const TAG_VALUES: (MessageTag | '')[] = [
  '',
  'REQUEST',
  'RESEARCH',
  'CANDIDATE',
  'SAMPLE',
  'PRICE',
  'DECISION',
  'FINAL',
];

interface ThreadComposerProps {
  productId: number;
  onSent: (newMessage?: import('../types').ProductCollabMessage) => void;
}

export function ThreadComposer({ productId, onSent }: ThreadComposerProps) {
  const { t } = useLanguage();
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<MessageTag | ''>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pendingUrl, setPendingUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMentionableUsers().then((res) => {
      if (res.success && res.data) setMentionableUsers(res.data);
    });
  }, []);

  useEffect(() => {
    return () => {
      selectedFiles.forEach(({ objectUrl }) => URL.revokeObjectURL(objectUrl));
    };
  }, [selectedFiles]);

  const addImageUrl = () => {
    const url = pendingUrl.trim();
    if (!url) return;
    try {
      new URL(url);
      setImageUrls((prev) => [...prev, url]);
      setPendingUrl('');
      setError(null);
    } catch {
      setError(t('productCollab.invalidUrl'));
    }
  };

  const removeImageUrl = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newEntries: FileWithPreview[] = Array.from(files).map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newEntries]);
    setError(null);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].objectUrl);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = body.trim() || imageUrls.length > 0 || selectedFiles.length > 0;
    if (!hasContent) {
      setError(t('productCollab.enterContentOrImage'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const filesToUpload = selectedFiles.map(({ file }) => file);
        const uploadRes = await uploadProductImages(productId, filesToUpload);
        if (!uploadRes.success || !uploadRes.data?.urls?.length) {
          throw new Error(uploadRes.error ?? t('productCollab.uploadFailed'));
        }
        uploadedUrls = uploadRes.data.urls;
        selectedFiles.forEach(({ objectUrl }) => URL.revokeObjectURL(objectUrl));
      }
      const attachment_urls = [
        ...uploadedUrls.map((url) => ({ kind: 'image' as const, url })),
        ...imageUrls.map((url) => ({ kind: 'image' as const, url })),
      ];
      const res = await createMessage(productId, {
        body: body.trim() || null,
        tag: tag || null,
        attachment_urls: attachment_urls.length ? attachment_urls : undefined,
        mention_user_ids: selectedMentionIds.length > 0 ? selectedMentionIds : undefined,
      });
      if (!res.success) throw new Error(res.error);
      setBody('');
      setTag('');
      setImageUrls([]);
      setSelectedFiles([]);
      setSelectedMentionIds([]);
      onSent(res.data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
      <div className="space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('productCollab.placeholderMessage')}
          rows={3}
          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tag}
            onChange={(e) => setTag((e.target.value || '') as MessageTag | '')}
            className="px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm"
          >
            {TAG_VALUES.map((tagVal) => (
              <option key={tagVal || 'none'} value={tagVal}>
                {tagVal ? t('productCollab.tag.' + tagVal) : t('productCollab.noTag')}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg border border-[#E5E7EB]"
          >
            <ImagePlus className="w-4 h-4" />
            {t('productCollab.uploadImage')}
          </button>
        </div>
        {/* URL 입력: 새 줄에 전체 너비로 배치 (모바일에서 넓게) */}
        <div className="w-full flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={pendingUrl}
            onChange={(e) => setPendingUrl(e.target.value)}
            placeholder={t('productCollab.addImageUrl')}
            className="w-full min-w-0 px-3 py-2.5 sm:py-1.5 border border-[#E5E7EB] rounded-lg text-sm text-[#1F2937]"
          />
          <button
            type="button"
            onClick={addImageUrl}
            className="px-3 py-2.5 sm:py-1.5 text-sm text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg shrink-0 border border-[#E5E7EB]"
          >
            {t('productCollab.addUrl')}
          </button>
        </div>
        {/* 멘션할 사람 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#6B7280]">{t('productCollab.mention')}:</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMentionDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg border border-[#E5E7EB]"
            >
              <AtSign className="w-4 h-4" />
              {t('productCollab.addMention')}
            </button>
            {mentionDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setMentionDropdownOpen(false)}
                />
                <ul className="absolute left-0 top-full mt-1 z-20 min-w-[160px] max-h-48 overflow-auto bg-white border border-[#E5E7EB] rounded-lg shadow py-1">
                  {mentionableUsers
                    .filter((u) => !selectedMentionIds.includes(u.id))
                    .map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-[#1F2937] hover:bg-[#F3F4F6]"
                          onClick={() => {
                            setSelectedMentionIds((prev) => [...prev, u.id]);
                            setMentionDropdownOpen(false);
                          }}
                        >
                          {u.name}
                        </button>
                      </li>
                    ))}
                  {mentionableUsers.filter((u) => !selectedMentionIds.includes(u.id)).length === 0 && (
                    <li className="px-3 py-2 text-sm text-[#6B7280]">{t('productCollab.noUsersToAdd')}</li>
                  )}
                </ul>
              </>
            )}
          </div>
          {selectedMentionIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMentionIds.map((id) => {
                const u = mentionableUsers.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[#EFF6FF] text-[#2563EB] rounded-full"
                  >
                    @{u?.name ?? id}
                    <button
                      type="button"
                      onClick={() => setSelectedMentionIds((prev) => prev.filter((x) => x !== id))}
                      className="hover:text-[#1D4ED8]"
                      aria-label={t('productCollab.remove')}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {selectedFiles.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {selectedFiles.map((item, i) => (
              <li key={item.objectUrl} className="relative group">
                <button
                  type="button"
                  onClick={() => setModalImageUrl(item.objectUrl)}
                  className="w-20 h-20 rounded-lg border border-[#E5E7EB] overflow-hidden bg-[#F8F9FB] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <img
                    src={item.objectUrl}
                    alt={item.file.name}
                    className="max-w-full max-h-full object-contain cursor-pointer"
                  />
                </button>
                <p className="mt-1 text-xs text-[#6B7280] max-w-[88px] truncate" title={item.file.name}>
                  {item.file.name}
                </p>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-0 right-0 rounded-bl bg-red-500 text-white text-xs px-1.5 py-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity"
                  aria-label={t('common.delete')}
                >
                  {t('common.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />
        {imageUrls.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <li key={i} className="flex items-center gap-1 text-xs">
                <span className="max-w-[120px] truncate text-[#6B7280]">{url}</span>
                <button
                  type="button"
                  onClick={() => removeImageUrl(i)}
                  className="text-red-600 hover:underline"
                >
                  {t('common.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {submitting ? t('productCollab.sending') : t('productCollab.send')}
          </button>
        </div>
      </div>
    </form>
  );
}
