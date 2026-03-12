import { useState, useEffect } from 'react';

/**
 * 앱(WebView) 또는 좁은 뷰포트일 때 true.
 * true이면 md/lg breakpoint와 관계없이 모바일 레이아웃을 사용해야 함.
 * (Capacitor 앱에서 뷰포트가 넓게 잡혀 데스크톱 레이아웃이 나오는 문제 방지)
 */
export function useForceMobileLayout(): boolean {
  const [force, setForce] = useState(false);

  useEffect(() => {
    const detect = () => {
      if (typeof window === 'undefined') return;
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      const isCapacitor = cap?.isNativePlatform?.() === true;
      const origin = window.location?.origin || '';

      // 1) Capacitor 브리지: 정확하지만 주입 전/지연 시 false
      if (isCapacitor) {
        setForce(true);
        return;
      }

      // 2) origin 기반: 포트/스킴 변형 수용 (http://localhost:8080, https://localhost 등)
      const isLocalOrigin =
        origin === 'http://localhost' ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost') ||
        origin === 'capacitor://localhost' ||
        origin === 'capacitor://android' ||
        origin.startsWith('capacitor://');
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isLocalOrigin) {
        if (origin.startsWith('capacitor://')) {
          setForce(true);
          return;
        }
        if (isAndroid) {
          setForce(true);
          return;
        }
      }

      const narrow = window.innerWidth < 1024;
      setForce(narrow);
    };

    detect();
    const t1 = setTimeout(detect, 150);
    const t2 = setTimeout(detect, 600);
    window.addEventListener('resize', detect);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', detect);
    };
  }, []);

  return force;
}
