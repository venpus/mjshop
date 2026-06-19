import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ShopOrderLineFulfillmentFilters } from '../utils/shopOrderLineListUtils';
import { EMPTY_LINE_FULFILLMENT_FILTERS } from '../utils/shopOrderLineListUtils';
import type { ShopOrderLineListKind } from '../utils/shopOrderListExport';
import {
  buildShopOrderListSearchParams,
  parseShopOrderListUrlState,
  type ShopOrderLineListUrlState,
  type ShopOrderProductListUrlState,
} from '../components/orders/shopOrderListUrlParams';

function usePatchShopOrderListUrlState() {
  const [, setSearchParams] = useSearchParams();

  return useCallback(
    (
      updater: (
        state: ReturnType<typeof parseShopOrderListUrlState>
      ) => ReturnType<typeof parseShopOrderListUrlState>
    ) => {
      setSearchParams(
        (prev) => {
          const current = parseShopOrderListUrlState(prev);
          const next = updater(current);
          if (next === current) {
            return prev;
          }
          return buildShopOrderListSearchParams(next);
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
}

export function useShopOrderProductListUrlState() {
  const [searchParams] = useSearchParams();
  const state = useMemo(
    () => parseShopOrderListUrlState(searchParams).products,
    [searchParams]
  );
  const patchList = usePatchShopOrderListUrlState();

  const patch = useCallback(
    (patchState: Partial<ShopOrderProductListUrlState>, resetPage = false) => {
      patchList((current) => ({
        ...current,
        products: {
          ...current.products,
          ...patchState,
          ...(resetPage ? { page: 1 } : null),
        },
      }));
    },
    [patchList]
  );

  const persistSearchTerm = useCallback(
    (value: string) => {
      patchList((current) => {
        if (current.products.search === value) {
          return current;
        }
        return {
          ...current,
          products: {
            ...current.products,
            search: value,
            page: 1,
          },
        };
      });
    },
    [patchList]
  );

  const setStatusFilter = useCallback(
    (value: string) => patch({ status: value }, true),
    [patch]
  );
  const setCurrentPage = useCallback(
    (page: number) => {
      patchList((current) => {
        if (current.products.page === page) {
          return current;
        }
        return {
          ...current,
          products: {
            ...current.products,
            page,
          },
        };
      });
    },
    [patchList]
  );

  return {
    urlSearchTerm: state.search,
    persistSearchTerm,
    statusFilter: state.status,
    setStatusFilter,
    currentPage: state.page,
    setCurrentPage,
  };
}

type LineListSection = 'lines' | 'reservations';

function lineKindToSection(
  lineKind: Extract<ShopOrderLineListKind, 'orders' | 'reservations'>
): LineListSection {
  return lineKind === 'reservations' ? 'reservations' : 'lines';
}

export function useShopOrderLineListUrlState(
  lineKind: Extract<ShopOrderLineListKind, 'orders' | 'reservations'>
) {
  const section = lineKindToSection(lineKind);
  const [searchParams] = useSearchParams();
  const state = useMemo(
    () => parseShopOrderListUrlState(searchParams)[section],
    [searchParams, section]
  );
  const patchList = usePatchShopOrderListUrlState();

  const patch = useCallback(
    (patchState: Partial<ShopOrderLineListUrlState>, resetPage = false) => {
      patchList((current) => ({
        ...current,
        [section]: {
          ...current[section],
          ...patchState,
          ...(resetPage ? { page: 1 } : null),
        },
      }));
    },
    [patchList, section]
  );

  const persistSearchTerm = useCallback(
    (value: string) => {
      patchList((current) => {
        if (current[section].search === value) {
          return current;
        }
        return {
          ...current,
          [section]: {
            ...current[section],
            search: value,
            page: 1,
          },
        };
      });
    },
    [patchList, section]
  );

  const setStatusFilter = useCallback(
    (value: string) => patch({ status: value }, true),
    [patch]
  );
  const setDateFrom = useCallback(
    (value: string) => patch({ dateFrom: value }, true),
    [patch]
  );
  const setDateTo = useCallback(
    (value: string) => patch({ dateTo: value }, true),
    [patch]
  );
  const setSortByCompanyAddress = useCallback(
    (value: boolean) => patch({ sortByCompanyAddress: value }, true),
    [patch]
  );
  const toggleSortByCompanyAddress = useCallback(
    () => patch({ sortByCompanyAddress: !state.sortByCompanyAddress }, true),
    [patch, state.sortByCompanyAddress]
  );
  const toggleFulfillmentFilter = useCallback(
    (key: keyof ShopOrderLineFulfillmentFilters) => {
      patch(
        {
          fulfillmentFilters: {
            ...state.fulfillmentFilters,
            [key]: !state.fulfillmentFilters[key],
          },
        },
        true
      );
    },
    [patch, state.fulfillmentFilters]
  );
  const clearFulfillmentFilters = useCallback(() => {
    patch({ fulfillmentFilters: { ...EMPTY_LINE_FULFILLMENT_FILTERS } }, true);
  }, [patch]);
  const setCurrentPage = useCallback(
    (page: number) => {
      patchList((current) => {
        if (current[section].page === page) {
          return current;
        }
        return {
          ...current,
          [section]: {
            ...current[section],
            page,
          },
        };
      });
    },
    [patchList, section]
  );

  return {
    urlSearchTerm: state.search,
    persistSearchTerm,
    statusFilter: state.status,
    setStatusFilter,
    dateFrom: state.dateFrom,
    setDateFrom,
    dateTo: state.dateTo,
    setDateTo,
    sortByCompanyAddress: state.sortByCompanyAddress,
    setSortByCompanyAddress,
    toggleSortByCompanyAddress,
    fulfillmentFilters: state.fulfillmentFilters,
    toggleFulfillmentFilter,
    clearFulfillmentFilters,
    currentPage: state.page,
    setCurrentPage,
  };
}
