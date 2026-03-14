import { useState, useMemo, useRef, useEffect } from 'react';
import type { ProductCollabMessage, MessageTag } from '../types';
import { getProductCollabImageUrl, getProductCollabDownloadUrl } from '../utils/imageUrl';
import { updateMessage, deleteMessage, createMessage, completeTask, getAuthHeaders, uploadProductImages, getMentionableUsers, type MentionableUser } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MessageAttachmentImage } from './MessageAttachmentImage';
import { ImagePlus, X, AtSign } from 'lucide-react';

/** 선택한 파일과 미리보기용 object URL (답글 업로드용) */
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

function formatDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function FileDownloadLink({
  productId,
  url,
  originalFilename,
}: {
  productId: number;
  url: string;
  originalFilename?: string | null;
}) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const downloadUrl = getProductCollabDownloadUrl(productId, url, originalFilename);
      const res = await fetch(downloadUrl, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = originalFilename || url.split('/').pop() || 'download';
      link.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setDownloading(false);
    }
  };
  const displayName = originalFilename || url.split('/').pop() || t('productCollab.attachment');
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]">
      <span className="text-sm font-medium text-[#1F2937] max-w-[200px] sm:max-w-[280px] truncate" title={displayName}>
        {displayName}
      </span>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="shrink-0 px-2 py-1 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] rounded disabled:opacity-50"
      >
        {downloading ? t('productCollab.downloading') : t('productCollab.download')}
      </button>
    </div>
  );
}

interface ThreadMessageListProps {
  messages: ProductCollabMessage[];
  productId: number;
  currentUserId: string | null;
  onMessageUpdated: () => void;
  onReplySent?: (parentMessageId: number, newReply: ProductCollabMessage) => void;
}

