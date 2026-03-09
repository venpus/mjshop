import { useState, useEffect } from 'react';

/** (hover: none) 미디어 쿼리 — 터치 우선 기기면 true */
export function usePrefersTouch(): boolean {
  const [prefersTouch, setPrefersTouch] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(hover: none)');
    const update = () => setPrefersTouch(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return prefersTouch;
}
