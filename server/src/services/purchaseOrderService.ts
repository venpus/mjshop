import { pool } from '../config/database.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrderRepository.js';
import {
  PurchaseOrder,
  PurchaseOrderPublic,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  ReorderPurchaseOrderDTO,
} from '../models/purchaseOrder.js';
import { RowDataPacket } from 'mysql2';
import { getKSTDateString, formatDateToKSTString, isNewCommissionCalculationDate } from '../utils/dateUtils.js';

export class PurchaseOrderService {
  private repository: PurchaseOrderRepository;

  constructor() {
    this.repository = new PurchaseOrderRepository();
  }

  /**
   * 모든 발주 조회 (패킹리스트 shipping summary 포함)
   * @param searchTerm 검색어 (선택사항)
   * @param page 페이지 번호 (1부터 시작)
   * @param limit 페이지당 항목 수
   */
  async getAllPurchaseOrders(searchTerm?: string, page?: number, limit?: number): Promise<{
    data: PurchaseOrderPublic[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let purchaseOrders;
    let total: number;

    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      purchaseOrders = await this.repository.findAll(searchTerm, limit, offset);
      total = await this.repository.count(searchTerm);
    } else {
      purchaseOrders = await this.repository.findAll(searchTerm);
      total = purchaseOrders.length;
    }

    const enrichedOrders = await Promise.all(purchaseOrders.map(async (po) => {
      const enriched = await this.enrichPurchaseOrder(po);
      return {
        ...enriched,
        factory_shipped_quantity: po.factory_shipped_quantity,
        unshipped_quantity: po.unshipped_quantity,
        shipped_quantity: po.shipped_quantity,
        shipping_quantity: po.shipping_quantity,
        arrived_quantity: po.arrived_quantity,
        unreceived_quantity: po.unreceived_quantity,
        warehouse_arrival_date: po.warehouse_arrival_date ? formatDateToKSTString(po.warehouse_arrival_date) : null,
        has_korea_arrival: po.has_korea_arrival || 0,
      };
    }));

    const currentPage = page || 1;
    const currentLimit = limit || total;
    const totalPages = limit ? Math.ceil(total / limit) : 1;

    return {
      data: enrichedOrders,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
    };
  }

  /**
   * 미출고 수량이 있는 발주 목록 조회
   * @param searchTerm 검색어 (선택사항)
   * @param page 페이지 번호 (1부터 시작)
   * @param limit 페이지당 항목 수
   */
  async getPurchaseOrdersWithUnshipped(searchTerm?: string, page?: number, limit?: number): Promise<{
    data: Array<PurchaseOrderPublic & { unshipped_quantity: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let purchaseOrders;
    let total: number;

    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      purchaseOrders = await this.repository.findAllWithUnshipped(searchTerm, limit, offset);
      total = await this.repository.countUnshipped(searchTerm);
    } else {
      purchaseOrders = await this.repository.findAllWithUnshipped(searchTerm);
      total = purchaseOrders.length;
    }

    const enrichedOrders = await Promise.all(purchaseOrders.map(async (po) => {
      const enriched = await this.enrichPurchaseOrder(po);
      return {
        ...enriched,
        unshipped_quantity: po.unshipped_quantity,
      };
    }));

    const currentPage = page || 1;
    const currentLimit = limit || total;
    const totalPages = limit ? Math.ceil(total / limit) : 1;

    return {
      data: enrichedOrders,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
    };
  }

  /**
   * ID로 발주 조회
   */
  async getPurchaseOrderById(id: string): Promise<PurchaseOrderPublic | null> {
    const purchaseOrder = await this.repository.findById(id);
    if (!purchaseOrder) {
      return null;
    }
    return this.enrichPurchaseOrder(purchaseOrder);
  }

