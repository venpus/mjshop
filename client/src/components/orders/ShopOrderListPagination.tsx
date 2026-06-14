import { TablePagination } from '../ui/table-pagination';
import { SHOP_ORDER_LIST_PAGE_SIZE } from '../../hooks/useShopOrderListPagination';

interface ShopOrderListPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ShopOrderListPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  className = '',
}: ShopOrderListPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <TablePagination
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={SHOP_ORDER_LIST_PAGE_SIZE}
      totalItems={totalItems}
      startIndex={startIndex}
      endIndex={endIndex}
      itemsPerPageOptions={[SHOP_ORDER_LIST_PAGE_SIZE]}
      showItemsPerPageSelector={false}
      onPageChange={onPageChange}
      onItemsPerPageChange={() => {}}
      className={className}
    />
  );
}
