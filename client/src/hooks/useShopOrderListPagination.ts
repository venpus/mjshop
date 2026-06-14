import { useEffect, useMemo, useState } from 'react';

export const SHOP_ORDER_LIST_PAGE_SIZE = 20;

export function useShopOrderListPagination<T>(items: T[], resetKey: string) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / SHOP_ORDER_LIST_PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * SHOP_ORDER_LIST_PAGE_SIZE;
  const endIndex = startIndex + SHOP_ORDER_LIST_PAGE_SIZE;

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  return {
    paginatedItems,
    currentPage: safeCurrentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  };
}