  /**
   * 새 발주 생성
   */
  async createPurchaseOrder(
    data: CreatePurchaseOrderDTO,
    createdBy?: string
  ): Promise<PurchaseOrderPublic> {
    // 발주 ID 및 발주번호 생성
    const poId = await this.repository.generateNextId();
    const poNumber = await this.repository.generateNextPoNumber();

    // order_unit_price 자동 계산 (unit_price + back_margin)
    const calculatedOrderUnitPrice = (data.unit_price || 0) + (data.back_margin || 0);

    // 발주 생성
    const purchaseOrderData: CreatePurchaseOrderDTO = {
      ...data,
      order_unit_price: calculatedOrderUnitPrice > 0 ? calculatedOrderUnitPrice : undefined,
      created_by: createdBy,
    };

    const purchaseOrder = await this.repository.create(purchaseOrderData, poId, poNumber);

    // expected_final_unit_price 계산 및 업데이트 (생성 후 cost_items가 없을 수 있으므로 별도 처리)
    await this.calculateAndUpdateExpectedFinalUnitPrice(purchaseOrder.id);

    return this.enrichPurchaseOrder(purchaseOrder);
  }

  /**
   * 발주 수정
   */
  async updatePurchaseOrder(
    id: string,
    data: UpdatePurchaseOrderDTO,
    updatedBy?: string
  ): Promise<PurchaseOrderPublic> {
    // 발주 존재 확인
    const existingPurchaseOrder = await this.repository.findById(id);
    if (!existingPurchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    // 결제 상태 자동 계산 (payment_status가 명시적으로 전달되지 않은 경우)
    let calculatedPaymentStatus: '미결제' | '선금결제' | '완료' | undefined = undefined;
    if (data.payment_status === undefined) {
      // 선금/잔금 날짜 기준으로 결제 상태 자동 계산
      // data에서 날짜가 전달된 경우 사용하고, 없으면 기존 값 사용
      const advancePaymentDate = data.advance_payment_date !== undefined 
        ? (data.advance_payment_date && data.advance_payment_date.trim() !== '' ? data.advance_payment_date : null)
        : (existingPurchaseOrder.advance_payment_date ? existingPurchaseOrder.advance_payment_date.toISOString().split('T')[0] : null);
      const balancePaymentDate = data.balance_payment_date !== undefined 
        ? (data.balance_payment_date && data.balance_payment_date.trim() !== '' ? data.balance_payment_date : null)
        : (existingPurchaseOrder.balance_payment_date ? existingPurchaseOrder.balance_payment_date.toISOString().split('T')[0] : null);

      if (advancePaymentDate && balancePaymentDate) {
        // 선금과 잔금 날짜가 모두 있으면 '완료'
        calculatedPaymentStatus = '완료';
      } else if (advancePaymentDate) {
        // 선금 날짜만 있으면 '선금결제'
        calculatedPaymentStatus = '선금결제';
      } else {
        // 둘 다 없으면 '미결제'
        calculatedPaymentStatus = '미결제';
      }
    }

    // order_unit_price 자동 계산 (unit_price 또는 back_margin이 변경된 경우)
    let calculatedOrderUnitPrice: number | undefined = undefined;
    const unitPrice = data.unit_price !== undefined ? data.unit_price : existingPurchaseOrder.unit_price;
    const backMargin = data.back_margin !== undefined ? data.back_margin : existingPurchaseOrder.back_margin;
    if (unitPrice !== undefined || backMargin !== undefined) {
      calculatedOrderUnitPrice = (unitPrice || 0) + (backMargin || 0);
    }

    // 발주 수정
    const updateData: UpdatePurchaseOrderDTO = {
      ...data,
      // payment_status가 명시적으로 전달되지 않은 경우에만 자동 계산된 값 사용
      payment_status: data.payment_status !== undefined ? data.payment_status : calculatedPaymentStatus,
      // order_unit_price 자동 계산
      order_unit_price: calculatedOrderUnitPrice !== undefined ? calculatedOrderUnitPrice : data.order_unit_price,
      updated_by: updatedBy,
    };

    const purchaseOrder = await this.repository.update(id, updateData);

    // expected_final_unit_price 계산 및 업데이트 (관련 필드가 변경된 경우)
    const shouldRecalculateExpectedFinalUnitPrice = 
      data.unit_price !== undefined ||
      data.back_margin !== undefined ||
      data.quantity !== undefined ||
      data.commission_rate !== undefined ||
      data.shipping_cost !== undefined ||
      data.warehouse_shipping_cost !== undefined ||
      calculatedOrderUnitPrice !== undefined;

    if (shouldRecalculateExpectedFinalUnitPrice) {
      await this.calculateAndUpdateExpectedFinalUnitPrice(id);
    }

    return this.enrichPurchaseOrder(purchaseOrder);
  }

  /**
   * A레벨 관리자 비용 지불 완료 상태 업데이트
   */
  async updateAdminCostPaid(
    id: string,
    adminCostPaid: boolean
  ): Promise<PurchaseOrderPublic> {
    // 발주 존재 확인
    const existingPurchaseOrder = await this.repository.findById(id);
    if (!existingPurchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    // admin_cost_paid와 admin_cost_paid_date 업데이트
    const updateData: UpdatePurchaseOrderDTO = {
      admin_cost_paid: adminCostPaid,
      admin_cost_paid_date: adminCostPaid ? getKSTDateString() : undefined,
    };

    const purchaseOrder = await this.repository.update(id, updateData);
    return this.enrichPurchaseOrder(purchaseOrder);
  }

  /**
   * 발주 재주문 (기존 발주 정보를 복사하여 새 발주 생성)
   */
  async reorderPurchaseOrder(
    sourceOrderId: string,
    reorderData: ReorderPurchaseOrderDTO,
    createdBy?: string
  ): Promise<PurchaseOrderPublic> {
    // 원본 발주 조회
    const sourceOrder = await this.repository.findById(sourceOrderId);
    if (!sourceOrder) {
      throw new Error('원본 발주를 찾을 수 없습니다.');
    }

    // 발주 ID 및 발주번호 생성
    const poId = await this.repository.generateNextId();
    const poNumber = await this.repository.generateNextPoNumber();

    // 새 발주 기본 정보 생성
    // - 수량, 단가, 날짜는 사용자 입력값 사용
    // - product_id: 원본 발주의 product_id를 그대로 복사
    // - 상품정보: 사이즈, 무게, 포장 박스 사이즈, 소포장 개수 복제
    // - 가공/포장 탭(work_items): 작업 항목 및 이미지 복제
    const newOrderData: CreatePurchaseOrderDTO = {
      product_id: sourceOrder.product_id || undefined, // 원본의 product_id 복사
      product_name: sourceOrder.product_name,
      product_name_chinese: sourceOrder.product_name_chinese || undefined,
      product_category: sourceOrder.product_category,
      product_main_image: sourceOrder.product_main_image || undefined,
      // 상품정보 영역의 사이즈, 무게, 소포장 방식만 복제
      product_size: sourceOrder.product_size || undefined,
      product_weight: sourceOrder.product_weight || undefined,
      product_packaging_size: sourceOrder.product_packaging_size || undefined,
      packaging: sourceOrder.packaging || undefined,
      // 나머지 상품 정보 필드는 기본값 사용 (복제하지 않음)
      product_set_count: 1,
      product_small_pack_count: 1,
      product_box_count: 1,
      unit_price: reorderData.unit_price !== undefined ? reorderData.unit_price : sourceOrder.unit_price,
      quantity: reorderData.quantity,
      size: sourceOrder.size || undefined,
      weight: sourceOrder.weight || undefined,
      order_date: reorderData.order_date || sourceOrder.order_date?.toISOString().split('T')[0] || undefined,
      estimated_shipment_date: reorderData.estimated_shipment_date || sourceOrder.estimated_shipment_date?.toISOString().split('T')[0] || undefined,
      created_by: createdBy,
    };

    // 새 발주 생성
    const newOrder = await this.repository.create(newOrderData, poId, poNumber);

    // 메인 이미지 파일 복사 (product_main_image가 있는 경우)
    if (sourceOrder.product_main_image) {
      try {
        const { copyPOMainImage, getPOImageUrl } = await import('../utils/upload.js');
        const copiedMainImageRelativePath = await copyPOMainImage(
          sourceOrder.product_main_image,
          newOrder.id
        );
        const newMainImageUrl = getPOImageUrl(copiedMainImageRelativePath);
        
        // 새 발주의 메인 이미지 URL 업데이트
        await this.repository.update(newOrder.id, {
          product_main_image: newMainImageUrl,
        });
      } catch (error: any) {
        console.error(`메인 이미지 복사 실패: ${sourceOrder.product_main_image}`, error);
        // 메인 이미지 복사 실패해도 계속 진행 (경고만 출력)
      }
    }

    // 추가 비용 정보 복사 (운송비, 수수료 등)
    const updateData: UpdatePurchaseOrderDTO = {
      shipping_cost: sourceOrder.shipping_cost,
      warehouse_shipping_cost: sourceOrder.warehouse_shipping_cost,
      commission_rate: sourceOrder.commission_rate,
      commission_type: sourceOrder.commission_type || undefined,
      advance_payment_rate: sourceOrder.advance_payment_rate,
    };
    await this.repository.update(newOrder.id, updateData);

    // 비용 항목 복사
    const costItems = await this.getCostItemsByPoId(sourceOrderId);
    if (costItems.length > 0) {
      const costItemsToCopy = costItems.map(item => ({
        item_type: item.item_type,
        name: item.name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        is_admin_only: item.is_admin_only,
        display_order: item.display_order,
      }));
      await this.saveCostItems(newOrder.id, costItemsToCopy);
    }

    // 작업 항목 복사 (is_completed는 false로 초기화)
    const workItems = await this.getWorkItemsByPoId(sourceOrderId);
    if (workItems.length > 0) {
      // 원본 work_item ID 저장 (이미지 매핑용)
      const originalWorkItemIds = workItems.map(item => item.id);
      
      const workItemsToCopy = workItems.map(item => ({
        description_ko: item.description_ko || undefined,
        description_zh: item.description_zh || undefined,
        is_completed: false, // 재주문 시 작업 항목은 미완료 상태로 시작
        display_order: item.display_order,
      }));
      
      // 새 work_items 저장 및 ID 배열 반환 (순서 보장됨)
      const newWorkItemIds = await this.saveWorkItems(newOrder.id, workItemsToCopy);
      
      // 원본 work_item ID와 새 work_item ID 매핑
      const workItemIdMap = new Map<number, number>();
      for (let i = 0; i < originalWorkItemIds.length; i++) {
        workItemIdMap.set(originalWorkItemIds[i], newWorkItemIds[i]);
      }
      
      // 각 원본 work_item의 이미지를 새 work_item으로 복사
      for (const originalWorkItemId of originalWorkItemIds) {
        const newWorkItemId = workItemIdMap.get(originalWorkItemId);
        if (!newWorkItemId) continue;
        
        // 원본 work_item의 이미지 조회
        const sourceImages = await this.getImagesByPoIdAndType(
          sourceOrderId,
          'work_item',
          originalWorkItemId
        );
        
        // 이미지가 있으면 파일 복사 후 DB 저장
        if (sourceImages.length > 0) {
          const { copyPOImageFile } = await import('../utils/upload.js');
          const copiedImageUrls: string[] = [];
          
          // 각 이미지 파일을 새 발주 폴더로 복사
          for (const sourceImage of sourceImages) {
            try {
              const newImageUrl = await copyPOImageFile(
                sourceImage.image_url,
                newOrder.id,
                'work_item'
              );
              copiedImageUrls.push(newImageUrl);
            } catch (error: any) {
              console.error(`이미지 복사 실패: ${sourceImage.image_url}`, error);
              // 원본 파일이 없어도 계속 진행 (경고만 출력)
              // 필요시 에러를 throw하여 전체 트랜잭션 롤백 가능
            }
          }
          
          // 복사된 이미지 URL을 DB에 저장
          if (copiedImageUrls.length > 0) {
            await this.saveImages(
              newOrder.id,
              'work_item',
              newWorkItemId,
              copiedImageUrls
            );
          }
        }
      }
    }

    // other 타입 이미지 복사 (사진첩에 업로드한 이미지들)
    const otherImages = await this.getImagesByPoIdAndType(sourceOrderId, 'other');
    if (otherImages.length > 0) {
      const { copyPOImageFile } = await import('../utils/upload.js');
      const copiedImageUrls: string[] = [];
      
      // 각 이미지 파일을 새 발주 폴더로 복사
      for (const sourceImage of otherImages) {
        try {
          const newImageUrl = await copyPOImageFile(
            sourceImage.image_url,
            newOrder.id,
            'other'
          );
          copiedImageUrls.push(newImageUrl);
        } catch (error: any) {
          console.error(`other 타입 이미지 복사 실패: ${sourceImage.image_url}`, error);
          // 원본 파일이 없어도 계속 진행 (경고만 출력)
        }
      }
      
      // 복사된 이미지 URL을 DB에 저장 (related_id는 0으로 설정)
      if (copiedImageUrls.length > 0) {
        await this.saveImages(
          newOrder.id,
          'other',
          0,
          copiedImageUrls
        );
      }
    }

    return this.enrichPurchaseOrder(newOrder);
  }

  /**
   * 일괄 컨펌
   * @param orderIds 발주 ID 배열
   * @param updatedBy 수정자 ID
   */
  async batchConfirmPurchaseOrders(orderIds: string[], updatedBy?: string): Promise<void> {
    if (orderIds.length === 0) {
      throw new Error('발주 ID가 필요합니다.');
    }

    // 발주 존재 확인
    for (const id of orderIds) {
      const order = await this.repository.findById(id);
      if (!order) {
        throw new Error(`발주를 찾을 수 없습니다: ${id}`);
      }
    }

    // 일괄 업데이트
    await this.repository.batchUpdateConfirmed(orderIds, true, updatedBy);
  }

  /**
   * 일괄 컨펌 해제
   * @param orderIds 발주 ID 배열
   * @param updatedBy 수정자 ID
   */
  async batchUnconfirmPurchaseOrders(orderIds: string[], updatedBy?: string): Promise<void> {
    if (orderIds.length === 0) {
      throw new Error('발주 ID가 필요합니다.');
    }

    // 발주 존재 확인
    for (const id of orderIds) {
      const order = await this.repository.findById(id);
      if (!order) {
        throw new Error(`발주를 찾을 수 없습니다: ${id}`);
      }
    }

    // 일괄 업데이트
    await this.repository.batchUpdateConfirmed(orderIds, false, updatedBy);
  }

  /**
   * 일괄 삭제
   * @param orderIds 발주 ID 배열
   */
  async batchDeletePurchaseOrders(orderIds: string[]): Promise<void> {
    if (orderIds.length === 0) {
      throw new Error('발주 ID가 필요합니다.');
    }

    // 발주 존재 확인
    for (const id of orderIds) {
      const order = await this.repository.findById(id);
      if (!order) {
        throw new Error(`발주를 찾을 수 없습니다: ${id}`);
      }
    }

    // 일괄 삭제 (DB)
    await this.repository.batchDelete(orderIds);

    // 파일 시스템에서 이미지 폴더 삭제
    const { deletePOImageDir } = await import('../utils/upload.js');
    for (const id of orderIds) {
      try {
        await deletePOImageDir(id);
      } catch (error) {
        // 폴더 삭제 실패해도 DB는 이미 삭제되었으므로 로그만 기록하고 계속 진행
        console.error(`발주 이미지 폴더 삭제 실패: ${id}`, error);
      }
    }
  }

  /**
   * 발주 삭제
   */
  async deletePurchaseOrder(id: string): Promise<void> {
    const purchaseOrder = await this.repository.findById(id);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    // 1. DB에서 발주 삭제 (CASCADE로 관련 이미지 레코드도 자동 삭제됨)
    await this.repository.delete(id);

    // 2. 파일 시스템에서 이미지 폴더 삭제
    const { deletePOImageDir } = await import('../utils/upload.js');
    try {
      await deletePOImageDir(id);
    } catch (error) {
      // 폴더 삭제 실패해도 DB는 이미 삭제되었으므로 로그만 기록하고 계속 진행
      console.error(`발주 이미지 폴더 삭제 실패: ${id}`, error);
    }
  }

  /**
   * expected_final_unit_price 계산 및 업데이트 (public 메서드 - 패킹리스트 서비스에서 호출 가능)
   */
  async recalculateExpectedFinalUnitPrice(purchaseOrderId: string): Promise<void> {
    await this.calculateAndUpdateExpectedFinalUnitPrice(purchaseOrderId);
  }

  /**
   * expected_final_unit_price 계산 및 업데이트
   */
  private async calculateAndUpdateExpectedFinalUnitPrice(purchaseOrderId: string): Promise<void> {
    try {
      const po = await this.repository.findById(purchaseOrderId);
      if (!po || !po.quantity || po.quantity <= 0) {
        return;
      }

      // 옵션 비용과 인건비 합계 계산
      const costItems = await this.repository.findCostItemsByPoId(purchaseOrderId);
      const totalOptionCost = costItems
        .filter(item => item.item_type === 'option')
        .reduce((sum, item) => sum + item.cost, 0);
      const totalLaborCost = costItems
        .filter(item => item.item_type === 'labor')
        .reduce((sum, item) => sum + item.cost, 0);
      
      // 수수료 계산용: A레벨 관리자 전용 항목 제외
      const totalOptionCostForCommission = costItems
        .filter(item => item.item_type === 'option' && !item.is_admin_only)
        .reduce((sum, item) => sum + item.cost, 0);
      const totalLaborCostForCommission = costItems
        .filter(item => item.item_type === 'labor' && !item.is_admin_only)
        .reduce((sum, item) => sum + item.cost, 0);

      // 발주단가 계산
      const orderUnitPrice = po.order_unit_price || ((po.unit_price || 0) + (po.back_margin || 0));
      
      // 2025-01-06 이후 발주 여부 확인 (클라이언트와 동일한 로직 사용)
      const isNewCommissionDate = isNewCommissionCalculationDate(po.order_date);
      
      // 수수료 계산
      const commissionRate = po.commission_rate || 0;
      let commissionAmount = 0;
      let basicCostTotal = 0;
      
      if (isNewCommissionDate) {
        // 2025-01-06 이후: 수수료 = ((발주단가 × 수량) + 옵션비용 + 인건비) × 수수료율
        // A레벨 관리자 전용 항목은 수수료 계산에서 제외
        const baseAmount = orderUnitPrice * po.quantity;
        commissionAmount = (baseAmount + totalOptionCostForCommission + totalLaborCostForCommission) * (commissionRate / 100);
        // 기본 비용에는 수수료 미포함
        basicCostTotal = baseAmount;
      } else {
        // 기존 방식: 기본 비용 = 발주단가 × 수량 × (1 + 수수료율)
        basicCostTotal = orderUnitPrice * po.quantity * (1 + commissionRate / 100);
        commissionAmount = orderUnitPrice * po.quantity * (commissionRate / 100);
      }
      
      // 배송비 총액
      const shippingCostTotal = (po.shipping_cost || 0) + (po.warehouse_shipping_cost || 0);
      
      // 최종 결제 금액
      // 2025-01-06 이후: 기본비용 + 수수료 + 배송비 + 옵션비용 + 인건비
      // 기존: 기본비용(수수료 포함) + 배송비 + 옵션비용 + 인건비
      const finalPaymentAmount = isNewCommissionDate
        ? basicCostTotal + commissionAmount + shippingCostTotal + totalOptionCost + totalLaborCost
        : basicCostTotal + shippingCostTotal + totalOptionCost + totalLaborCost;

      // 패킹리스트 배송비 계산 (v_purchase_order_packing_shipping_cost 뷰 사용)
      const [packingListShippingData] = await pool.execute<RowDataPacket[]>(
        `SELECT purchase_order_id, ordered_quantity, unit_shipping_cost
         FROM v_purchase_order_packing_shipping_cost
         WHERE purchase_order_id = ?`,
        [purchaseOrderId]
      );
      
      let packingListShippingCost = 0;
      if (packingListShippingData.length > 0 && packingListShippingData[0]) {
        const unitShippingCost = Number(packingListShippingData[0].unit_shipping_cost) || 0;
        const orderedQuantity = Number(packingListShippingData[0].ordered_quantity) || 0;
        packingListShippingCost = unitShippingCost * orderedQuantity;
      }

      // 최종 예상단가 계산
      const expectedFinalUnitPrice = (finalPaymentAmount + packingListShippingCost) / po.quantity;

      // DB 업데이트
      await this.repository.update(purchaseOrderId, {
        expected_final_unit_price: expectedFinalUnitPrice > 0 ? expectedFinalUnitPrice : undefined,
      });
    } catch (error) {
      console.error(`expected_final_unit_price 계산 오류 (발주 ID: ${purchaseOrderId}):`, error);
      // 계산 실패해도 발주 생성/수정은 계속 진행
    }
  }

  /**
   * PurchaseOrder를 PurchaseOrderPublic으로 변환 (공급업체 및 상품 정보 포함)
   */
  private async enrichPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrderPublic> {
    // Date 객체를 YYYY-MM-DD 형식의 문자열로 변환하여 타임존 변환 문제 방지
    const result: PurchaseOrderPublic = {
      ...po,
      // 날짜 필드를 문자열로 변환 (타임존 변환 없이 날짜 부분만 추출)
      order_date: formatDateToKSTString(po.order_date) as any,
      estimated_delivery: formatDateToKSTString(po.estimated_delivery) as any,
      estimated_shipment_date: formatDateToKSTString(po.estimated_shipment_date) as any,
      work_start_date: formatDateToKSTString(po.work_start_date) as any,
      work_end_date: formatDateToKSTString(po.work_end_date) as any,
      advance_payment_date: formatDateToKSTString(po.advance_payment_date) as any,
      balance_payment_date: formatDateToKSTString(po.balance_payment_date) as any,
      admin_cost_paid_date: formatDateToKSTString(po.admin_cost_paid_date) as any,
    };

    // 상품 정보는 더 이상 JOIN 불필요 - 직접 매핑
    result.product = {
      id: po.product_id,
      name: po.product_name,
      name_chinese: po.product_name_chinese,
      main_image: po.product_main_image,
      category: po.product_category,
      size: po.product_size,
      weight: po.product_weight,
    };

    // 옵션 비용과 인건비 총액 계산
    const costItems = await this.repository.findCostItemsByPoId(po.id);
    const totalOptionCost = costItems
      .filter(item => item.item_type === 'option')
      .reduce((sum, item) => sum + item.cost, 0);
    const totalLaborCost = costItems
      .filter(item => item.item_type === 'labor')
      .reduce((sum, item) => sum + item.cost, 0);

    // 옵션 비용과 인건비 총액을 결과에 추가 (타입 확장 필요)
    (result as any).total_option_cost = totalOptionCost;
    (result as any).total_labor_cost = totalLaborCost;

    console.log(`[enrichPurchaseOrder] 발주 ID: ${po.id}, product_main_image: ${po.product_main_image}, product.main_image: ${result.product.main_image}`);

    return result;
  }

  /**
   * 발주 비용 항목 조회
   */
  async getCostItemsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; item_type: 'option' | 'labor'; name: string; unit_price: number; quantity: number; cost: number; is_admin_only: boolean; display_order: number }>> {
    return this.repository.findCostItemsByPoId(purchaseOrderId);
  }

  /**
   * 발주 비용 항목 저장
   * @param preserveAdminOnlyItems A 레벨이 아닌 경우, 기존 A 레벨 전용 항목을 유지할지 여부
   */
  async saveCostItems(
    purchaseOrderId: string,
    items: Array<{ item_type: 'option' | 'labor'; name: string; unit_price: number; quantity: number; is_admin_only?: boolean; display_order?: number }>,
    preserveAdminOnlyItems: boolean = false
  ): Promise<void> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    await this.repository.saveCostItems(purchaseOrderId, items, preserveAdminOnlyItems);

    // 비용 항목 저장 후 expected_final_unit_price 재계산
    await this.calculateAndUpdateExpectedFinalUnitPrice(purchaseOrderId);
  }

