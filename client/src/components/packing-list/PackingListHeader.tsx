interface PackingListHeaderProps {
  isSuperAdmin: boolean;
  isAllSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  hideSensitiveColumns: boolean; // C0 레벨, D0 레벨일 때 실중량, 비율, 중량, 배송비, 지급일, WK결제일 숨김
}

export function PackingListHeader({
  isSuperAdmin,
  isAllSelected,
  onToggleAll,
  hideSensitiveColumns,
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
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
          발송일
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
          코드
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200" style={{ minWidth: '200px', width: '200px' }}>
          제품
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
          입수량
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
          박스수
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap" style={{ width: 'auto' }}>
          단위
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
          총수량
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          내륙송장
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap" style={{ width: 'auto' }}>
          물류회사
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
          물류창고 도착일
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          한국도착일
        </th>
        {/* 실중량, 비율, 중량, 배송비, 지급일, WK결제일 - C0 레벨, D0 레벨일 때 숨김 */}
        {!hideSensitiveColumns && (
          <>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
              실중량
            </th>
            {isSuperAdmin && (
              <>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap" style={{ width: 'auto' }}>
                  비율
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
                  중량
                </th>
              </>
            )}
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
              배송비
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
              지급일
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
              WK결제일
            </th>
          </>
        )}
      </tr>
    </thead>
  );
}
