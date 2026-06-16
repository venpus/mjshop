interface ShopOrderProgressFlagBadgeProps {
  label: string;
  display: string;
  checked: boolean;
}

export function ShopOrderProgressFlagBadge({
  label,
  display,
  checked,
}: ShopOrderProgressFlagBadgeProps) {
  return (
    <span
      title={`${label} ${checked ? '완료' : '미완료'}`}
      className={`inline-flex items-center justify-center h-7 rounded-md font-bold border ${
        display.length > 1 ? 'min-w-[2rem] px-0.5 text-[9px]' : 'w-7 text-[10px]'
      } ${
        checked
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}
    >
      {display}
    </span>
  );
}
