import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabThreadUnread } from '../../../contexts/ProductCollabThreadUnreadContext';

export function ProductCollabThreadUnreadFloating() {
  const { t } = useLanguage();
  const ctx = useProductCollabThreadUnread();
  const total = ctx?.total ?? 0;

  return (
    <Link
      to="/admin/product-collab/list"
      className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-white px-3 py-2 shadow-lg shadow-indigo-900/10 transition hover:bg-[#EEF2FF] sm:bottom-6 sm:right-6"
      aria-label={`${t('productCollab.threadUnreadFloatingAria')}: ${total}`}
      title={t('productCollab.threadUnreadFloatingTitle')}
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4338CA]">
        <MessageCircle className="h-5 w-5" aria-hidden />
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
            {total > 99 ? '99+' : total}
          </span>
        ) : null}
      </span>
      <span className="hidden max-w-[10rem] truncate text-xs font-medium text-[#374151] sm:inline">
        {t('productCollab.threadUnreadFloatingTitle')}
      </span>
    </Link>
  );
}
