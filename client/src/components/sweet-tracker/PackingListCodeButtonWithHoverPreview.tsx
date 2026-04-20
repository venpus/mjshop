import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadSweetTrackerPackingListPreviewCached } from './packingListPreviewRequestCache';
import type { SweetTrackerPackingListPreviewData } from '../../api/sweetTrackerApi';
import { getFullImageUrl } from '../../api/purchaseOrderApi';

const OPEN_DELAY_MS = 220;
const PREVIEW_MAX_W = 288;
const PREVIEW_PAD = 8;

export interface PackingListCodeButtonWithHoverPreviewProps {
  token: string;
  userId?: string;
  t: (key: string) => string;
  onOpenPackingList: (token: string) => void;
  /** 버튼에 그대로 표시할 라벨(기본: token) */
  label?: string;
}

type PreviewUiState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: SweetTrackerPackingListPreviewData }
  | { kind: 'error'; message: string };

export function PackingListCodeButtonWithHoverPreview({
  token,
  userId,
  t,
  onOpenPackingList,
  label,
}: PackingListCodeButtonWithHoverPreviewProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverGen = useRef(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<{
    left: number;
    refTop: number;
    refBottom: number;
    placeAbove: boolean;
  } | null>(null);
  const [ui, setUi] = useState<PreviewUiState>({ kind: 'idle' });

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current != null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const closePreview = useCallback(() => {
    hoverGen.current += 1;
    clearOpenTimer();
    setAnchor(null);
    setUi({ kind: 'idle' });
  }, [clearOpenTimer]);

  const updateAnchor = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const estH = Math.min(240, window.innerHeight * 0.45);
    const placeAbove = r.bottom + estH + PREVIEW_PAD > window.innerHeight && r.top > estH + PREVIEW_PAD;
    const left = Math.max(
      PREVIEW_PAD,
      Math.min(r.left, window.innerWidth - PREVIEW_MAX_W - PREVIEW_PAD)
    );
    setAnchor({ left, refTop: r.top, refBottom: r.bottom, placeAbove });
  }, []);

  const onEnter = useCallback(() => {
    if (!userId?.trim()) return;
    hoverGen.current += 1;
    const my = hoverGen.current;
    clearOpenTimer();
    setUi({ kind: 'idle' });
    setAnchor(null);

    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      if (hoverGen.current !== my) return;
      updateAnchor();
      setUi({ kind: 'loading' });
      void loadSweetTrackerPackingListPreviewCached(userId, token)
        .then((data) => {
          if (hoverGen.current !== my) return;
          setUi({ kind: 'ready', data });
        })
        .catch((e) => {
          if (hoverGen.current !== my) return;
          const msg = e instanceof Error ? e.message : String(e);
          setUi({ kind: 'error', message: msg });
        });
    }, OPEN_DELAY_MS);
  }, [clearOpenTimer, token, updateAnchor, userId]);

  const onLeave = useCallback(() => {
    closePreview();
  }, [closePreview]);

  useEffect(() => {
    if (!anchor || ui.kind === 'idle') return;
    const onScrollOrResize = () => updateAnchor();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [anchor, ui.kind, updateAnchor]);

  useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

  const displayLabel = label ?? token;

  const flyout =
    anchor &&
    ui.kind !== 'idle' &&
    createPortal(
      <div
        className="fixed z-[200] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
        style={{
          left: anchor.left,
          maxWidth: PREVIEW_MAX_W,
          pointerEvents: 'none',
          ...(anchor.placeAbove
            ? { top: anchor.refTop - PREVIEW_PAD, transform: 'translateY(-100%)' as const }
            : { top: anchor.refBottom + PREVIEW_PAD }),
        }}
        role="tooltip"
      >
        {ui.kind === 'loading' && (
          <p className="px-1 py-2 text-xs text-gray-600">{t('sweetTracker.cacheList.packingPreviewLoading')}</p>
        )}
        {ui.kind === 'error' && (
          <p className="max-w-[260px] px-1 py-2 text-xs text-red-600">{ui.message}</p>
        )}
        {ui.kind === 'ready' && !ui.data.found && (
          <p className="px-1 py-2 text-xs text-gray-600">{t('sweetTracker.cacheList.packingPreviewNotFound')}</p>
        )}
        {ui.kind === 'ready' && ui.data.found && ui.data.lines.length === 0 && (
          <p className="px-1 py-2 text-xs text-gray-600">{t('sweetTracker.cacheList.packingPreviewNoLines')}</p>
        )}
        {ui.kind === 'ready' && ui.data.found && ui.data.lines.length > 0 && (
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
            {ui.data.lines.map((line, idx) => {
              const imgSrc = line.imageUrl ? getFullImageUrl(line.imageUrl) : '';
              return (
              <li key={`${line.productName}-${idx}`} className="flex gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-gray-100 bg-gray-50">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={line.productName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs text-gray-800">
                  <p className="line-clamp-3 font-medium leading-snug">{line.productName}</p>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => onOpenPackingList(token)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-800"
        title={token}
      >
        {displayLabel}
      </button>
      {flyout}
    </>
  );
}
