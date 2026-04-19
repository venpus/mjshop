import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const DRAG_THRESHOLD_PX = 8;

function readStoredPosition(key: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (
      v &&
      typeof v === 'object' &&
      'x' in v &&
      'y' in v &&
      typeof (v as { x: unknown }).x === 'number' &&
      typeof (v as { y: unknown }).y === 'number'
    ) {
      return { x: (v as { x: number }).x, y: (v as { y: number }).y };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  pad = 8
): { x: number; y: number } {
  const maxX = Math.max(pad, window.innerWidth - width - pad);
  const maxY = Math.max(pad, window.innerHeight - height - pad);
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  };
}

/**
 * fixed 플로팅 UI용: 포인터로 위치 이동, 뷰포트 클램프, localStorage 유지.
 * 짧은 클릭(임계 미만 이동)은 드래그로 처리하지 않음 — 호출부 onClick에서 네비게이션.
 */
export function useDraggableFloatingPosition(storageKey: string) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => readStoredPosition(storageKey));
  const dragStart = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const dragMoved = useRef(false);
  /** pointerup 시점에 state가 아직 반영되지 않을 수 있어 마지막 클램프 좌표를 보관 */
  const lastDragPos = useRef<{ x: number; y: number } | null>(null);

  const persist = useCallback(
    (p: { x: number; y: number }) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const reclamp = useCallback(() => {
    const el = ref.current;
    if (!el || pos == null) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const next = clampPosition(pos.x, pos.y, w, h);
    if (next.x !== pos.x || next.y !== pos.y) {
      setPos(next);
      persist(next);
    }
  }, [pos, persist]);

  useEffect(() => {
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [reclamp]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    lastDragPos.current = null;
    const r = el.getBoundingClientRect();
    const originX = pos?.x ?? r.left;
    const originY = pos?.y ?? r.top;
    dragStart.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      originX,
      originY,
    };
    dragMoved.current = false;
    el.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current || !ref.current) return;
    const dx = e.clientX - dragStart.current.clientX;
    const dy = e.clientY - dragStart.current.clientY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    dragMoved.current = true;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    const next = clampPosition(
      dragStart.current.originX + dx,
      dragStart.current.originY + dy,
      w,
      h
    );
    lastDragPos.current = next;
    setPos(next);
  }, []);

  const endPointer = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      const el = ref.current;
      if (!dragStart.current || !el) return;
      if (e.pointerId !== dragStart.current.pointerId) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      dragStart.current = null;
      if (dragMoved.current && lastDragPos.current) persist(lastDragPos.current);
    },
    [persist]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      endPointer(e);
    },
    [endPointer]
  );

  const onPointerCancel = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      endPointer(e);
    },
    [endPointer]
  );

  /** 드래그 직후 발생하는 click 을 네비게이션에서 제외 */
  const consumeClickIfDrag = useCallback(() => {
    if (!dragMoved.current) return false;
    dragMoved.current = false;
    return true;
  }, []);

  const positionStyle: CSSProperties | undefined =
    pos != null
      ? {
          left: pos.x,
          top: pos.y,
          right: 'auto',
          bottom: 'auto',
        }
      : undefined;

  const positionClass = pos == null ? 'bottom-4 right-4 sm:bottom-6 sm:right-6' : '';

  return {
    ref,
    pos,
    positionStyle,
    positionClass,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    consumeClickIfDrag,
  };
}