  /**
   * 발주 업체 출고 항목 조회
   */
  async getFactoryShipmentsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; shipment_date: Date | null; quantity: number; tracking_number: string | null; receive_date: Date | null; display_order: number }>> {
    return this.repository.findFactoryShipmentsByPoId(purchaseOrderId);
  }

  /**
   * 발주 업체 출고 항목 저장
   */
  async saveFactoryShipments(
    purchaseOrderId: string,
    shipments: Array<{ id?: number; shipment_date?: string | null; quantity: number; tracking_number?: string | null; receive_date?: string | null; display_order?: number }>
  ): Promise<number[]> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    return this.repository.saveFactoryShipments(purchaseOrderId, shipments);
  }

  /**
   * 발주 반품/교환 항목 조회
   */
  async getReturnExchangesByPoId(purchaseOrderId: string): Promise<Array<{ id: number; return_date: Date | null; quantity: number; tracking_number: string | null; receive_date: Date | null; reason: string | null; display_order: number }>> {
    return this.repository.findReturnExchangesByPoId(purchaseOrderId);
  }

  /**
   * 발주 반품/교환 항목 저장
   */
  async saveReturnExchanges(
    purchaseOrderId: string,
    items: Array<{ id?: number; return_date?: string | null; quantity: number; tracking_number?: string | null; receive_date?: string | null; reason?: string | null; display_order?: number }>
  ): Promise<number[]> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    return this.repository.saveReturnExchanges(purchaseOrderId, items);
  }

  /**
   * 발주 작업 항목 조회
   */
  async getWorkItemsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; description_ko: string | null; description_zh: string | null; is_completed: boolean; display_order: number }>> {
    return this.repository.findWorkItemsByPoId(purchaseOrderId);
  }

  /**
   * 발주 작업 항목 저장
   */
  async saveWorkItems(
    purchaseOrderId: string,
    items: Array<{ id?: number; description_ko?: string | null; description_zh?: string | null; is_completed?: boolean; display_order?: number }>
  ): Promise<number[]> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    return this.repository.saveWorkItems(purchaseOrderId, items);
  }

  /**
   * 발주 배송 세트 조회
   */
  async getDeliverySetsByPoId(purchaseOrderId: string): Promise<Array<{
    id: number;
    packing_code: string;
    packing_date: Date | null;
    display_order: number;
    package_info: Array<{
      id: number;
      types: string | null;
      pieces: string | null;
      sets: string | null;
      total: string | null;
      method: '박스' | '마대';
      weight: string | null;
      display_order: number;
    }>;
    logistics_info: Array<{
      id: number;
      tracking_number: string | null;
      company: string | null;
      display_order: number;
    }>;
  }>> {
    const result = await this.repository.findDeliverySetsByPoId(purchaseOrderId);
    // logistics_info 구조 변환: inland_company_name을 company로 매핑
    return result.map(set => ({
      ...set,
      logistics_info: set.logistics_info.map(log => ({
        id: log.id,
        tracking_number: log.tracking_number,
        company: log.inland_company_name || null,
        display_order: log.display_order,
      })),
    }));
  }

  /**
   * 발주 배송 세트 저장
   */
  async saveDeliverySets(
    purchaseOrderId: string,
    sets: Array<{
      id?: number;
      packing_code: string;
      packing_date?: string | null;
      display_order?: number;
      package_info?: Array<{
        id?: number;
        types?: string | null;
        pieces?: string | null;
        sets?: string | null;
        total?: string | null;
        method?: '박스' | '마대';
        weight?: string | null;
        display_order?: number;
      }>;
      logistics_info?: Array<{
        id?: number;
        tracking_number?: string | null;
        company?: string | null;
        display_order?: number;
      }>;
    }>
  ): Promise<Array<{
    delivery_set_id: number;
    logistics_info_ids: number[];
  }>> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    return this.repository.saveDeliverySets(purchaseOrderId, sets);
  }

  /**
   * 발주 이미지 조회
   */
  async getImagesByPoIdAndType(
    purchaseOrderId: string,
    imageType: 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
    relatedId?: number
  ): Promise<Array<{ id: number; image_url: string; display_order: number }>> {
    return this.repository.findImagesByPoIdAndType(purchaseOrderId, imageType, relatedId);
  }

  /**
   * 발주 이미지 저장
   */
  async saveImages(
    purchaseOrderId: string,
    imageType: 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
    relatedId: number,
    imageUrls: string[]
  ): Promise<number[]> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    return this.repository.saveImages(purchaseOrderId, imageType, relatedId, imageUrls);
  }

  /**
   * 발주 이미지 삭제
   */
  async deleteImages(imageIds: number[]): Promise<void> {
    await this.repository.deleteImages(imageIds);
  }

  /**
   * 발주 메모 조회
   */
  async getMemos(purchaseOrderId: string) {
    return await this.repository.getMemos(purchaseOrderId);
  }

  /**
   * 발주 메모 추가
   */
  async addMemo(purchaseOrderId: string, content: string, userId: string) {
    return await this.repository.addMemo(purchaseOrderId, content, userId);
  }

  /**
   * 발주 메모 삭제
   */
  async deleteMemo(memoId: number) {
    await this.repository.deleteMemo(memoId);
  }

  /**
   * 메모 댓글 추가
   */
  async addMemoReply(memoId: number, content: string, userId: string) {
    return await this.repository.addMemoReply(memoId, content, userId);
  }

  /**
   * 메모 댓글 삭제
   */
  async deleteMemoReply(replyId: number) {
    await this.repository.deleteMemoReply(replyId);
  }
}

