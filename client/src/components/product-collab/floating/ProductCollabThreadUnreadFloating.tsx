import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProductCollabThreadUnread } from '../../../contexts/ProductCollabThreadUnreadContext';
import { useDraggableFloatingPosition } from '../../../hooks/useDraggableFloatingPosition';

const FLOAT_POS_STORAGE_KEY = 'mjshop_product_collab_thread_float_pos';

export function ProductCollabThreadUnreadFloating() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const ctx = useProductCollabThreadUnread();
  const total = ctx?.total ?? 0;
  const drag = useDraggableFloatingPosition(FLOAT_POS_STORAGE_KEY);

  const goUnread = () => {
    if (total <= 0) return;
    navigate('/admin/product-collab/unread');
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (drag.consumeClickIfDrag()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    goUnread();
  };

  return (
    <button
      type="button"
      ref={drag.ref}
      style={drag.positionStyle}
      onClick={handleClick}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      aria-disabled={total <= 0}
      className={`fixed z-30 flex select-none touch-none items-center gap-2 rounded-full border border-[#C7D2FE] bg-white px-3 py-2 shadow-lg shadow-indigo-900/10 ${
        drag.positionClass
      } ${total > 0 ? 'cursor-grab active:cursor-grabbing hover:bg-[#EEF2FF]' : 'cursor-default opacity-80'}`}
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
    </button>
  );
}
