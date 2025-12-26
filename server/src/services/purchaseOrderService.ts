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

export class PurchaseOrderService {
  private repository: PurchaseOrderRepository;

  constructor() {
    this.repository = new PurchaseOrderRepository();
  }

  /**
   * 모든 발주 조회
   */
  async getAllPurchaseOrders(): Promise<PurchaseOrderPublic[]> {
    const purchaseOrders = await this.repository.findAll();
    return Promise.all(purchaseOrders.map((po) => this.enrichPurchaseOrder(po)));
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

    // supplier_id 처리
    let supplierId = data.supplier_id;
    if (!supplierId && data.supplier_name) {
      // supplier_name으로 조회
      const foundSupplierId = await this.repository.findSupplierIdByName(data.supplier_name);
      if (!foundSupplierId) {
        throw new Error(`공급업체를 찾을 수 없습니다: ${data.supplier_name}`);
      }
      supplierId = foundSupplierId;
    }

    if (!supplierId) {
      throw new Error('공급업체 ID 또는 이름이 필요합니다.');
    }

    // 발주 생성
    const purchaseOrderData: CreatePurchaseOrderDTO = {
      ...data,
      supplier_id: supplierId,
      created_by: createdBy,
    };

    const purchaseOrder = await this.repository.create(purchaseOrderData, poId, poNumber);

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

    // 발주 수정
    const updateData: UpdatePurchaseOrderDTO = {
      ...data,
      updated_by: updatedBy,
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

    // 새 발주 기본 정보 생성 (수량, 단가, 날짜는 사용자 입력값 사용, 나머지는 원본 복사)
    const newOrderData: CreatePurchaseOrderDTO = {
      product_id: sourceOrder.product_id,
      supplier_id: sourceOrder.supplier_id,
      unit_price: reorderData.unit_price !== undefined ? reorderData.unit_price : sourceOrder.unit_price,
      quantity: reorderData.quantity,
      size: sourceOrder.size || undefined,
      weight: sourceOrder.weight || undefined,
      packaging: sourceOrder.packaging || undefined,
      order_date: reorderData.order_date || sourceOrder.order_date?.toISOString().split('T')[0] || undefined,
      estimated_shipment_date: reorderData.estimated_shipment_date || sourceOrder.estimated_shipment_date?.toISOString().split('T')[0] || undefined,
      created_by: createdBy,
    };

    // 새 발주 생성
    const newOrder = await this.repository.create(newOrderData, poId, poNumber);

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
        cost: item.cost,
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

    return this.enrichPurchaseOrder(newOrder);
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
   * PurchaseOrder를 PurchaseOrderPublic으로 변환 (공급업체 및 상품 정보 포함)
   */
  private async enrichPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrderPublic> {
    const result: PurchaseOrderPublic = {
      ...po,
    };

    // 공급업체 정보 조회
    if (po.supplier_id) {
      const [supplierRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, name, url FROM suppliers WHERE id = ? LIMIT 1',
        [po.supplier_id]
      );
      if (supplierRows.length > 0) {
        result.supplier = {
          id: supplierRows[0].id,
          name: supplierRows[0].name,
          url: supplierRows[0].url,
        };
      }
    }

    // 상품 정보 조회
    if (po.product_id) {
      const [productRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, name, name_chinese, main_image FROM products WHERE id = ? LIMIT 1',
        [po.product_id]
      );
      if (productRows.length > 0) {
        result.product = {
          id: productRows[0].id,
          name: productRows[0].name,
          name_chinese: productRows[0].name_chinese,
          main_image: productRows[0].main_image,
        };
      }
    }

    return result;
  }

  /**
   * 발주 비용 항목 조회
   */
  async getCostItemsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; item_type: 'option' | 'labor'; name: string; cost: number; display_order: number }>> {
    return this.repository.findCostItemsByPoId(purchaseOrderId);
  }

  /**
   * 발주 비용 항목 저장
   */
  async saveCostItems(
    purchaseOrderId: string,
    items: Array<{ item_type: 'option' | 'labor'; name: string; cost: number; display_order?: number }>
  ): Promise<void> {
    // 발주 존재 확인
    const purchaseOrder = await this.repository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error('발주를 찾을 수 없습니다.');
    }

    await this.repository.saveCostItems(purchaseOrderId, items);
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
    return this.repository.findDeliverySetsByPoId(purchaseOrderId);
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
}

