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
          return buildShopOrderListSearchParams(updater(current));
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

  return {
    searchTerm: state.search,
    applySearchTerm: (value: string) => patch({ search: value }, true),
    statusFilter: state.status,
    setStatusFilter: (value: string) => patch({ status: value }, true),
    currentPage: state.page,
    setCurrentPage: (page: number) => patch({ page }),
  };
}

type LineListSection = 'lines' | 'reservations';

function lineKindToSection(lineKind: Extract<ShopOrderLineListKind, 'orders' | 'reservations'>): LineListSection {
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

  return {
    searchTerm: state.search,
    applySearchTerm: (value: string) => patch({ search: value }, true),
    statusFilter: state.status,
    setStatusFilter: (value: string) => patch({ status: value }, true),
    dateFrom: state.dateFrom,
    setDateFrom: (value: string) => patch({ dateFrom: value }, true),
    dateTo: state.dateTo,
    setDateTo: (value: string) => patch({ dateTo: value }, true),
    sortByCompanyAddress: state.sortByCompanyAddress,
    setSortByCompanyAddress: (value: boolean) => patch({ sortByCompanyAddress: value }, true),
    toggleSortByCompanyAddress: () => patch({ sortByCompanyAddress: !state.sortByCompanyAddress }, true),
    fulfillmentFilters: state.fulfillmentFilters,
    toggleFulfillmentFilter,
    clearFulfillmentFilters,
    currentPage: state.page,
    setCurrentPage: (page: number) => patch({ page }),
  };
}
