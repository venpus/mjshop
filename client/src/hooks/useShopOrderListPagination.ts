import { useEffect, useMemo, useRef, useState } from 'react';

export const SHOP_ORDER_LIST_PAGE_SIZE = 20;

export function useShopOrderListPagination<T>(
  items: T[],
  resetKey: string,
  options?: { page?: number; onPageChange?: (page: number) => void }
) {
  const isControlled = options?.page != null && options?.onPageChange != null;
  const [uncontrolledPage, setUncontrolledPage] = useState(1);
  const currentPage = isControlled ? options!.page! : uncontrolledPage;
  const setCurrentPage = isControlled ? options!.onPageChange! : setUncontrolledPage;
  const onPageChangeRef = useRef(setCurrentPage);
  const prevResetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onPageChangeRef.current = setCurrentPage;
  }, [setCurrentPage]);

  useEffect(() => {
    if (prevResetKeyRef.current === null) {
      prevResetKeyRef.current = resetKey;
      return;
    }
    if (prevResetKeyRef.current === resetKey) {
      return;
    }
    prevResetKeyRef.current = resetKey;
    onPageChangeRef.current(1);
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
