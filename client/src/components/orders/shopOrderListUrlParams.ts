import {
  EMPTY_LINE_FULFILLMENT_FILTERS,
  type ShopOrderLineFulfillmentFilters,
} from '../../utils/shopOrderLineListUtils';
import type { ShopOrderListTab } from './ShopOrderListTabs';

export const SHOP_ORDERS_LIST_PATH = '/admin/orders';
export const SHOP_ORDER_LIST_TAB_PARAM = 'tab';
export const SHOP_ORDER_LIST_ALL_STATUS = '전체';

export function parseShopOrderListTab(value: string | null | undefined): ShopOrderListTab {
  if (value === 'lines') return 'lines';
  if (value === 'reservations') return 'reservations';
  return 'products';
}

const FULFILLMENT_FILTER_KEYS: Array<keyof ShopOrderLineFulfillmentFilters> = [
  'noStatement',
  'noPayment',
  'notArrived',
  'noTaxInvoice',
  'noTracking',
  'shippingReady',
];

export interface ShopOrderProductListUrlState {
  search: string;
  status: string;
  page: number;
}

export type ShopOrderLineDateField =
  | 'orderDate'
  | 'chinaInboundDate'
  | 'chinaOutboundDate'
  | 'koreaArrivalDate'
  | 'actualArrivalDate';

export const SHOP_ORDER_LINE_DATE_FIELD_OPTIONS: Array<{
  value: ShopOrderLineDateField;
  label: string;
}> = [
  { value: 'orderDate', label: '등록일' },
  { value: 'chinaInboundDate', label: '중국입고' },
  { value: 'chinaOutboundDate', label: '중국출고' },
  { value: 'koreaArrivalDate', label: '한국도착(예상)' },
  { value: 'actualArrivalDate', label: '한국도착(실제)' },
];

export const DEFAULT_SHOP_ORDER_LINE_DATE_FIELD: ShopOrderLineDateField = 'orderDate';

export interface ShopOrderLineListUrlState {
  search: string;
  status: string;
  dateField: ShopOrderLineDateField;
  dateFrom: string;
  dateTo: string;
  sortByCompanyAddress: boolean;
  fulfillmentFilters: ShopOrderLineFulfillmentFilters;
  page: number;
}

export interface ShopOrderListUrlState {
  tab: ShopOrderListTab;
  products: ShopOrderProductListUrlState;
  lines: ShopOrderLineListUrlState;
  reservations: ShopOrderLineListUrlState;
}

const DEFAULT_PRODUCT_LIST_STATE: ShopOrderProductListUrlState = {
  search: '',
  status: SHOP_ORDER_LIST_ALL_STATUS,
  page: 1,
};

const DEFAULT_LINE_LIST_STATE: ShopOrderLineListUrlState = {
  search: '',
  status: SHOP_ORDER_LIST_ALL_STATUS,
  dateField: DEFAULT_SHOP_ORDER_LINE_DATE_FIELD,
  dateFrom: '',
  dateTo: '',
  sortByCompanyAddress: false,
  fulfillmentFilters: { ...EMPTY_LINE_FULFILLMENT_FILTERS },
  page: 1,
};

function parsePage(value: string | null): number {
  const raw = parseInt(value ?? '1', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

function parseStatus(value: string | null): string {
  return value?.trim() ? value : SHOP_ORDER_LIST_ALL_STATUS;
}

function parseFulfillmentFilters(value: string | null): ShopOrderLineFulfillmentFilters {
  const filters = { ...EMPTY_LINE_FULFILLMENT_FILTERS };
  if (!value?.trim()) {
    return filters;
  }

  const active = new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean));
  for (const key of FULFILLMENT_FILTER_KEYS) {
    if (active.has(key)) {
      filters[key] = true;
    }
  }
  return filters;
}

function serializeFulfillmentFilters(filters: ShopOrderLineFulfillmentFilters): string {
  return FULFILLMENT_FILTER_KEYS.filter((key) => filters[key]).join(',');
}

function parseDateField(value: string | null): ShopOrderLineDateField {
  const valid = SHOP_ORDER_LINE_DATE_FIELD_OPTIONS.some((option) => option.value === value);
  return valid ? (value as ShopOrderLineDateField) : DEFAULT_SHOP_ORDER_LINE_DATE_FIELD;
}

function parseProductListState(params: URLSearchParams): ShopOrderProductListUrlState {
  return {
    search: params.get('pq') ?? '',
    status: parseStatus(params.get('pst')),
    page: parsePage(params.get('pp')),
  };
}

