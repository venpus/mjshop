/**
 * AI 채팅용 데이터 검색 서비스.
 * 의도(intent)에 따라 기존 서비스를 호출하고, AI에 넘길 문자열을 반환합니다.
 */
import { PurchaseOrderService } from './purchaseOrderService.js';
import { ProductService } from './productService.js';
import { ProjectService } from './projectService.js';
import { PaymentRequestService } from './paymentRequestService.js';
import { PackingListService } from './packingListService.js';
import { PaymentHistoryService } from './paymentHistoryService.js';
import { MaterialService } from './materialService.js';
import { LogisticsOptionsService } from './logisticsOptionsService.js';
import { StockOutboundService } from './stockOutboundService.js';
import { AdminAccountService } from './adminAccountService.js';
import { PermissionService } from './permissionService.js';

const purchaseOrderService = new PurchaseOrderService();
const productService = new ProductService();
const projectService = new ProjectService();
const paymentRequestService = new PaymentRequestService();
const packingListService = new PackingListService();
const paymentHistoryService = new PaymentHistoryService();
const materialService = new MaterialService();
const logisticsOptionsService = new LogisticsOptionsService();
const stockOutboundService = new StockOutboundService();
const adminAccountService = new AdminAccountService();
const permissionService = new PermissionService();

/** AI 검색 시 페이징 없이 전체 데이터 조회용 (일부 API만 상한 적용) */
const FULL_FETCH_LIMIT = 50000;

const KST = 'Asia/Seoul';

/** 서버(KST) 기준 오늘 날짜 YYYY-MM-DD */
function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: KST });
}

/** 서버(KST) 기준 오늘 - N일 날짜 YYYY-MM-DD */
function getDaysAgoKST(days: number): string {
  const todayStr = getTodayKST();
  const [y, m, d] = todayStr.split('-').map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const ago = new Date(todayUtc - days * 24 * 60 * 60 * 1000);
  return ago.toLocaleDateString('en-CA', { timeZone: KST });
}

export type DataIntent =
  | 'purchase_orders'
  | 'purchase_orders_unshipped'
  | 'not_arrived'
  | 'products'
  | 'projects'
  | 'payment_requests'
  | 'packing_lists'
  | 'payment_history'
  | 'materials'
  | 'logistics_options'
  | 'stock_outbound'
  | 'admin_accounts'
  | 'permissions'
  | 'general';

