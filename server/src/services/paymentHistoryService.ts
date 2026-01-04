import { PurchaseOrderRepository } from '../repositories/purchaseOrderRepository.js';
import { PackingListRepository } from '../repositories/packingListRepository.js';
import { PaymentRequestRepository } from '../repositories/paymentRequestRepository.js';
import { pool } from '../config/database.js';
import { RowDataPacket } from 'mysql2';
import { formatDateToKSTString } from '../utils/dateUtils.js';

export interface AdminCostItem {
  id: number;
  item_type: 'option' | 'labor';
  name: string;
  unit_price: number;
  quantity: number;
  cost: number;
}

export interface PaymentHistoryItem {
  id: string;
  source_type: 'purchase_order' | 'packing_list';
  source_id: string;
  po_number?: string;
  po_numbers_with_quantities?: string; // 발주코드:수량 형식 (예: "PO001:10|PO002:5")
  packing_code?: string;
  product_name?: string;
  product_main_image?: string | null; // 상품 사진
  payment_type?: 'advance' | 'balance' | 'shipping'; // 패킹리스트용
  amount?: number; // 패킹리스트용
  payment_date?: string | null; // 패킹리스트용
  status?: 'paid' | 'pending'; // 패킹리스트용
  payment_request?: {
    id: number;
    request_number: string;
    status: '요청중' | '완료';
  };
  // 발주관리 상세 정보 (선금/잔금 통합)
  advance_payment_amount?: number;
  advance_payment_date?: string | null;
  advance_status?: 'paid' | 'pending';
  advance_payment_request?: {
    id: number;
    request_number: string;
    status: '요청중' | '완료';
  };
  balance_payment_amount?: number;
  balance_payment_date?: string | null;
  balance_status?: 'paid' | 'pending';
  balance_payment_request?: {
    id: number;
    request_number: string;
    status: '요청중' | '완료';
  };
  unit_price?: number;
  back_margin?: number; // 추가단가
  expected_final_unit_price?: number; // 최종 예상단가 (계산된 값)
  final_payment_amount?: number; // 발주금액 (계산된 값)
  quantity?: number;
  commission_rate?: number;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  admin_cost_items?: AdminCostItem[]; // A레벨 관리자 입력 항목들
  admin_total_cost?: number; // 추가단가 + A레벨 관리자 입력 비용 합계
  admin_cost_paid?: boolean; // A레벨 관리자 비용 지불 완료 여부
  admin_cost_paid_date?: string | null; // A레벨 관리자 비용 지불 완료일
  order_date?: string | null; // 발주일 (정렬용)
  created_at?: string | null; // 생성일 (정렬용)
  // 패킹리스트 상세 정보
  logistics_company?: string; // 물류회사
  pl_shipping_cost?: number;
  wk_payment_date?: string | null;
  calculated_weight?: number | null;
  actual_weight?: number | null;
  weight_ratio?: number | null;
  shipping_cost_difference?: number; // 실중량 배송비 - 비율 배송비 차액
  shipment_date?: string | null; // 발송일 (정렬용)
  pl_created_at?: string | null; // 패킹리스트 생성일 (정렬용)
  packing_list_ids?: string; // 패킹리스트 ID 목록 (쉼표로 구분)
}

export interface PaymentHistoryFilter {
  // type?: 'all' | 'purchase-orders' | 'packing-lists';
  type?: 'purchase-orders' | 'packing-lists';
  status?: 'all' | 'paid' | 'pending';
  start_date?: string;
  end_date?: string;
  search?: string;
}

export class PaymentHistoryService {
  private poRepository: PurchaseOrderRepository;
  private plRepository: PackingListRepository;
  private prRepository: PaymentRequestRepository;

  constructor() {
    this.poRepository = new PurchaseOrderRepository();
    this.plRepository = new PackingListRepository();
    this.prRepository = new PaymentRequestRepository();
  }