function parseLineListState(
  params: URLSearchParams,
  prefix: 'l' | 'r'
): ShopOrderLineListUrlState {
  return {
    search: params.get(`${prefix}q`) ?? '',
    status: parseStatus(params.get(`${prefix}st`)),
    dateField: parseDateField(params.get(`${prefix}dk`)),
    dateFrom: params.get(`${prefix}f`) ?? '',
    dateTo: params.get(`${prefix}t`) ?? '',
    sortByCompanyAddress: params.get(`${prefix}sort`) === '1',
    fulfillmentFilters: parseFulfillmentFilters(params.get(`${prefix}ff`)),
    page: parsePage(params.get(`${prefix}p`)),
  };
}

function writeProductListState(
  params: URLSearchParams,
  state: ShopOrderProductListUrlState
): void {
  if (state.search.trim()) {
    params.set('pq', state.search.trim());
  }
  if (state.status !== SHOP_ORDER_LIST_ALL_STATUS) {
    params.set('pst', state.status);
  }
  if (state.page > 1) {
    params.set('pp', String(state.page));
  }
}

function writeLineListState(
  params: URLSearchParams,
  prefix: 'l' | 'r',
  state: ShopOrderLineListUrlState
): void {
  if (state.search.trim()) {
    params.set(`${prefix}q`, state.search.trim());
  }
  if (state.status !== SHOP_ORDER_LIST_ALL_STATUS) {
    params.set(`${prefix}st`, state.status);
  }
  if (state.dateField !== DEFAULT_SHOP_ORDER_LINE_DATE_FIELD) {
    params.set(`${prefix}dk`, state.dateField);
  }
  if (state.dateFrom) {
    params.set(`${prefix}f`, state.dateFrom);
  }
  if (state.dateTo) {
    params.set(`${prefix}t`, state.dateTo);
  }
  if (state.sortByCompanyAddress) {
    params.set(`${prefix}sort`, '1');
  }
  const fulfillment = serializeFulfillmentFilters(state.fulfillmentFilters);
  if (fulfillment) {
    params.set(`${prefix}ff`, fulfillment);
  }
  if (state.page > 1) {
    params.set(`${prefix}p`, String(state.page));
  }
}

export function parseShopOrderListUrlState(params: URLSearchParams): ShopOrderListUrlState {
  const tab = parseShopOrderListTab(params.get(SHOP_ORDER_LIST_TAB_PARAM));
  return {
    tab,
    products: parseProductListState(params),
    lines: parseLineListState(params, 'l'),
    reservations: parseLineListState(params, 'r'),
  };
}

export function buildShopOrderListSearchParams(state: ShopOrderListUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.tab !== 'products') {
    params.set(SHOP_ORDER_LIST_TAB_PARAM, state.tab);
  }

  writeProductListState(params, state.products);
  writeLineListState(params, 'l', state.lines);
  writeLineListState(params, 'r', state.reservations);

  return params;
}

export function shopOrdersListPathWithState(state: ShopOrderListUrlState): string {
  const query = buildShopOrderListSearchParams(state).toString();
  return query ? `${SHOP_ORDERS_LIST_PATH}?${query}` : SHOP_ORDERS_LIST_PATH;
}

export function sanitizeShopOrdersListReturnTo(returnPath: string | null | undefined): string {
  if (!returnPath) {
    return SHOP_ORDERS_LIST_PATH;
  }

  try {
    const decoded = decodeURIComponent(returnPath);
    if (!decoded.startsWith(SHOP_ORDERS_LIST_PATH)) {
      return SHOP_ORDERS_LIST_PATH;
    }
    if (decoded.includes('://') || decoded.includes('..')) {
      return SHOP_ORDERS_LIST_PATH;
    }
    return decoded;
  } catch {
    return SHOP_ORDERS_LIST_PATH;
  }
}

export function getDefaultShopOrderListUrlState(
  tab: ShopOrderListTab = 'products'
): ShopOrderListUrlState {
  return {
    tab,
    products: { ...DEFAULT_PRODUCT_LIST_STATE },
    lines: { ...DEFAULT_LINE_LIST_STATE, fulfillmentFilters: { ...EMPTY_LINE_FULFILLMENT_FILTERS } },
    reservations: {
      ...DEFAULT_LINE_LIST_STATE,
      fulfillmentFilters: { ...EMPTY_LINE_FULFILLMENT_FILTERS },
    },
  };
}
