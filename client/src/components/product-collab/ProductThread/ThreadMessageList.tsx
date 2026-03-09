import { useState, useMemo } from 'react';
import type { ProductCollabMessage, MessageTag } from '../types';
import { getProductCollabImageUrl } from '../utils/imageUrl';
import { updateMessage, deleteMessage, createMessage } from '../../../api/productCollabApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MessageAttachmentImage } from './MessageAttachmentImage';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserId != null && m.author_id === currentUserId;

  const startEdit = () => {
    setEditingId(m.id);
    setEditBody(m.body ?? '');
    setEditTag(m.tag ?? '');
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody('');
    setEditTag('');
    setError(null);
  };

  const saveEdit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await updateMessage(productId, m.id, { body: editBody || null, tag: editTag || null });
    setSubmitting(false);
    if (res.success) {
      setEditingId(null);
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
        {isOwner && editingId !== m.id && (
          <span className="flex items-center gap-1 ml-auto">
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
          {m.body && <p className="text-[#1F2937] text-sm mt-1 whitespace-pre-wrap">{m.body}</p>}
          {m.body_translated && (
            <p className="text-sm mt-0.5 whitespace-pre-wrap border-l-2 border-[#93C5FD] pl-2 text-[#1d4ed8]">
              {m.body_translated}
            </p>
          )}
          {m.attachments?.length ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {m.attachments.map((a) =>
                a.kind === 'image' ? (
                  <MessageAttachmentImage
                    key={a.id}
                    imageUrl={a.url}
                    productId={productId}
                    onAdded={onMessageUpdated}
                  />
                ) : (
                  <a
                    key={a.id}
                    href={getProductCollabImageUrl(a.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#2563EB]"
                  >
                    {t('productCollab.attachment')}
                  </a>
                )
              )}
            </div>
          ) : null}
          {m.mentions?.length ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-[#6B7280]">{t('productCollab.mention')}:</span>
              {m.mentions.map((x) => (
                <span
                  key={x.user_id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold text-[#1D4ED8] bg-[#EFF6FF]"
                >
                  @{x.user_name ?? x.user_id}
                </span>
              ))}
            </p>
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await createMessage(productId, {
        body: trimmed,
        parent_id: parentMessageId,
      });
      if (!res.success) throw new Error(res.error);
      setBody('');
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
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('productCollab.replyPlaceholder')}
          rows={2}
          className="flex-1 min-w-0 px-2 py-1.5 border border-[#E5E7EB] rounded text-sm resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
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