  /**
   * 결제내역 조회 (발주관리 + 패킹리스트 통합)
   */
  async getPaymentHistory(filter?: PaymentHistoryFilter): Promise<PaymentHistoryItem[]> {
    const items: PaymentHistoryItem[] = [];

    // 발주관리 결제 내역 조회
    // if (!filter?.type || filter.type === 'all' || filter.type === 'purchase-orders') {
    if (!filter?.type || filter.type === 'purchase-orders') {
      const poItems = await this.getPurchaseOrderPayments(filter);
      items.push(...poItems);
    }

    // 패킹리스트 결제 내역 조회
    // if (!filter?.type || filter.type === 'all' || filter.type === 'packing-lists') {
    if (!filter?.type || filter.type === 'packing-lists') {
      const plItems = await this.getPackingListPayments(filter);
      items.push(...plItems);
    }

    // 정렬: 최신순 (발주일/발송일 기준 내림차순)
    items.sort((a, b) => {
      // 발주관리인 경우: order_date 우선, 없으면 created_at
      // 패킹리스트인 경우: shipment_date 우선, 없으면 created_at
      let dateA = '';
      let dateB = '';
      
      if (a.source_type === 'purchase_order') {
        // 발주일 우선, 없으면 생성일
        dateA = a.order_date || a.created_at || '';
      } else {
        // 패킹리스트: 발송일 우선, 없으면 생성일
        dateA = a.shipment_date || a.pl_created_at || '';
      }
      
      if (b.source_type === 'purchase_order') {
        dateB = b.order_date || b.created_at || '';
      } else {
        dateB = b.shipment_date || b.pl_created_at || '';
      }
      
      // 날짜가 없으면 맨 뒤로 (최신순이므로)
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      // 내림차순 정렬 (최신순)
      return dateB.localeCompare(dateA);
    });

    return items;
  }

