interface PaymentAmountCellProps {
  amount: number | null | undefined;
  formatCurrency: (amount: number) => string;
}

export function PaymentAmountCell({ amount, formatCurrency }: PaymentAmountCellProps) {
  const amountText = amount === null || amount === undefined ? '-' : formatCurrency(amount);
  return <span className="text-sm text-gray-900 whitespace-nowrap">{amountText}</span>;
}

interface PaymentStatusCellProps {
  paidDate: string | null | undefined;
}

export function PaymentStatusCell({ paidDate }: PaymentStatusCellProps) {
  const isPaid = Boolean(paidDate);
  return (
    <span className={`text-sm font-medium whitespace-nowrap ${isPaid ? 'text-green-700' : 'text-gray-500'}`}>
      {isPaid ? `지급완료${paidDate ? ` (${paidDate})` : ''}` : '미지급'}
    </span>
  );
}

