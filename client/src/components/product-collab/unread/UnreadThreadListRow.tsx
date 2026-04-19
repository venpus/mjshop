import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ThreadUnreadItem } from '../../../api/productCollabApi';

function previewBody(body: string | null, maxLen: number): string {
  if (body == null || !body.trim()) return '';
  const one = body.replace(/\s+/g, ' ').trim();
  return one.length > maxLen ? `${one.slice(0, maxLen)}…` : one;
}

interface UnreadThreadListRowProps {
  item: ThreadUnreadItem;
}

export function UnreadThreadListRow({ item }: UnreadThreadListRowProps) {
  const { t, language } = useLanguage();
  const locale = language === 'zh' ? 'zh-CN' : 'ko-KR';
  const when = new Date(item.created_at).toLocaleString(locale);
  const snippet = previewBody(item.body, 200);
  const isReply = item.parent_id != null;

  const typeBadgeClass = isReply
    ? 'bg-[#EEF2FF] text-[#4338CA]'
    : 'bg-[#CCFBF1] text-[#115E59]';

  const typeLabel = isReply ? t('productCollab.threadUnreadReplyTag') : t('productCollab.threadUnreadRootTag');

  return (
    <Link
      to={`/admin/product-collab/thread/${item.product_id}?from=unread`}
      className="relative flex flex-col bg-white rounded-lg border border-[#E5E7EB] p-4 text-left transition-colors hover:border-[#2563EB] cursor-pointer"
    >
      <span
        className={`absolute top-2 left-2 z-10 inline-block px-2 py-1 text-xs font-medium rounded-md shadow-sm ${typeBadgeClass}`}
      >
        {typeLabel}
      </span>

      <div className="w-full h-32 bg-[#F3F4F6] rounded mb-3 flex items-center justify-center">
        <MessageCircle className="w-10 h-10 text-[#9CA3AF]" aria-hidden />
      </div>

      <div className="font-medium text-[#1F2937] line-clamp-2">{item.product_name}</div>
      <div className="text-xs text-[#6B7280] mt-1">
        {item.author_name ?? item.author_id}
      </div>
      {snippet ? (
        <div className="text-xs text-[#6B7280] mt-1 line-clamp-2">{snippet}</div>
      ) : (
        <div className="text-xs text-[#9CA3AF] mt-1 line-clamp-2 italic">
          {t('productCollab.threadUnreadNoBody')}
        </div>
      )}
      <div className="text-xs text-[#6B7280] mt-2 pt-1 border-t border-[#F3F4F6] tabular-nums">
        {when}
      </div>
    </Link>
  );
}
