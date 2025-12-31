import { PackingListRepository } from '../repositories/packingListRepository.js';
import { pool } from '../config/database.js';
import {
  PackingList,
  PackingListItem,
  DomesticInvoice,
  DomesticInvoiceImage,
  KoreaArrival,
  CreatePackingListDTO,
  UpdatePackingListDTO,
  CreatePackingListItemDTO,
  UpdatePackingListItemDTO,
  CreateDomesticInvoiceDTO,
  UpdateDomesticInvoiceDTO,
  CreateKoreaArrivalDTO,
  UpdateKoreaArrivalDTO,
  PackingListWithItems,
  PurchaseOrderShippingCost,
  PurchaseOrderShippingSummary,
} from '../models/packingList.js';

export class PackingListService {
  private repository: PackingListRepository;

  constructor() {
    this.repository = new PackingListRepository();
  }

  /**
   * 모든 패킹리스트 조회 (아이템 포함)
   * 발송일 기준 최신순으로 정렬
   */
  async getAllPackingLists(): Promise<PackingListWithItems[]> {
    const packingLists = await this.repository.findAll();
    // 아이템 포함하여 조회
    const results = await Promise.all(
      packingLists.map((pl) => this.repository.findWithItems(pl.id))
    );
    const filtered = results.filter((r): r is PackingListWithItems => r !== null);
    
    // 발송일 기준 최신순으로 정렬 (명시적 정렬)
    filtered.sort((a, b) => {
      // shipment_date를 Date 객체로 변환
      const dateA = a.shipment_date instanceof Date 
        ? a.shipment_date.getTime() 
        : new Date(a.shipment_date).getTime();
      const dateB = b.shipment_date instanceof Date 
        ? b.shipment_date.getTime() 
        : new Date(b.shipment_date).getTime();
      
      // 유효하지 않은 날짜 처리
      if (isNaN(dateA) && isNaN(dateB)) {
        return 0;
      }
      if (isNaN(dateA)) return 1; // dateA가 유효하지 않으면 뒤로
      if (isNaN(dateB)) return -1; // dateB가 유효하지 않으면 뒤로
      
      if (dateA !== dateB) {
        return dateB - dateA; // 최신순 (내림차순)
      }
      
      // 발송일이 같으면 생성일 기준
      const createdA = a.created_at instanceof Date 
        ? a.created_at.getTime() 
        : new Date(a.created_at).getTime();
      const createdB = b.created_at instanceof Date 
        ? b.created_at.getTime() 
        : new Date(b.created_at).getTime();
      
      return createdB - createdA; // 최신순 (내림차순)
    });
    
    return filtered;
  }

  /**
   * ID로 패킹리스트 조회
   */
  async getPackingListById(id: number): Promise<PackingListWithItems | null> {
    return this.repository.findWithItems(id);
  }

  /**
   * 코드로 패킹리스트 조회
   */
  async getPackingListByCode(code: string): Promise<PackingListWithItems | null> {
    const packingList = await this.repository.findByCode(code);
    if (!packingList) {
      return null;
    }
    return this.repository.findWithItems(packingList.id);
  }

  /**
   * 패킹리스트 생성
   */
  async createPackingList(data: CreatePackingListDTO): Promise<PackingList> {
    // 코드와 날짜 조합으로 중복 체크
    const shipmentDate = typeof data.shipment_date === 'string' 
      ? data.shipment_date.split('T')[0] 
      : data.shipment_date;
    const existing = await this.repository.findByCodeAndDate(data.code, shipmentDate);
    if (existing) {
      throw new Error('동일한 코드와 날짜의 패킹리스트가 이미 존재합니다.');
    }

    return this.repository.create(data);
  }

