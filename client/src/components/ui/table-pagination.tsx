import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  /** 현재 페이지 번호 */
  currentPage: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 페이지당 표시할 항목 수 */
  itemsPerPage: number;
  /** 전체 항목 수 */
  totalItems: number;
  /** 현재 페이지의 시작 인덱스 (0-based) */
  startIndex: number;
  /** 현재 페이지의 끝 인덱스 (0-based) */
  endIndex: number;
  /** 페이지당 항목 수 옵션 */
  itemsPerPageOptions?: number[];
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
  /** 페이지당 항목 수 변경 핸들러 */
  onItemsPerPageChange: (items: number) => void;
  /** 추가 클래스명 */
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  itemsPerPageOptions = [15, 20, 25, 30],
  onPageChange,
  onItemsPerPageChange,
  className = '',
}: TablePaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    for (let page = 1; page <= totalPages; page++) {
      // 첫 페이지, 마지막 페이지, 현재 페이지 ±1 범위 표시
      if (
        page === 1 ||
        page === totalPages ||
        (page >= currentPage - 1 && page <= currentPage + 1)
      ) {
        pages.push(page);
      } else if (page === currentPage - 2 || page === currentPage + 2) {
        // 생략 표시 (이미 추가되지 않은 경우만)
        if (pages.length === 0 || pages[pages.length - 1] !== 'ellipsis') {
          pages.push('ellipsis');
        }
      }
    }
    
    return pages.map((page, index) => {
      if (page === 'ellipsis') {
        return (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
            ...
          </span>
        );
      }
      
      return (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            currentPage === page
              ? 'bg-purple-600 text-white'
              : 'border border-gray-300 hover:bg-gray-50'
          }`}
          aria-label={`페이지 ${page}로 이동`}
          aria-current={currentPage === page ? 'page' : undefined}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className={`px-4 py-3 border-t border-gray-200 flex items-center justify-between ${className}`}>
      {/* 왼쪽: 페이지당 표시 항목 수 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm">페이지당 표시:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {itemsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}개
            </option>
          ))}
        </select>
        <span className="text-gray-600 text-sm ml-4">
          전체 {totalItems}개 중 {startIndex + 1}-
          {Math.min(endIndex, totalItems)}개 표시
        </span>
      </div>

      {/* 오른쪽: 페이지 네비게이션 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {renderPageNumbers()}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="다음 페이지"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
