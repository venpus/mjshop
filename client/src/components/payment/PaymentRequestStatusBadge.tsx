import React from 'react';
import { PaymentRequestStatus } from '../../api/paymentRequestApi';

interface PaymentRequestStatusBadgeProps {
  status: PaymentRequestStatus;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

/**
 * 지급요청 상태 배지 컴포넌트
 */
export function PaymentRequestStatusBadge({
  status,
  className = '',
  size = 'sm',
}: PaymentRequestStatusBadgeProps) {
  const getStatusColor = (status: PaymentRequestStatus): string => {
    switch (status) {
      case '요청중':
        return 'bg-yellow-100 text-yellow-800';
      case '완료':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSizeClass = (size: 'xs' | 'sm' | 'md'): string => {
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
  };

  const colorClass = getStatusColor(status);
  const sizeClass = getSizeClass(size);

  return (
    <span
      className={`inline-flex items-center rounded-full whitespace-nowrap ${colorClass} ${sizeClass} ${className}`}
    >
      {status}
    </span>
  );
}

