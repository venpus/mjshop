import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

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

export interface DraggableFloatingPositionOptions {
  /** 패널 등 자식 포함 시 드래그 핸들 크기만으로 클램프 */
  clampSize?: { width: number; height: number };
  /** left/top 좌표를 적용할 요소 (미지정 시 드래그 핸들 ref) */
  positionElementRef?: RefObject<HTMLElement | null>;
}

/**
 * fixed 플로팅 UI용: 포인터 다운 후 이동 시에만 위치 변경, 뷰포트 클램프, localStorage 유지.
 * 짧은 클릭(임계 미만 이동)은 드래그로 처리하지 않음 — 호출부 onClick에서 토글.
 */
export function useDraggableFloatingPosition(
  storageKey: string,
  options?: DraggableFloatingPositionOptions
) {
  const ref = useRef<HTMLElement>(null);
  const clampSize = options?.clampSize;
  const positionElementRef = options?.positionElementRef;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() =>
    readStoredPosition(storageKey)
  );
  const dragStart = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const dragMoved = useRef(false);
  const lastDragPos = useRef<{ x: number; y: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

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

  const getPositionElement = useCallback(() => {
    return positionElementRef?.current ?? ref.current;
  }, [positionElementRef]);

  const getClampSize = useCallback(() => {
    const el = getPositionElement();
    if (!el) return { width: 0, height: 0 };
    return {
      width: clampSize?.width ?? el.offsetWidth,
      height: clampSize?.height ?? el.offsetHeight,
    };
  }, [clampSize, getPositionElement]);

  const reclamp = useCallback(() => {
    const currentPos = posRef.current;
    if (currentPos == null) return;
    const { width, height } = getClampSize();
    if (width <= 0 || height <= 0) return;
    const next = clampPosition(currentPos.x, currentPos.y, width, height);
    if (next.x !== currentPos.x || next.y !== currentPos.y) {
      setPos(next);
      persist(next);
    }
  }, [getClampSize, persist]);

  useEffect(() => {
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [reclamp]);

  const endDrag = useCallback(
    (pointerId: number) => {
      const handle = ref.current;
      if (handle) {
        try {
          handle.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
      }
      dragStart.current = null;
      if (dragMoved.current && lastDragPos.current) {
        persist(lastDragPos.current);
      }
    },
    [persist]
  );

  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (!dragStart.current || e.pointerId !== dragStart.current.pointerId) return;
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

      dragMoved.current = true;
      const { width, height } = getClampSize();
      const next = clampPosition(
        dragStart.current.originX + dx,
        dragStart.current.originY + dy,
        width,
        height
      );
      lastDragPos.current = next;
      setPos(next);
    };

    const onWindowPointerUp = (e: PointerEvent) => {
      if (!dragStart.current || e.pointerId !== dragStart.current.pointerId) return;
      endDrag(e.pointerId);
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [endDrag, getClampSize]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const handle = ref.current;
      const positionEl = getPositionElement();
      if (!handle || !positionEl) return;

      lastDragPos.current = null;
      const r = positionEl.getBoundingClientRect();
      const currentPos = posRef.current;
      dragStart.current = {
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        originX: currentPos?.x ?? r.left,
        originY: currentPos?.y ?? r.top,
      };
      dragMoved.current = false;

      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [getPositionElement]
  );

  /** 드래그 직후 발생하는 click 을 토글에서 제외 */
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
    consumeClickIfDrag,
  };
};
