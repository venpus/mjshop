import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { MessageTag } from '../types';
import { createMessage, uploadProductImages, getMentionableUsers, type MentionableUser } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ImageModal } from '../shared/ImageModal';
import { VideoModal } from '../shared/VideoModal';
import { ImagePlus, AtSign } from 'lucide-react';
import { VideoAttachmentThumb } from './VideoAttachmentThumb';
import { isVideoByName } from '../utils/fileKind';

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
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  /** @ 입력 시 검색어(커서 앞 문자열). 빈 문자열이면 @ 직후 */
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLUListElement>(null);
  const mentionButtonRef = useRef<HTMLButtonElement>(null);
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const DROPDOWN_MAX_H = 192;
  const [atDropdownPos, setAtDropdownPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const [addMentionDropdownPos, setAddMentionDropdownPos] = useState<{ top: number; left: number } | null>(null);

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

  useLayoutEffect(() => {
    if (mentionQuery === null || !mentionDropdownOpen) {
      setAtDropdownPos(null);
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - rect.bottom - 8 : 300;
    const openUp = spaceBelow < DROPDOWN_MAX_H;
    setAtDropdownPos({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - DROPDOWN_MAX_H - 4 : rect.bottom + 4,
      openUp,
    });
  }, [mentionQuery, mentionDropdownOpen]);

  useLayoutEffect(() => {
    if (!mentionDropdownOpen || mentionQuery !== null) {
      setAddMentionDropdownPos(null);
      return;
    }
    const el = mentionButtonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - rect.bottom - 8 : 300;
    const openUp = spaceBelow < DROPDOWN_MAX_H;
    setAddMentionDropdownPos({
      left: rect.left,
      top: openUp ? rect.top - DROPDOWN_MAX_H - 4 : rect.bottom + 4,
    });
  }, [mentionDropdownOpen, mentionQuery]);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].objectUrl);
      return next;
    });
  };

  /** 본문에 남아 있는 @이름 기준으로 맨션 ID 목록 동기화 (키보드로 삭제 시 칩도 제거) */
  const syncMentionIdsFromBody = (text: string) => {
    const ids: string[] = [];
    for (const u of mentionableUsers) {
      const needle = `@${u.name}`;
      let idx = text.indexOf(needle);
      while (idx !== -1) {
        const after = text[idx + needle.length];
        if (after === undefined || /\s/.test(after)) {
          ids.push(u.id);
          break;
        }
        idx = text.indexOf(needle, idx + 1);
      }
    }
    setSelectedMentionIds((prev) => {
      const next = [...new Set(ids)];
      return prev.length === next.length && prev.every((id, i) => next[i] === id) ? prev : next;
    });
  };

  /** textarea에서 @ 이후 문자열(커서 앞) 추출. 마지막 @ 위치 반환 */
  const getMentionContext = (value: string, cursor: number): { start: number; query: string } | null => {
    const before = value.slice(0, cursor);
    const atIndex = before.lastIndexOf('@');
    if (atIndex === -1) return null;
    const afterAt = before.slice(atIndex + 1);
    if (/\s/.test(afterAt)) return null;
    return { start: atIndex, query: afterAt };
  };

  const openMentionDropdownAt = (value: string, cursor: number) => {
    const ctx = getMentionContext(value, cursor);
    if (ctx != null) {
      setMentionQuery(ctx.query);
      setMentionDropdownOpen(true);
      setMentionHighlightIndex(0);
    } else {
      setMentionQuery(null);
      setMentionDropdownOpen(false);
    }
  };

  const applyMention = (user: MentionableUser) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const value = ta.value;
    const cursor = ta.selectionStart;
    const ctx = getMentionContext(value, cursor);
    if (!ctx) return;
    const insert = `@${user.name} `;
    const nextValue = value.slice(0, ctx.start) + insert + value.slice(cursor);
    setBody(nextValue);
    setSelectedMentionIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
    setMentionQuery(null);
    setMentionDropdownOpen(false);
    setTimeout(() => {
      ta.focus();
      const newPos = ctx.start + insert.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newEntries: FileWithPreview[] = Array.from(files).map((file) => ({
      file,
      objectUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }));
    setSelectedFiles((prev) => [...prev, ...newEntries]);
    setError(null);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = body.trim() || selectedFiles.length > 0 || selectedMentionIds.length > 0;
    if (!hasContent) {
      setError(t('productCollab.enterContentOrImage'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let attachment_urls: { kind: 'image' | 'file'; url: string; original_filename: string }[] = [];
      if (selectedFiles.length > 0) {
        const filesToUpload = selectedFiles.map(({ file }) => file);
        const uploadRes = await uploadProductImages(productId, filesToUpload);
        if (!uploadRes.success || !uploadRes.data?.urls?.length) {
          throw new Error(uploadRes.error ?? t('productCollab.uploadFailed'));
        }
        const urls = uploadRes.data.urls;
        attachment_urls = selectedFiles.map((item, i) => ({
          kind: (item.file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
          url: urls[i] ?? '',
          original_filename: item.file.name,
        })).filter((a) => a.url);
        selectedFiles.forEach(({ objectUrl }) => objectUrl && URL.revokeObjectURL(objectUrl));
      }
      const res = await createMessage(productId, {
        body: body.trim() || null,
        tag: tag || null,
        attachment_urls: attachment_urls.length ? attachment_urls : undefined,
        mention_user_ids: selectedMentionIds.length > 0 ? selectedMentionIds : undefined,
      });
      if (!res.success) throw new Error(res.error);
      setBody('');
      setTag('');
      setSelectedFiles([]);
      setSelectedMentionIds([]);
      onSent(res.data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredByAt = mentionQuery === null
    ? mentionableUsers.filter((u) => !selectedMentionIds.includes(u.id))
    : mentionableUsers.filter(
        (u) => !selectedMentionIds.includes(u.id) && u.name.toLowerCase().includes(mentionQuery.toLowerCase())
      );
  const showAtDropdown = mentionDropdownOpen && (mentionQuery !== null || filteredByAt.length > 0);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setBody(v);
    syncMentionIdsFromBody(v);
    openMentionDropdownAt(v, e.target.selectionStart);
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAtDropdown || filteredByAt.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionHighlightIndex((i) => (i + 1) % filteredByAt.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionHighlightIndex((i) => (filteredByAt.length + i - 1) % filteredByAt.length);
      return;
    }
    if (e.key === 'Enter' && filteredByAt[mentionHighlightIndex]) {
      e.preventDefault();
      applyMention(filteredByAt[mentionHighlightIndex]);
      return;
    }
    if (e.key === 'Escape') {
      setMentionQuery(null);
      setMentionDropdownOpen(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E5E7EB] p-4">
      <div className="space-y-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            onKeyDown={handleBodyKeyDown}
            placeholder={t('productCollab.placeholderMessage')}
            rows={3}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[#1F2937] text-sm resize-none"
          />
          {showAtDropdown && mentionQuery !== null && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => { setMentionQuery(null); setMentionDropdownOpen(false); }} />
              {atDropdownPos && (
                <ul
                  ref={mentionListRef}
                  className="z-20 overflow-auto bg-white border border-[#E5E7EB] rounded-lg shadow py-1"
                  style={{
                    position: 'fixed',
                    top: atDropdownPos.top,
                    left: atDropdownPos.left,
                    width: atDropdownPos.width,
                    maxHeight: DROPDOWN_MAX_H,
                  }}
                >
                  {filteredByAt.map((u, i) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F4F6] ${i === mentionHighlightIndex ? 'bg-[#EFF6FF]' : ''}`}
                        onClick={() => applyMention(u)}
                      >
                        @{u.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
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
            {t('productCollab.uploadImageAndFile')}
          </button>
          <div className="relative">
            <button
              ref={mentionButtonRef}
              type="button"
              onClick={() => setMentionDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg border border-[#E5E7EB]"
            >
              <AtSign className="w-4 h-4" />
              {t('productCollab.addMention')}
            </button>
            {mentionDropdownOpen && mentionQuery === null && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setMentionDropdownOpen(false)}
                />
                {addMentionDropdownPos && (
                  <ul
                    className="z-20 min-w-[160px] overflow-auto bg-white border border-[#E5E7EB] rounded-lg shadow py-1"
                    style={{
                      position: 'fixed',
                      top: addMentionDropdownPos.top,
                      left: addMentionDropdownPos.left,
                      maxHeight: DROPDOWN_MAX_H,
                    }}
                  >
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
                )}
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {submitting ? t('productCollab.sending') : t('productCollab.send')}
          </button>
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
        {selectedFiles.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {selectedFiles.map((item, i) => (
              <li key={`${i}-${item.file.name}`} className="relative group">
                {item.file.type.startsWith('image/') ? (
                  <>
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
                  </>
                ) : item.file.type.startsWith('video/') || isVideoByName(item.file.name) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setModalVideoUrl(item.objectUrl)}
                      className="w-20 h-20 rounded-lg border border-[#E5E7EB] overflow-hidden bg-[#111827] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      <VideoAttachmentThumb src={item.objectUrl} alt={item.file.name} width={80} height={80} />
                    </button>
                    <p className="mt-1 text-xs text-[#6B7280] max-w-[88px] truncate" title={item.file.name}>
                      {item.file.name}
                    </p>
                  </>
                ) : (
                  <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] min-w-0 max-w-[200px] sm:max-w-[240px]">
                    <span className="text-sm font-medium text-[#1F2937] truncate" title={item.file.name}>
                      {item.file.name}
                    </span>
                  </div>
                )}
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
        <VideoModal videoUrl={modalVideoUrl} onClose={() => setModalVideoUrl(null)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