  /**
   * 발주관리 결제 내역 조회
   */
  private async getPurchaseOrderPayments(
    filter?: PaymentHistoryFilter
  ): Promise<PaymentHistoryItem[]> {
    try {
    let query = `
      SELECT 
        po.id,
        po.po_number,
        po.product_name,
        po.product_main_image,
        po.advance_payment_amount,
        po.advance_payment_date,
        po.balance_payment_amount,
        po.balance_payment_date,
        po.unit_price,
        po.back_margin,
        po.expected_final_unit_price,
        po.quantity,
        po.commission_rate,
        po.shipping_cost,
        po.warehouse_shipping_cost,
        po.admin_cost_paid,
        po.admin_cost_paid_date,
        po.order_date,
        po.created_at
      FROM purchase_orders po
      WHERE (po.advance_payment_amount > 0 OR po.balance_payment_amount > 0)
    `;
    const params: any[] = [];

    // 검색어 필터
    if (filter?.search) {
      query += ' AND (po.po_number LIKE ? OR po.product_name LIKE ?)';
      const searchPattern = `%${filter.search}%`;
      params.push(searchPattern, searchPattern);
    }

    // 기간 필터
    if (filter?.start_date) {
      query += ` AND (
        po.advance_payment_date >= ? OR 
        po.balance_payment_date >= ? OR
        (po.advance_payment_date IS NULL AND po.balance_payment_date IS NULL AND po.order_date >= ?)
      )`;
      params.push(filter.start_date, filter.start_date, filter.start_date);
    }

    if (filter?.end_date) {
      query += ` AND (
        po.advance_payment_date <= ? OR 
        po.balance_payment_date <= ? OR
        (po.advance_payment_date IS NULL AND po.balance_payment_date IS NULL AND po.order_date <= ?)
      )`;
      params.push(filter.end_date, filter.end_date, filter.end_date);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const itemsMap = new Map<string, PaymentHistoryItem>();

    for (const row of rows) {
      // A레벨 관리자 입력 항목 조회
      const [costItems] = await pool.execute<RowDataPacket[]>(
        `SELECT id, item_type, name, unit_price, quantity, cost
         FROM po_cost_items
         WHERE purchase_order_id = ? AND is_admin_only = 1
         ORDER BY item_type, display_order`,
        [row.id]
      );

      const adminCostItems: AdminCostItem[] = costItems.map((item) => ({
        id: item.id,
        item_type: item.item_type,
        name: item.name,
        unit_price: Number(item.unit_price),
        quantity: item.quantity,
        cost: Number(item.cost),
      }));

      // A레벨 관리자 비용 합계 계산 (추가단가 * 수량 + A레벨 관리자 입력 비용)
      const adminCostTotal = adminCostItems.reduce((sum, item) => sum + item.cost, 0);
      const backMargin = row.back_margin ? Number(row.back_margin) : 0;
      const quantity = row.quantity ? Number(row.quantity) : 0;
      const backMarginTotal = backMargin * quantity; // 추가단가 * 수량
      const adminTotalCost = backMarginTotal + adminCostTotal;

      // 옵션 비용과 인건비 합계 계산 (발주관리와 동일: 모든 항목 포함)
      const [allCostItems] = await pool.execute<RowDataPacket[]>(
        `SELECT item_type, SUM(cost) as total_cost
         FROM po_cost_items
         WHERE purchase_order_id = ?
         GROUP BY item_type`,
        [row.id]
      );

      let totalOptionCost = 0;
      let totalLaborCost = 0;
      for (const costItem of allCostItems) {
        if (costItem.item_type === 'option') {
          totalOptionCost += Number(costItem.total_cost) || 0;
        } else if (costItem.item_type === 'labor') {
          totalLaborCost += Number(costItem.total_cost) || 0;
        }
      }

      // 패킹리스트 배송비 계산 (발주관리와 동일: v_purchase_order_packing_shipping_cost 뷰 사용)
      const [packingListShippingData] = await pool.execute<RowDataPacket[]>(
        `SELECT purchase_order_id, ordered_quantity, total_shipping_cost, 
                total_shipped_quantity, unit_shipping_cost
         FROM v_purchase_order_packing_shipping_cost
         WHERE purchase_order_id = ?`,
        [row.id]
      );
      
      let packingListShippingCost = 0;
      if (packingListShippingData.length > 0 && packingListShippingData[0]) {
        const unitShippingCost = Number(packingListShippingData[0].unit_shipping_cost) || 0;
        const orderedQuantity = Number(packingListShippingData[0].ordered_quantity) || 0;
        
        // 발주 수량 × 단위당 배송비로 총 배송비 계산 (발주관리와 동일)
        packingListShippingCost = unitShippingCost * orderedQuantity;
      }

      // 발주금액 계산 (발주관리 화면과 동일한 방식)
      const unitPrice = Number(row.unit_price) || 0;
      const commissionRate = Number(row.commission_rate) || 0;
      const orderUnitPrice = unitPrice + backMargin; // 발주단가
      const basicCostTotal = orderUnitPrice * quantity * (1 + commissionRate / 100); // 기본 비용 총액
      const shippingCostTotal = (Number(row.shipping_cost) || 0) + (Number(row.warehouse_shipping_cost) || 0); // 배송비 총액
      const finalPaymentAmount = basicCostTotal + shippingCostTotal + totalOptionCost + totalLaborCost; // 발주금액

      // 최종 예상단가 계산 (발주관리 화면과 동일한 방식)
      const expectedFinalUnitPrice = quantity > 0 
        ? (finalPaymentAmount + packingListShippingCost) / quantity 
        : 0;

      // 발주별로 하나의 항목으로 통합
      const itemId = String(row.id);
      let item = itemsMap.get(itemId);

      if (!item) {
        // 선금 지급요청 정보 조회
        let advancePendingRequest = null;
        try {
          const advanceRequests = await this.prRepository.findBySource('purchase_order', String(row.id), 'advance');
          advancePendingRequest = advanceRequests.find((r) => r.status === '요청중') || null;
        } catch (error) {
          console.error(`선금 지급요청 조회 오류 (발주 ID: ${row.id}):`, error);
        }

        // 잔금 지급요청 정보 조회
        let balancePendingRequest = null;
        try {
          const balanceRequests = await this.prRepository.findBySource('purchase_order', String(row.id), 'balance');
          balancePendingRequest = balanceRequests.find((r) => r.status === '요청중') || null;
        } catch (error) {
          console.error(`잔금 지급요청 조회 오류 (발주 ID: ${row.id}):`, error);
        }

        const advanceStatus: 'paid' | 'pending' = row.advance_payment_date ? 'paid' : 'pending';
        const balanceStatus: 'paid' | 'pending' = row.balance_payment_date ? 'paid' : 'pending';

        // 상태 필터 적용
        if (filter?.status && filter.status !== 'all') {
          const hasPaid = advanceStatus === 'paid' || balanceStatus === 'paid';
          const hasPending = advanceStatus === 'pending' || balanceStatus === 'pending';
          
          if (filter.status === 'paid' && !hasPaid) continue;
          if (filter.status === 'pending' && !hasPending) continue;
        }

        item = {
          id: String(itemId),
          source_type: 'purchase_order',
          source_id: String(row.id),
          po_number: row.po_number,
          product_name: row.product_name,
          product_main_image: row.product_main_image || null,
          advance_payment_amount: row.advance_payment_amount ? Number(row.advance_payment_amount) : undefined,
          advance_payment_date: row.advance_payment_date
            ? formatDateToKSTString(row.advance_payment_date)
            : null,
          advance_status: advanceStatus,
          advance_payment_request: advancePendingRequest
            ? {
                id: advancePendingRequest.id,
                request_number: advancePendingRequest.request_number,
                status: advancePendingRequest.status,
              }
            : undefined,
          balance_payment_amount: row.balance_payment_amount ? Number(row.balance_payment_amount) : undefined,
          balance_payment_date: row.balance_payment_date
            ? formatDateToKSTString(row.balance_payment_date)
            : null,
          balance_status: balanceStatus,
          balance_payment_request: balancePendingRequest
            ? {
                id: balancePendingRequest.id,
                request_number: balancePendingRequest.request_number,
                status: balancePendingRequest.status,
              }
            : undefined,
          unit_price: Number(row.unit_price),
          back_margin: row.back_margin ? Number(row.back_margin) : undefined,
          expected_final_unit_price: expectedFinalUnitPrice > 0 ? expectedFinalUnitPrice : undefined,
          final_payment_amount: finalPaymentAmount > 0 ? finalPaymentAmount : undefined,
          quantity: row.quantity,
          commission_rate: Number(row.commission_rate),
          shipping_cost: Number(row.shipping_cost),
          warehouse_shipping_cost: Number(row.warehouse_shipping_cost),
          admin_cost_items: adminCostItems.length > 0 ? adminCostItems : undefined,
          admin_total_cost: adminTotalCost > 0 ? adminTotalCost : undefined,
          admin_cost_paid: row.admin_cost_paid ? Boolean(row.admin_cost_paid) : false,
          admin_cost_paid_date: row.admin_cost_paid_date
            ? formatDateToKSTString(row.admin_cost_paid_date)
            : null,
          order_date: row.order_date
            ? formatDateToKSTString(row.order_date)
            : null,
          created_at: row.created_at
            ? formatDateToKSTString(row.created_at)
            : null,
        };

        if (item) {
          itemsMap.set(itemId, item);
        }
      }
    }

    return Array.from(itemsMap.values());
    } catch (error) {
      console.error('발주관리 결제 내역 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 패킹리스트 결제 내역 조회 (패킹리스트 코드 기준으로 그룹화)
   */
  private async getPackingListPayments(
    filter?: PaymentHistoryFilter
  ): Promise<PaymentHistoryItem[]> {
    try {
    let query = `
      SELECT 
        pl.code,
        MAX(pl.logistics_company) as logistics_company,
        GROUP_CONCAT(DISTINCT po.po_number ORDER BY po.po_number SEPARATOR ', ') as po_numbers,
        SUM(pl.actual_weight) as total_actual_weight,
        AVG(pl.weight_ratio) as avg_weight_ratio,
        SUM(pl.calculated_weight) as total_calculated_weight,
        SUM(pl.shipping_cost) as total_shipping_cost,
        MAX(pl.wk_payment_date) as latest_payment_date,
        MIN(pl.shipment_date) as earliest_shipment_date,
        MAX(pl.shipment_date) as latest_shipment_date,
        MIN(pl.created_at) as earliest_created_at,
        MAX(pl.created_at) as latest_created_at,
        MAX(pl.admin_cost_paid) as admin_cost_paid,
        MAX(pl.admin_cost_paid_date) as admin_cost_paid_date,
        GROUP_CONCAT(DISTINCT pl.id ORDER BY pl.id SEPARATOR ',') as packing_list_ids
      FROM packing_lists pl
      LEFT JOIN packing_list_items pli ON pl.id = pli.packing_list_id
      LEFT JOIN purchase_orders po ON pli.purchase_order_id = po.id
      WHERE (pl.logistics_company IS NULL OR pl.logistics_company != '정상해운')
      GROUP BY pl.code
    `;
    const params: any[] = [];

    // 검색어 필터
    if (filter?.search) {
      query += ' HAVING pl.code LIKE ?';
      params.push(`%${filter.search}%`);
    }

    // 기간 필터
    if (filter?.start_date) {
      if (filter?.search) {
        query += ` AND (
          MAX(pl.wk_payment_date) >= ? OR
          (MAX(pl.wk_payment_date) IS NULL AND MAX(pl.shipment_date) >= ?)
        )`;
      } else {
        query += ` HAVING (
          MAX(pl.wk_payment_date) >= ? OR
          (MAX(pl.wk_payment_date) IS NULL AND MAX(pl.shipment_date) >= ?)
        )`;
      }
      params.push(filter.start_date, filter.start_date);
    }

    if (filter?.end_date) {
      if (filter?.search || filter?.start_date) {
        query += ` AND (
          MAX(pl.wk_payment_date) <= ? OR
          (MAX(pl.wk_payment_date) IS NULL AND MAX(pl.shipment_date) <= ?)
        )`;
      } else {
        query += ` HAVING (
          MAX(pl.wk_payment_date) <= ? OR
          (MAX(pl.wk_payment_date) IS NULL AND MAX(pl.shipment_date) <= ?)
        )`;
      }
      params.push(filter.end_date, filter.end_date);
    }

    // 정렬: 최신 발송일 기준
    query += ` ORDER BY MAX(pl.shipment_date) DESC, MAX(pl.created_at) DESC`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const items: PaymentHistoryItem[] = [];

    for (const row of rows) {
      const status: 'paid' | 'pending' = row.latest_payment_date ? 'paid' : 'pending';
      
      // 상태 필터 적용
      if (filter?.status && filter.status !== 'all') {
        if (filter.status === 'paid' && status !== 'paid') continue;
        if (filter.status === 'pending' && status !== 'pending') continue;
      }

      // 패킹리스트 ID 목록 가져오기
      const packingListIds = row.packing_list_ids ? row.packing_list_ids.split(',').map((id: string) => id.trim()) : [];

      // 지급요청 정보 조회 (패킹리스트 코드에 속한 모든 패킹리스트 ID에 대해 조회)
      let pendingRequest = null;
      try {
        for (const plId of packingListIds) {
          const requests = await this.prRepository.findBySource('packing_list', plId, 'shipping');
          const foundRequest = requests.find((r) => r.status === '요청중');
          if (foundRequest) {
            pendingRequest = foundRequest;
            break; // 첫 번째 요청중인 요청만 사용
          }
        }
      } catch (error) {
        console.error(`패킹리스트 지급요청 조회 오류 (Code: ${row.code}):`, error);
      }

      // 발주별 상품 정보 및 수량 계산
      let poNumbersWithQuantities: string | undefined = undefined;
      const poDetailsMap = new Map<string, { 
        quantity: number; 
        product_name: string; 
        product_main_image: string | null;
        entry_quantity: string | null;
        box_count: number;
        unit: string;
        total_quantity: number;
      }>();
      
      try {
        for (const plId of packingListIds) {
          const [poRows] = await pool.execute<RowDataPacket[]>(
            `SELECT 
              po.po_number, 
              po.product_name, 
              po.product_main_image,
              GROUP_CONCAT(DISTINCT pli.entry_quantity ORDER BY pli.id SEPARATOR ' / ') as entry_quantities,
              SUM(pli.box_count) as total_box_count,
              GROUP_CONCAT(DISTINCT pli.unit ORDER BY pli.id SEPARATOR ', ') as units,
              SUM(pli.total_quantity) as total_qty
             FROM packing_list_items pli
             INNER JOIN purchase_orders po ON pli.purchase_order_id = po.id
             WHERE pli.packing_list_id = ?
             GROUP BY po.po_number, po.product_name, po.product_main_image`,
            [plId]
          );
          
          for (const poRow of poRows) {
            const poNumber = poRow.po_number;
            const qty = Number(poRow.total_qty) || 0;
            const productName = poRow.product_name || '';
            const productImage = poRow.product_main_image || null;
            const entryQuantity = poRow.entry_quantities || null;
            const boxCount = Number(poRow.total_box_count) || 0;
            const unit = poRow.units || '박스';
            
            const existing = poDetailsMap.get(poNumber);
            if (existing) {
              existing.quantity += qty;
              existing.total_quantity += qty;
              existing.box_count += boxCount;
            } else {
              poDetailsMap.set(poNumber, {
                quantity: qty,
                total_quantity: qty,
                product_name: productName,
                product_main_image: productImage,
                entry_quantity: entryQuantity,
                box_count: boxCount,
                unit: unit,
              });
            }
          }
        }
        
        if (poDetailsMap.size > 0) {
          poNumbersWithQuantities = Array.from(poDetailsMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([poNumber, details]) => {
              // 형식: PO001:총수량:상품명:이미지URL:입수량:박스수:포장단위
              const entryQty = details.entry_quantity || '';
              const unit = details.unit || '박스';
              return `${poNumber}:${details.total_quantity}:${details.product_name}:${details.product_main_image || ''}:${entryQty}:${details.box_count}:${unit}`;
            })
            .join('|');
        }
      } catch (error) {
        console.error(`발주별 상품 정보 및 수량 계산 오류 (Code: ${row.code}):`, error);
      }

      // 배송비 차액 계산 (합계 기준)
      // 비율 중량 배송비(calculated_weight 기준)와 실중량 배송비(actual_weight 기준)의 차액
      let shippingCostDifference: number | undefined;
      const totalActualWeight = row.total_actual_weight ? Number(row.total_actual_weight) : 0;
      const totalCalculatedWeight = row.total_calculated_weight ? Number(row.total_calculated_weight) : 0;
      const totalShippingCost = row.total_shipping_cost ? Number(row.total_shipping_cost) : 0;
      
      if (totalActualWeight > 0 && totalCalculatedWeight > 0 && totalShippingCost > 0) {
        // 비율 중량 배송비는 total_shipping_cost (calculated_weight 기준으로 계산된 것으로 가정)
        const ratioBasedShippingCost = totalShippingCost;
        
        // 실중량 배송비는 중량 비율로 계산
        // 배송비는 중량에 비례한다고 가정
        const unitCost = totalShippingCost / totalCalculatedWeight;
        const actualWeightShippingCost = totalActualWeight * unitCost;
        
        // 차액 = 비율 중량 배송비 - 실중량 배송비
        shippingCostDifference = ratioBasedShippingCost - actualWeightShippingCost;
      }

      items.push({
        id: `pl-code-${row.code}`,
        source_type: 'packing_list',
        source_id: row.code, // 패킹리스트 코드를 source_id로 사용
        packing_code: row.code,
        logistics_company: row.logistics_company || undefined, // 물류회사
        po_number: row.po_numbers || undefined, // 발주코드 (여러 개일 수 있음)
        po_numbers_with_quantities: poNumbersWithQuantities, // 발주코드:수량 형식 (예: "PO001:10|PO002:5")
        payment_type: 'shipping',
        amount: totalShippingCost,
        payment_date: row.latest_payment_date
          ? formatDateToKSTString(row.latest_payment_date)
          : null,
        status,
        payment_request: pendingRequest
          ? {
              id: pendingRequest.id,
              request_number: pendingRequest.request_number,
              status: pendingRequest.status,
            }
          : undefined,
        packing_list_ids: row.packing_list_ids || undefined, // 패킹리스트 ID 목록 (쉼표로 구분)
        pl_shipping_cost: totalShippingCost,
        wk_payment_date: row.latest_payment_date
          ? formatDateToKSTString(row.latest_payment_date)
          : null,
        calculated_weight: totalCalculatedWeight > 0 ? totalCalculatedWeight : null,
        actual_weight: totalActualWeight > 0 ? totalActualWeight : null,
        weight_ratio: row.avg_weight_ratio ? Number(row.avg_weight_ratio) : null,
        shipping_cost_difference: shippingCostDifference,
        shipment_date: row.latest_shipment_date
          ? formatDateToKSTString(row.latest_shipment_date)
          : null,
        pl_created_at: row.latest_created_at
          ? formatDateToKSTString(row.latest_created_at)
          : null,
        admin_cost_paid: row.admin_cost_paid ? Boolean(row.admin_cost_paid) : false,
        admin_cost_paid_date: row.admin_cost_paid_date
          ? formatDateToKSTString(row.admin_cost_paid_date)
          : null,
      });
    }

    return items;
    } catch (error) {
      console.error('패킹리스트 결제 내역 조회 오류:', error);
      throw error;
    }
  }
}

