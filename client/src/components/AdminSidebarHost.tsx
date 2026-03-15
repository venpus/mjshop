import { ReactNode } from 'react';

export interface AdminSidebarHostProps {
  isMobileLayout: boolean;
  isSidebarOpen: boolean;
  onHoverChange?: (hovered: boolean) => void;
  children: ReactNode;
}

/**
 * PC 웹: 마우스 오버 시 펼침/접힘을 위해 호버 이벤트를 전달.
 * 모바일/앱: 호버 미사용.
 */
export function AdminSidebarHost({
  isMobileLayout,
  isSidebarOpen,
  onHoverChange,
  children,
}: AdminSidebarHostProps) {
  const isPc = !isMobileLayout;
  const hoverHandlers = isPc && onHoverChange
    ? {
        onMouseEnter: () => onHoverChange(true),
        onMouseLeave: () => onHoverChange(false),
      }
    : {};

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ${
        isMobileLayout ? '' : 'lg:static lg:translate-x-0'
      } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={
        isMobileLayout && !isSidebarOpen
          ? { transform: 'translateX(-100%)' }
          : undefined
      }
      {...hoverHandlers}
    >
      {children}
    </div>
  );
}