  /**
   * 패킹리스트 수정
   */
  async updatePackingList(id: number, data: UpdatePackingListDTO): Promise<PackingList> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('패킹리스트를 찾을 수 없습니다.');
    }

    // 코드 또는 날짜 변경 시 중복 체크
    const newCode = data.code ?? existing.code;
    let newShipmentDate: string;
    
    if (data.shipment_date) {
      // 새로운 날짜가 제공된 경우
      newShipmentDate = typeof data.shipment_date === 'string' 
        ? data.shipment_date.split('T')[0] 
        : data.shipment_date instanceof Date 
          ? data.shipment_date.toISOString().split('T')[0]
          : String(data.shipment_date).split('T')[0];
    } else {
      // 기존 날짜 사용
      if (existing.shipment_date instanceof Date) {
        newShipmentDate = existing.shipment_date.toISOString().split('T')[0];
      } else if (typeof existing.shipment_date === 'string') {
        newShipmentDate = existing.shipment_date.split('T')[0];
      } else {
        newShipmentDate = String(existing.shipment_date).split('T')[0];
      }
    }
    
    // 코드나 날짜가 변경되었을 때만 중복 체크
    if (data.code || data.shipment_date) {
      const duplicate = await this.repository.findByCodeAndDate(newCode, newShipmentDate);
      if (duplicate && duplicate.id !== id) {
        throw new Error('동일한 코드와 날짜의 패킹리스트가 이미 존재합니다.');
      }
    }

    return this.repository.update(id, data);
  }

  /**
   * 패킹리스트 삭제
   */
  async deletePackingList(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('패킹리스트를 찾을 수 없습니다.');
    }

    await this.repository.delete(id);
  }

  /**
   * 패킹리스트 아이템 생성 (수량 검증 포함)
   */
  async createItem(data: CreatePackingListItemDTO): Promise<PackingListItem> {
    // 패킹리스트 존재 확인
    const packingList = await this.repository.findById(data.packing_list_id);
    if (!packingList) {
      throw new Error('패킹리스트를 찾을 수 없습니다.');
    }

    // 발주가 연결되어 있고 수량이 있는 경우에만 검증
    if (data.purchase_order_id && data.total_quantity) {
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 발주 정보 조회 (FOR UPDATE)
        const purchaseOrder = await this.repository.findPurchaseOrderForUpdate(data.purchase_order_id, connection);
        if (!purchaseOrder) {
          await connection.rollback();
          throw new Error('발주를 찾을 수 없습니다.');
        }

        // 현재까지 출고된 총 수량 계산
        const totalShipped = await this.repository.getTotalShippedQuantityByPurchaseOrder(
          data.purchase_order_id,
          connection
        );

        // 새로운 출고 수량을 포함한 총 수량 계산
        const newTotalShipped = totalShipped + data.total_quantity;

        // 발주 수량 초과 체크 (초과는 허용하되 경고는 없음 - 사용자 요구사항에 따라)
        // 현재는 초과도 허용하므로 검증만 수행하고 저장

        // 아이템 생성
        const item = await this.repository.createItemWithConnection(data, connection);

        // 공장→물류창고 플래그가 true일 경우 factory_shipments에 출고 항목 자동 생성
        if (data.is_factory_to_warehouse && data.purchase_order_id) {
          const shipmentDate = packingList.shipment_date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
          const receiveDate = packingList.warehouse_arrival_date 
            ? packingList.warehouse_arrival_date.toISOString().split('T')[0] 
            : shipmentDate; // 물류창고 도착일이 없으면 출고일과 동일

          await this.repository.createFactoryShipmentWithConnection(
            data.purchase_order_id,
            shipmentDate,
            data.total_quantity,
            receiveDate,
            packingList.code,
            connection
          );
        }

        await connection.commit();
        return item;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // 발주가 연결되지 않은 경우 기존 로직 사용
    // 단, is_factory_to_warehouse가 true인데 purchase_order_id가 없는 경우는 에러
    if (data.is_factory_to_warehouse && !data.purchase_order_id) {
      throw new Error('공장→물류창고 출고 항목 생성 시 발주 ID가 필요합니다.');
    }

    return this.repository.createItem(data);
  }

  /**
   * 패킹리스트 아이템 수정 (수량 검증 포함)
   */
  async updateItem(id: number, data: UpdatePackingListItemDTO): Promise<PackingListItem> {
    const existing = await this.repository.findItemById(id);
    if (!existing) {
      throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
    }

    // 수량이 변경되거나 발주 ID가 변경되는 경우 검증
    const newTotalQuantity = data.total_quantity !== undefined ? data.total_quantity : existing.total_quantity;
    const purchaseOrderId = data.purchase_order_id !== undefined ? data.purchase_order_id : existing.purchase_order_id;
    
    // 검증이 필요한 경우: 수량이 변경되었거나, 발주 ID가 변경되었거나, 새로 발주가 연결된 경우
    const quantityChanged = data.total_quantity !== undefined && data.total_quantity !== existing.total_quantity;
    const purchaseOrderChanged = data.purchase_order_id !== undefined && data.purchase_order_id !== existing.purchase_order_id;
    const purchaseOrderNewlySet = !existing.purchase_order_id && purchaseOrderId;

    if (purchaseOrderId && (quantityChanged || purchaseOrderChanged || purchaseOrderNewlySet)) {
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 발주 정보 조회 (FOR UPDATE)
        const purchaseOrder = await this.repository.findPurchaseOrderForUpdate(purchaseOrderId, connection);
        if (!purchaseOrder) {
          await connection.rollback();
          throw new Error('발주를 찾을 수 없습니다.');
        }

        // 현재까지 출고된 총 수량 계산 (현재 아이템 제외)
        const totalShipped = await this.repository.getTotalShippedQuantityByPurchaseOrder(
          purchaseOrderId,
          connection,
          id // 현재 수정 중인 아이템 제외
        );

        // 새로운 출고 수량을 포함한 총 수량 계산
        const newTotalShipped = totalShipped + newTotalQuantity;

        // 발주 수량 초과 체크 (초과는 허용하되 경고는 없음 - 사용자 요구사항에 따라)
        // 현재는 초과도 허용하므로 검증만 수행하고 저장

        // 아이템 수정
        const item = await this.repository.updateItemWithConnection(id, data, connection);

        await connection.commit();
        return item;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    // 수량이 변경되지 않거나 발주가 연결되지 않은 경우 기존 로직 사용
    return this.repository.updateItem(id, data);
  }

  /**
   * 패킹리스트 아이템 삭제
   */
  async deleteItem(id: number): Promise<void> {
    const existing = await this.repository.findItemById(id);
    if (!existing) {
      throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
    }

    await this.repository.deleteItem(id);
  }

  /**
   * 내륙송장 생성
   */
  async createDomesticInvoice(data: CreateDomesticInvoiceDTO): Promise<DomesticInvoice> {
    // 패킹리스트 존재 확인
    const packingList = await this.repository.findById(data.packing_list_id);
    if (!packingList) {
      throw new Error('패킹리스트를 찾을 수 없습니다.');
    }

    return this.repository.createDomesticInvoice(data);
  }

  /**
   * 내륙송장 수정
   */
  async updateDomesticInvoice(id: number, data: UpdateDomesticInvoiceDTO): Promise<DomesticInvoice> {
    return this.repository.updateDomesticInvoice(id, data);
  }

  /**
   * 내륙송장 삭제
   */
  async deleteDomesticInvoice(id: number): Promise<void> {
    await this.repository.deleteDomesticInvoice(id);
  }

  /**
   * 송장 이미지 생성
   */
  async createInvoiceImage(
    invoiceId: number,
    imageUrl: string,
    displayOrder: number
  ): Promise<DomesticInvoiceImage> {
    return this.repository.createInvoiceImage(invoiceId, imageUrl, displayOrder);
  }

  /**
   * 송장 이미지 조회 (송장 ID로)
   */
  async getInvoiceImagesByInvoiceId(invoiceId: number): Promise<DomesticInvoiceImage[]> {
    return this.repository.findInvoiceImagesByInvoiceId(invoiceId);
  }

  /**
   * 송장 이미지 삭제 (이미지 URL 반환)
   */
  async deleteInvoiceImage(id: number): Promise<string | null> {
    return this.repository.deleteInvoiceImage(id);
  }

  /**
   * 한국도착일 생성
   */
  async createKoreaArrival(data: CreateKoreaArrivalDTO): Promise<KoreaArrival> {
    // 아이템 존재 확인
    const item = await this.repository.findItemById(data.packing_list_item_id);
    if (!item) {
      throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
    }

    return this.repository.createKoreaArrival(data);
  }

  /**
   * 한국도착일 수정
   */
  async updateKoreaArrival(id: number, data: UpdateKoreaArrivalDTO): Promise<KoreaArrival> {
    const existing = await this.repository.findKoreaArrivalById(id);
    if (!existing) {
      throw new Error('한국도착일을 찾을 수 없습니다.');
    }

    return this.repository.updateKoreaArrival(id, data);
  }

  /**
   * 한국도착일 삭제
   */
  async deleteKoreaArrival(id: number): Promise<void> {
    await this.repository.deleteKoreaArrival(id);
  }

  /**
   * 발주별 배송비 집계 조회
   */
  async getShippingCostByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderShippingCost | null> {
    return this.repository.getShippingCostByPurchaseOrder(purchaseOrderId);
  }

  /**
   * 발주별 배송 수량 집계 조회
   */
  async getShippingSummaryByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderShippingSummary | null> {
    return this.repository.getShippingSummaryByPurchaseOrder(purchaseOrderId);
  }
}

