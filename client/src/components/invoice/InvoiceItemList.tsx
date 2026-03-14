import { TablePagination } from '../ui/table-pagination';
import { InvoiceItemRow } from './InvoiceItemRow';
import type { InvoiceEntry } from './types';

export interface InvoiceItemListProps {
  entries: InvoiceEntry[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReUpload: (id: string) => void;
}

export function InvoiceItemList({
  entries,
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  onEdit,
  onDelete,
  onReUpload,
}: InvoiceItemListProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + entries.length - 1;

  if (totalItems === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm border border-gray-200 rounded-lg">
        추가된 인보이스가 없습니다. 상단에서 날짜·제품명·파일을 입력 후 추가해 주세요.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 font-medium text-gray-700 text-sm">날짜</th>
            <th className="px-3 py-2 font-medium text-gray-700 text-sm">제품명</th>
            <th className="px-3 py-2 font-medium text-gray-700 text-sm">인보이스 파일</th>
            <th className="px-3 py-2 font-medium text-gray-700 text-sm">사진자료</th>
            <th className="px-3 py-2 font-medium text-gray-700 text-sm w-28 text-right">작업</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <InvoiceItemRow
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
              onReUpload={onReUpload}
            />
          ))}
        </tbody>
      </table>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </div>
  );
}