function MessageItem({
  m,
  productId,
  currentUserId,
  onMessageUpdated,
  isReply,
}: {
  m: ProductCollabMessage;
  productId: number;
  currentUserId: string | null;
  onMessageUpdated: () => void;
  isReply?: boolean;
}) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editTag, setEditTag] = useState<MessageTag | ''>('');
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<Set<number>>(new Set());
  const [newAttachments, setNewAttachments] = useState<{ kind: 'image' | 'file'; url: string; original_filename?: string | null }[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = currentUserId != null && m.author_id === currentUserId;

  const startEdit = () => {
    setEditingId(m.id);
    setEditBody(m.body ?? '');
    setEditTag(m.tag ?? '');
    setRemovedAttachmentIds(new Set());
    setNewAttachments([]);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody('');
    setEditTag('');
    setRemovedAttachmentIds(new Set());
    setNewAttachments([]);
    setError(null);
  };

  const saveEdit = async () => {
    setSubmitting(true);
    setError(null);
    const keptExisting = (m.attachments ?? []).filter((a) => !removedAttachmentIds.has(a.id));
    const attachment_urls = [
      ...keptExisting.map((a) => ({
        kind: a.kind as 'image' | 'file',
        url: a.url,
        original_filename: a.original_filename ?? null,
      })),
      ...newAttachments,
    ];
    const res = await updateMessage(productId, m.id, {
      body: editBody || null,
      tag: editTag || null,
      attachment_urls,
    });
    setSubmitting(false);
    if (res.success) {
      setEditingId(null);
      setNewAttachments([]);
      setRemovedAttachmentIds(new Set());
      onMessageUpdated();
    } else {
      setError(res.error ?? t('productCollab.editFailed'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('productCollab.deleteMessageConfirm'))) return;
    setSubmitting(true);
    setError(null);
    const res = await deleteMessage(productId, m.id);
    setSubmitting(false);
    if (res.success) onMessageUpdated();
    else setError(res.error ?? t('productCollab.deleteFailed'));
  };

  return (
    <div className={isReply ? 'text-sm' : ''}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-[#1F2937] text-sm">
          {m.author_name ?? m.author_id}
        </span>
        {editingId !== m.id && m.tag && (
          <span className="px-1.5 py-0.5 text-xs font-medium text-[#2563EB] bg-[#EFF6FF] rounded">
            {t('productCollab.tag.' + m.tag)}
          </span>
        )}
        <span className="text-xs text-[#6B7280]">
          {new Date(m.created_at).toLocaleString('ko-KR')}
        </span>
        {m.current_user_task && (
          m.current_user_task.completed_at ? (
            <span className="text-xs text-[#059669] font-medium ml-auto">
              {t('productCollab.confirmed')}
            </span>
          ) : (
            <button
              type="button"
              disabled={completingTaskId === m.current_user_task.task_id}
              onClick={async () => {
                setCompletingTaskId(m.current_user_task!.task_id);
                const res = await completeTask(productId, m.current_user_task!.task_id);
                setCompletingTaskId(null);
                if (res.success) onMessageUpdated();
              }}
              className="ml-auto px-2 py-1 text-xs font-medium text-white bg-[#10B981] hover:bg-[#059669] rounded disabled:opacity-50"
            >
              {t('productCollab.confirm')}
            </button>
          )
        )}
        {isOwner && editingId !== m.id && (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              className="text-xs text-[#2563EB] hover:underline"
            >
              {t('common.edit')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="text-xs text-[#DC2626] hover:underline disabled:opacity-50"
            >
              {t('common.delete')}
            </button>
          </span>
        )}
      </div>
      {editingId === m.id ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded px-2 py-1.5 text-sm min-h-[60px]"
            placeholder={t('productCollab.placeholderContent')}
          />
          <select
            value={editTag}
            onChange={(e) => setEditTag((e.target.value || '') as MessageTag | '')}
            className="border border-[#E5E7EB] rounded px-2 py-1 text-sm min-w-[6rem]"
          >
            {TAG_VALUES.map((tagVal) => (
              <option key={tagVal || 'none'} value={tagVal}>
                {tagVal ? t('productCollab.tag.' + tagVal) : t('productCollab.noTag')}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={editFileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,*/*"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length) return;
                const filesToUpload = Array.from(files);
                e.target.value = '';
                setUploadingAttachment(true);
                setError(null);
                try {
                  const uploadRes = await uploadProductImages(productId, filesToUpload);
                  if (!uploadRes.success || !uploadRes.data?.urls?.length) {
                    throw new Error(uploadRes.error ?? t('productCollab.uploadFailed'));
                  }
                  const urls = uploadRes.data.urls;
                  const added = filesToUpload.map((file, i) => ({
                    kind: (file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
                    url: urls[i] ?? '',
                    original_filename: file.name,
                  })).filter((a) => a.url);
                  setNewAttachments((prev) => [...prev, ...added]);
                } catch (err) {
                  setError(err instanceof Error ? err.message : t('productCollab.uploadFailed'));
                } finally {
                  setUploadingAttachment(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => editFileInputRef.current?.click()}
              disabled={uploadingAttachment || submitting}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-[#E5E7EB] disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {uploadingAttachment ? t('productCollab.processing') : t('productCollab.uploadImageAndFile')}
            </button>
          </div>
          {((m.attachments ?? []).filter((a) => !removedAttachmentIds.has(a.id)).length > 0 || newAttachments.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {(m.attachments ?? []).filter((a) => !removedAttachmentIds.has(a.id)).map((att) => (
                <div key={att.id} className="relative group inline-flex">
                  {att.kind === 'image' ? (
                    <div className="w-16 h-16 rounded border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6]">
                      <img src={getProductCollabImageUrl(att.url)} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-2 py-1.5 rounded border border-[#E5E7EB] bg-[#F8FAFC]">
                      <span className="text-xs max-w-[120px] truncate" title={att.original_filename ?? att.url}>
                        {att.original_filename ?? att.url.split('/').pop() ?? t('productCollab.attachment')}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemovedAttachmentIds((prev) => new Set(prev).add(att.id))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600"
                    aria-label={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
              ))}
              {newAttachments.map((att, idx) => (
                <div key={`new-${idx}-${att.url}`} className="relative group inline-flex">
                  {att.kind === 'image' ? (
                    <div className="w-16 h-16 rounded border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6]">
                      <img src={getProductCollabImageUrl(att.url)} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-2 py-1.5 rounded border border-[#E5E7EB] bg-[#F8FAFC]">
                      <span className="text-xs max-w-[120px] truncate" title={att.original_filename ?? att.url}>
                        {att.original_filename ?? att.url.split('/').pop() ?? t('productCollab.attachment')}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600"
                    aria-label={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={submitting}
              className="text-xs bg-[#2563EB] text-white px-2 py-1 rounded disabled:opacity-50"
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              className="text-xs text-[#6B7280] hover:underline"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {(() => {
            const mentionNodes = m.mentions?.length ? (
              <>
                {m.mentions.map((x) => (
                  <span
                    key={x.user_id}
                    className="font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-1 rounded"
                  >
                    @{x.user_name ?? x.user_id}
                  </span>
                ))}{' '}
              </>
            ) : null;
            return (
              <>
                {(mentionNodes || m.body) && (
                  <p className="text-[#1F2937] text-sm mt-1 whitespace-pre-wrap">
                    {mentionNodes}{m.body ?? ''}
                  </p>
                )}
                {m.body_translated && (
                  <p className="text-sm mt-0.5 whitespace-pre-wrap border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
                    {mentionNodes}{m.body_translated}
                  </p>
                )}
              </>
            );
          })()}
          {m.attachments?.length ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {m.attachments.map((att) =>
                att.kind === 'image' ? (
                  <MessageAttachmentImage
                    key={att.id}
                    imageUrl={att.url}
                    productId={productId}
                    onAdded={onMessageUpdated}
                  />
                ) : (
                  <FileDownloadLink
                    key={att.id}
                    productId={productId}
                    url={att.url}
                    originalFilename={att.original_filename}
                  />
                )
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface ReplyFormProps {
  productId: number;
  parentMessageId: number;
  onSent: () => void;
  onReplySent?: (parentMessageId: number, newReply: ProductCollabMessage) => void;
  currentUserId: string | null;
}

function ReplyForm({ productId, parentMessageId, onSent, onReplySent, currentUserId }: ReplyFormProps) {
  const { t } = useLanguage();
  const [body, setBody] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    getMentionableUsers().then((res) => {
      if (res.success && res.data) setMentionableUsers(res.data);
    });
  }, []);

  useEffect(() => {
    return () => {
      selectedFiles.forEach(({ objectUrl }) => objectUrl && URL.revokeObjectURL(objectUrl));
    };
  }, [selectedFiles]);

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

  const filteredByAt =
    mentionQuery === null
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

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index].objectUrl) URL.revokeObjectURL(prev[index].objectUrl);
      return next;
    });
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
    if (!hasContent) return;
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
        attachment_urls = selectedFiles
          .map((item, i) => ({
            kind: (item.file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
            url: urls[i] ?? '',
            original_filename: item.file.name,
          }))
          .filter((a) => a.url);
        selectedFiles.forEach(({ objectUrl }) => objectUrl && URL.revokeObjectURL(objectUrl));
      }
      const res = await createMessage(productId, {
        body: body.trim() || null,
        parent_id: parentMessageId,
        attachment_urls: attachment_urls.length ? attachment_urls : undefined,
        mention_user_ids: selectedMentionIds.length > 0 ? selectedMentionIds : undefined,
      });
      if (!res.success) throw new Error(res.error);
      setBody('');
      setSelectedFiles([]);
      setSelectedMentionIds([]);
      if (onReplySent && res.data) {
        onReplySent(parentMessageId, res.data);
      } else {
        onSent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productCollab.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 ml-4 pl-3 border-l-2 border-[#E5E7EB]">
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={handleBodyChange}
              onKeyDown={handleBodyKeyDown}
              placeholder={t('productCollab.replyPlaceholder')}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded text-sm resize-none"
            />
            {showAtDropdown && mentionQuery !== null && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => {
                    setMentionQuery(null);
                    setMentionDropdownOpen(false);
                  }}
                />
                <ul
                  ref={mentionListRef}
                  className="absolute left-0 right-0 top-full mt-1 z-20 max-h-40 overflow-auto bg-white border border-[#E5E7EB] rounded shadow py-1"
                >
                  {filteredByAt.map((u, i) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-2 py-1.5 text-sm hover:bg-[#F3F4F6] ${i === mentionHighlightIndex ? 'bg-[#EFF6FF]' : ''}`}
                        onClick={() => applyMention(u)}
                      >
                        @{u.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              disabled={submitting}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-[#E5E7EB] disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {t('productCollab.uploadImageAndFile')}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMentionDropdownOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded border border-[#E5E7EB]"
              >
                <AtSign className="w-3.5 h-3.5" />
                {t('productCollab.addMention')}
              </button>
              {mentionDropdownOpen && mentionQuery === null && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMentionDropdownOpen(false)} />
                  <ul className="absolute left-0 top-full mt-1 z-20 min-w-[140px] max-h-40 overflow-auto bg-white border border-[#E5E7EB] rounded shadow py-1">
                    {mentionableUsers
                      .filter((u) => !selectedMentionIds.includes(u.id))
                      .map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-[#F3F4F6]"
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
                      <li className="px-2 py-1.5 text-xs text-[#6B7280]">{t('productCollab.noUsersToAdd')}</li>
                    )}
                  </ul>
                </>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <span className="text-xs text-[#6B7280]">
                {selectedFiles.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 mr-2">
                    <span className="max-w-[120px] truncate" title={item.file.name}>{item.file.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700" aria-label="Remove">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </span>
            )}
          </div>
          {selectedMentionIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedMentionIds.map((id) => {
                const u = mentionableUsers.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-[#EFF6FF] text-[#2563EB] rounded-full"
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
        <button
          type="submit"
          disabled={submitting || (!body.trim() && selectedFiles.length === 0 && selectedMentionIds.length === 0)}
          className="shrink-0 px-3 py-1.5 text-sm text-white bg-[#2563EB] rounded hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          {submitting ? t('productCollab.sending') : t('productCollab.reply')}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </form>
  );
}

export function ThreadMessageList({ messages, productId, currentUserId, onMessageUpdated, onReplySent }: ThreadMessageListProps) {
  const { t } = useLanguage();
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const byDate = useMemo(() => {
    const map = new Map<string, ProductCollabMessage[]>();
    for (const m of messages) {
      const key = formatDateKey(m.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const da = new Date(a[1][0].created_at).getTime();
      const db = new Date(b[1][0].created_at).getTime();
      return db - da;
    });
  }, [messages]);

  const toggle = (key: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (messages.length === 0) {
    return <p className="text-[#6B7280] text-sm py-4">{t('productCollab.noMessages')}</p>;
  }

  return (
    <ul className="space-y-4">
      {byDate.map(([dateKey, msgs]) => {
        const isCollapsed = collapsedDates.has(dateKey);
        return (
          <li key={dateKey} className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => toggle(dateKey)}
              className="w-full flex items-center justify-between px-4 py-2 bg-[#F8F9FB] text-left text-sm font-medium text-[#1F2937]"
            >
              <span>{dateKey}</span>
              <span className="text-[#6B7280]">{isCollapsed ? t('productCollab.expand') : t('productCollab.collapse')}</span>
            </button>
            {!isCollapsed && (
              <ul className="divide-y divide-[#E5E7EB]">
                {msgs.map((m) => (
                  <li key={m.id} className="px-4 py-3">
                    <MessageItem
                      m={m}
                      productId={productId}
                      currentUserId={currentUserId}
                      onMessageUpdated={onMessageUpdated}
                    />
                    {m.replies?.length ? (
                      <ul className="ml-4 mt-2 pl-3 border-l-2 border-[#E5E7EB] space-y-1">
                        {m.replies.map((r) => (
                          <li key={r.id} className="py-1">
                            <MessageItem
                              m={r}
                              productId={productId}
                              currentUserId={currentUserId}
                              onMessageUpdated={onMessageUpdated}
                              isReply
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <ReplyForm
                      productId={productId}
                      parentMessageId={m.id}
                      onSent={onMessageUpdated}
                      onReplySent={onReplySent}
                      currentUserId={currentUserId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
