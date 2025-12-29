interface PackingListHeaderProps {
  isSuperAdmin: boolean;
  isAllSelected: boolean;
  onToggleAll: (checked: boolean) => void;
}

export function PackingListHeader({
  isSuperAdmin,
  isAllSelected,
  onToggleAll,
}: PackingListHeaderProps) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-12">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) => onToggleAll(e.target.checked)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
          />
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          발송일
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          코드
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          제품
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          입수량
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          박스수
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          단위
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          총수량
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          내륙송장
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          물류회사
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          물류창고 도착일
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          한국도착일
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          실중량
        </th>
        {isSuperAdmin && (
          <>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
              비율
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
              중량
            </th>
          </>
        )}
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          배송비
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          지급일
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
          WK결제일
        </th>
      </tr>
    </thead>
  );
}
