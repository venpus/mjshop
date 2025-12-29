import React from 'react';

export type StatusBadgeType = 'factory' | 'work' | 'delivery' | 'payment' | 'order';

export interface StatusBadgeProps {
  /** 표시할 상태 텍스트 */
  status: string;
  /** 상태 타입 (색상 매핑에 사용) */
  type: StatusBadgeType;
  /** 추가 클래스명 */
  className?: string;
  /** 크기 조절 (기본값: 'sm') */
  size?: 'xs' | 'sm' | 'md';
  /** 클릭 핸들러 */
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * 상태별 색상을 반환하는 헬퍼 함수
 */
function getStatusColor(status: string, type: StatusBadgeType): string {
  switch (type) {
    case 'factory':
      // 업체출고 상태
      if (status === '수령완료') return 'bg-green-100 text-green-800';
      if (status === '배송중') return 'bg-blue-100 text-blue-800';
      if (status === '출고대기') return 'bg-gray-100 text-gray-800';
      return 'bg-red-100 text-red-800';

    case 'work':
      // 작업 상태
      if (status === '완료') return 'bg-green-100 text-green-800';
      if (status === '작업중') return 'bg-blue-100 text-blue-800';
      if (status === '작업대기') return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';

    case 'delivery':
      // 배송 상태
      if (status === '한국도착') return 'bg-green-100 text-green-800';
      if (status === '통관및 배달') return 'bg-emerald-100 text-emerald-800';
      if (status === '항공운송중') return 'bg-sky-100 text-sky-800';
      if (status === '해운운송중') return 'bg-blue-100 text-blue-800';
      if (status === '배송중') return 'bg-blue-100 text-blue-800';
      if (status === '내륙운송중') return 'bg-indigo-100 text-indigo-800';
      if (status === '대기중' || status === '공장출고') return 'bg-purple-100 text-purple-800';
      if (status === '중국운송중') return 'bg-indigo-100 text-indigo-800';
      return 'bg-gray-100 text-gray-800';

    case 'payment':
      // 결제 상태
      if (status === '완료') return 'bg-green-100 text-green-800';
      if (status === '선금결제') return 'bg-yellow-100 text-yellow-800';
      if (status === '미결제') return 'bg-red-100 text-red-800';
      return 'bg-gray-100 text-gray-800';

    case 'order':
      // 발주 상태
      if (status === '발주확인') return 'bg-green-100 text-green-800';
      if (status === '발주 대기') return 'bg-yellow-100 text-yellow-800';
      if (status === '취소됨') return 'bg-red-100 text-red-800';
      return 'bg-gray-100 text-gray-800';

    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * 크기별 스타일을 반환하는 헬퍼 함수
 */
function getSizeClass(size: 'xs' | 'sm' | 'md'): string {
  switch (size) {
    case 'xs':
      return 'px-2 py-0.5 text-xs';
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'md':
      return 'px-3 py-1.5 text-sm';
    default:
      return 'px-2 py-1 text-xs';
  }
}

/**
 * 상태를 표시하는 배지 컴포넌트
 * 타입에 따라 자동으로 적절한 색상을 적용합니다.
 */
export function StatusBadge({
  status,
  type,
  className = '',
  size = 'sm',
  onClick,
}: StatusBadgeProps) {
  const colorClass = getStatusColor(status, type);
  const sizeClass = getSizeClass(size);

  const Component = onClick ? 'button' : 'span';
  const baseClasses = `inline-flex items-center rounded-full whitespace-nowrap ${colorClass} ${sizeClass} ${className}`;
  const interactiveClasses = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  return (
    <Component
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={onClick}
    >
      {status}
    </Component>
  );
}