export interface IntentParams {
  limit?: number;
  search?: string;
  page?: number;
  year?: number;
  month?: number;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * 의도에 맞는 데이터를 조회해 AI에 넘길 문자열로 반환합니다.
 */
export async function fetchDataByIntent(
  intent: string,
  params: IntentParams = {}
): Promise<string> {
  const search = params.search?.trim();

  try {
    switch (intent) {
      case 'purchase_orders': {
        const result = await purchaseOrderService.getAllPurchaseOrders(search);
        const summary = {
          total: result.total,
          items: result.data.map((po) => ({
            발주번호: po.po_number,
            상품명: po.product_name,
            수량: po.quantity,
            상태: po.order_status ?? po.delivery_status ?? '-',
            주문일: po.order_date ?? '-',
            미입고수량: po.unreceived_quantity ?? 0,
            미발송수량: po.unshipped_quantity ?? 0,
            배송중수량: po.shipping_quantity ?? 0,
            한국도착수량: po.arrived_quantity ?? 0,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'purchase_orders_unshipped': {
        const result = await purchaseOrderService.getPurchaseOrdersWithUnshipped(search);
        const summary = {
          total: result.total,
          items: result.data.map((po) => ({
            발주번호: po.po_number,
            상품명: po.product_name,
            주문수량: po.quantity,
            미출고수량: po.unshipped_quantity,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'not_arrived': {
        const result = await purchaseOrderService.getNotArrivedAnalysis();
        const summary = {
          요약: result.summary,
          항목수: result.items.length,
          items: result.items.map((item) => ({
            발주번호: item.po_number,
            상품명: item.product_name,
            주문수량: item.quantity,
            한국미도착수량: item.not_arrived_quantity,
            입고수량: item.arrived_quantity,
            배송중수량: item.shipping_quantity,
            예상도착일: item.estimated_delivery ?? '-',
            주문일: item.order_date ?? '-',
            미도착금액: item.unit_price * item.not_arrived_quantity,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'products': {
        const products = await productService.getAllProducts();
        const summary = {
          total: products.length,
          items: products.map((p) => ({
            상품명: p.name,
            카테고리: p.category,
            재고: p.stock,
            가격원: p.price,
            상태: p.status,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'projects': {
        const list = await projectService.getAllProjectsForList();
        const summary = {
          total: list.length,
          items: list.map((p) => ({
            프로젝트명: p.name,
            상태: p.status,
            시작일: p.start_date ?? '-',
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'payment_requests': {
        const requests = await paymentRequestService.getAllPaymentRequests();
        const summary = {
          total: requests.length,
          items: requests.map((r) => ({
            요청ID: r.id,
            출처타입: r.source_type,
            출처ID: r.source_id,
            상태: r.status,
            금액: r.amount,
            요청일: r.request_date ? String(r.request_date).slice(0, 10) : '-',
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'packing_lists': {
        const startDate = params.start_date?.trim();
        const endDate = params.end_date?.trim();
        const year = params.year != null ? Number(params.year) : undefined;
        const month = params.month != null ? Number(params.month) : undefined;
        let lists;
        if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          lists = await packingListService.getPackingListsForSummary(startDate, endDate);
        } else {
          lists = await packingListService.getPackingListsForSummary(year, month);
        }
        const summary = {
          total: lists.length,
          items: lists.map((pl) => ({
            코드: pl.code,
            발송일: pl.shipment_date ? String(pl.shipment_date).slice(0, 10) : '-',
            물류회사: pl.logistics_company ?? '-',
            배송비: pl.shipping_cost,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'payment_history': {
        const filter: { type?: 'purchase-orders' | 'packing-lists'; status?: 'all' | 'paid' | 'pending'; start_date?: string; end_date?: string; search?: string } = {};
        if (params.type === 'purchase-orders' || params.type === 'packing-lists') filter.type = params.type;
        if (params.status) filter.status = params.status as 'all' | 'paid' | 'pending';
        if (params.start_date) filter.start_date = params.start_date;
        if (params.end_date) filter.end_date = params.end_date;
        if (params.search) filter.search = params.search;
        const items = await paymentHistoryService.getPaymentHistory(filter);
        const summary = {
          total: items.length,
          items: items.map((item) => ({
            출처: item.source_type,
            출처ID: item.source_id,
            발주번호: item.po_number ?? item.packing_code ?? '-',
            상품명: item.product_name ?? '-',
            금액: item.amount ?? item.final_payment_amount ?? item.advance_payment_amount ?? item.balance_payment_amount ?? '-',
            결제일: item.payment_date ?? item.advance_payment_date ?? item.balance_payment_date ?? '-',
            상태: item.status ?? item.advance_status ?? item.balance_status ?? '-',
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'materials': {
        const materials = await materialService.getAllMaterials();
        const summary = {
          total: materials.length,
          items: materials.map((m) => ({
            코드: m.code,
            제품명: m.productName,
            카테고리: m.category,
            구매완료: m.purchaseComplete,
            현재재고: m.currentStock,
            단가: m.price ?? '-',
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'logistics_options': {
        const [companies, warehouses] = await Promise.all([
          logisticsOptionsService.getAllInlandCompanies(),
          logisticsOptionsService.getAllWarehouses(),
        ]);
        const summary = {
          내륙운송회사수: companies.length,
          내륙운송회사: companies.map((c) => c.name),
          도착창고수: warehouses.length,
          도착창고: warehouses.map((w) => w.name),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'stock_outbound': {
        const records = await stockOutboundService.getAllRecords(FULL_FETCH_LIMIT);
        const summary = {
          total: records.length,
          items: records.map((r) => ({
            그룹키: r.groupKey,
            출고일: r.outboundDate,
            고객명: r.customerName,
            수량: r.quantity,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'admin_accounts': {
        const accounts = await adminAccountService.getAllAccounts();
        const summary = {
          total: accounts.length,
          items: accounts.map((a) => ({
            ID: a.id,
            이름: a.name,
            레벨: a.level,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      case 'permissions': {
        const resources = await permissionService.getAllPermissions();
        const summary = {
          total: resources.length,
          items: resources.map((r) => ({
            리소스: r.resource,
            권한: r.permissions,
          })),
        };
        return JSON.stringify(summary, null, 2);
      }

      default:
        return '';
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `[검색 중 오류 발생: ${message}]`;
  }
}

/** 도구 이름 → intent 매핑 (AI 에이전트용) */
const TOOL_TO_INTENT: Record<string, DataIntent> = {
  get_not_arrived_analysis: 'not_arrived',
  get_purchase_orders: 'purchase_orders',
  get_unshipped_orders: 'purchase_orders_unshipped',
  get_products: 'products',
  get_projects: 'projects',
  get_payment_requests: 'payment_requests',
  get_packing_lists: 'packing_lists',
  get_payment_history: 'payment_history',
  get_materials: 'materials',
  get_logistics_options: 'logistics_options',
  get_stock_outbound: 'stock_outbound',
  get_admin_accounts: 'admin_accounts',
  get_permissions: 'permissions',
};

/** 사용자 메시지가 "최근 N일/2주/오늘 기준" 기간 질의인지 여부 */
function wantsRecentPeriod(message: string): boolean {
  const normalized = (message || '').replace(/\s/g, '');
  return /최근|2주|오늘\s*기준|기준\s*최근|며칠|N일/.test(normalized) || /\d+일\s*간|최근\s*\d+/.test(message || '');
}

/**
 * AI가 호출한 도구를 실행하고 결과 문자열을 반환합니다.
 * 도구 이름과 인자(arguments JSON)를 받아 fetchDataByIntent에 연결합니다.
 * lastUserMessage: 패킹리스트 '최근 2주' 등 기간 질의 시 AI가 날짜를 넣지 않았을 때 서버에서 자동 계산하기 위해 사용(선택).
 */
export async function executeDataTool(
  toolName: string,
  args: Record<string, unknown> = {},
  lastUserMessage?: string
): Promise<string> {
  const intent = TOOL_TO_INTENT[toolName];
  if (!intent) {
    return `[알 수 없는 도구: ${toolName}]`;
  }
  let start_date: string | undefined = typeof args.start_date === 'string' ? args.start_date : undefined;
  let end_date: string | undefined = typeof args.end_date === 'string' ? args.end_date : undefined;

  // 패킹리스트 '최근 2주' 등 기간 질의인데 AI가 start_date/end_date를 넣지 않은 경우 → 서버(KST) 기준 오늘−14일~오늘로 채움
  if (toolName === 'get_packing_lists' && (!start_date || !end_date) && wantsRecentPeriod(lastUserMessage ?? '')) {
    if (!end_date) end_date = getTodayKST();
    if (!start_date) start_date = getDaysAgoKST(14);
  }

  const params: IntentParams = {
    limit: typeof args.limit === 'number' ? args.limit : undefined,
    search: typeof args.search === 'string' ? args.search : undefined,
    page: typeof args.page === 'number' ? args.page : undefined,
    year: typeof args.year === 'number' && Number.isFinite(args.year) ? args.year : (typeof args.year === 'string' ? (() => { const n = parseInt(args.year as string, 10); return Number.isFinite(n) ? n : undefined; })() : undefined),
    month: typeof args.month === 'number' && Number.isFinite(args.month) ? args.month : (typeof args.month === 'string' ? (() => { const n = parseInt(args.month as string, 10); return Number.isFinite(n) ? n : undefined; })() : undefined),
    type: typeof args.type === 'string' ? args.type : undefined,
    status: typeof args.status === 'string' ? args.status : undefined,
    start_date,
    end_date,
  };
  return fetchDataByIntent(intent, params);
}
