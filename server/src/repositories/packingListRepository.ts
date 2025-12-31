import { pool } from '../config/database.js';
import type { PoolConnection } from 'mysql2/promise';
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
  PackingListItemWithDetails,
  DomesticInvoiceWithImages,
  PurchaseOrderShippingCost,
  PurchaseOrderShippingSummary,
} from '../models/packingList.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface PackingListRow extends RowDataPacket {
  id: number;
  code: string;
  shipment_date: Date;
  logistics_company: string | null;
  warehouse_arrival_date: Date | null;
  actual_weight: number | null;
  weight_ratio: number | null;
  calculated_weight: number | null;
  shipping_cost: number;
  payment_date: Date | null;
  wk_payment_date: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface PackingListItemRow extends RowDataPacket {
  id: number;
  packing_list_id: number;
  purchase_order_id: string | null;
  product_name: string;
  product_image_url: string | null;
  entry_quantity: string | null;
  box_count: number;
  unit: string;
  total_quantity: number;
  created_at: Date;
  updated_at: Date;
}

interface DomesticInvoiceRow extends RowDataPacket {
  id: number;
  packing_list_id: number;
  invoice_number: string;
  created_at: Date;
  updated_at: Date;
}

interface DomesticInvoiceImageRow extends RowDataPacket {
  id: number;
  domestic_invoice_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

interface KoreaArrivalRow extends RowDataPacket {
  id: number;
  packing_list_item_id: number;
  arrival_date: Date;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export class PackingListRepository {
  /**
   * 모든 패킹리스트 조회
   */
  async findAll(): Promise<PackingList[]> {
    const [rows] = await pool.execute<PackingListRow[]>(
      `SELECT id, code, shipment_date, logistics_company, warehouse_arrival_date,
              actual_weight, weight_ratio, calculated_weight, shipping_cost,
              payment_date, wk_payment_date, created_at, updated_at, created_by, updated_by
       FROM packing_lists
       ORDER BY shipment_date DESC, created_at DESC`
    );

    return rows.map(this.mapRowToPackingList);
  }

  /**
   * ID로 패킹리스트 조회
   */
  async findById(id: number): Promise<PackingList | null> {
    const [rows] = await pool.execute<PackingListRow[]>(
      `SELECT id, code, shipment_date, logistics_company, warehouse_arrival_date,
              actual_weight, weight_ratio, calculated_weight, shipping_cost,
              payment_date, wk_payment_date, created_at, updated_at, created_by, updated_by
       FROM packing_lists
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPackingList(rows[0]);
  }

  /**
   * 코드로 패킹리스트 조회
   */
  async findByCode(code: string): Promise<PackingList | null> {
    const [rows] = await pool.execute<PackingListRow[]>(
      `SELECT id, code, shipment_date, logistics_company, warehouse_arrival_date,
              actual_weight, weight_ratio, calculated_weight, shipping_cost,
              payment_date, wk_payment_date, created_at, updated_at, created_by, updated_by
       FROM packing_lists
       WHERE code = ?
       ORDER BY shipment_date DESC, created_at DESC
       LIMIT 1`,
      [code]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPackingList(rows[0]);
  }

  /**
   * 코드와 날짜로 패킹리스트 조회 (중복 체크용)
   */
  async findByCodeAndDate(code: string, shipmentDate: string): Promise<PackingList | null> {
    const [rows] = await pool.execute<PackingListRow[]>(
      `SELECT id, code, shipment_date, logistics_company, warehouse_arrival_date,
              actual_weight, weight_ratio, calculated_weight, shipping_cost,
              payment_date, wk_payment_date, created_at, updated_at, created_by, updated_by
       FROM packing_lists
       WHERE code = ? AND shipment_date = ?`,
      [code, shipmentDate]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPackingList(rows[0]);
  }

  /**
   * 패킹리스트 생성
   */
  async create(data: CreatePackingListDTO): Promise<PackingList> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO packing_lists 
       (code, shipment_date, logistics_company, warehouse_arrival_date,
        actual_weight, weight_ratio, calculated_weight, shipping_cost,
        payment_date, wk_payment_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code,
        typeof data.shipment_date === 'string' ? data.shipment_date.split('T')[0] : data.shipment_date,
        data.logistics_company || null,
        data.warehouse_arrival_date ? (typeof data.warehouse_arrival_date === 'string' ? data.warehouse_arrival_date.split('T')[0] : data.warehouse_arrival_date) : null,
        data.actual_weight || null,
        data.weight_ratio || null,
        data.calculated_weight || null,
        data.shipping_cost || 0,
        data.payment_date ? (typeof data.payment_date === 'string' ? data.payment_date.split('T')[0] : data.payment_date) : null,
        data.wk_payment_date ? (typeof data.wk_payment_date === 'string' ? data.wk_payment_date.split('T')[0] : data.wk_payment_date) : null,
        data.created_by || null,
      ]
    );

    const packingList = await this.findById(result.insertId);
    if (!packingList) {
      throw new Error('패킹리스트 생성에 실패했습니다.');
    }

    return packingList;
  }

  /**
   * 패킹리스트 수정
   */
  async update(id: number, data: UpdatePackingListDTO): Promise<PackingList> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.code !== undefined) {
      updates.push('code = ?');
      values.push(data.code);
    }
    if (data.shipment_date !== undefined) {
      updates.push('shipment_date = ?');
      // 날짜 형식 변환: ISO 8601 형식을 'YYYY-MM-DD' 형식으로 변환
      const shipmentDate = typeof data.shipment_date === 'string' 
        ? data.shipment_date.split('T')[0] 
        : data.shipment_date;
      values.push(shipmentDate);
    }
    if (data.logistics_company !== undefined) {
      updates.push('logistics_company = ?');
      values.push(data.logistics_company || null);
    }
    if (data.warehouse_arrival_date !== undefined) {
      updates.push('warehouse_arrival_date = ?');
      // 날짜 형식 변환: ISO 8601 형식('YYYY-MM-DDTHH:mm:ss.sssZ')을 'YYYY-MM-DD' 형식으로 변환
      let warehouseArrivalDate: string | null = null;
      if (data.warehouse_arrival_date) {
        if (typeof data.warehouse_arrival_date === 'string') {
          // ISO 8601 형식인 경우 날짜 부분만 추출
          warehouseArrivalDate = data.warehouse_arrival_date.split('T')[0];
        } else {
          warehouseArrivalDate = data.warehouse_arrival_date;
        }
      }
      values.push(warehouseArrivalDate);
    }
    if (data.actual_weight !== undefined) {
      updates.push('actual_weight = ?');
      values.push(data.actual_weight || null);
    }
    if (data.weight_ratio !== undefined) {
      updates.push('weight_ratio = ?');
      // null을 명시적으로 허용 (비율을 선택 해제할 경우)
      // weight_ratio는 0이 유효한 값일 수 있으므로 null 체크를 명시적으로 수행
      const weightRatioValue = data.weight_ratio === null ? null : data.weight_ratio;
      console.log('[비율 저장 - 서버] weight_ratio 업데이트:', weightRatioValue, 'packingListId:', id);
      values.push(weightRatioValue);
    }
    if (data.calculated_weight !== undefined) {
      updates.push('calculated_weight = ?');
      values.push(data.calculated_weight || null);
    }
    if (data.shipping_cost !== undefined) {
      updates.push('shipping_cost = ?');
      values.push(data.shipping_cost);
    }
    if (data.payment_date !== undefined) {
      updates.push('payment_date = ?');
      // 날짜 형식 변환: ISO 8601 형식을 'YYYY-MM-DD' 형식으로 변환
      let paymentDate: string | null = null;
      if (data.payment_date) {
        if (typeof data.payment_date === 'string') {
          paymentDate = data.payment_date.split('T')[0];
        } else {
          paymentDate = data.payment_date;
        }
      }
      values.push(paymentDate);
    }
    if (data.wk_payment_date !== undefined) {
      updates.push('wk_payment_date = ?');
      // 날짜 형식 변환: ISO 8601 형식을 'YYYY-MM-DD' 형식으로 변환
      let wkPaymentDate: string | null = null;
      if (data.wk_payment_date) {
        if (typeof data.wk_payment_date === 'string') {
          wkPaymentDate = data.wk_payment_date.split('T')[0];
        } else {
          wkPaymentDate = data.wk_payment_date;
        }
      }
      values.push(wkPaymentDate);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by || null);
    }

    if (updates.length === 0) {
      const packingList = await this.findById(id);
      if (!packingList) {
        throw new Error('패킹리스트를 찾을 수 없습니다.');
      }
      return packingList;
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE packing_lists SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log('[비율 저장 - 서버] DB 업데이트 완료, packingListId:', id);

    const packingList = await this.findById(id);
    if (!packingList) {
      throw new Error('패킹리스트를 찾을 수 없습니다.');
    }

    console.log('[비율 저장 - 서버] 조회된 packingList.weight_ratio:', packingList.weight_ratio);

    return packingList;
  }

  /**
   * 패킹리스트 삭제
   */
  async delete(id: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM packing_lists WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('패킹리스트를 찾을 수 없습니다.');
    }
  }

  /**
   * 패킹리스트 아이템 조회 (패킹리스트 ID로)
   */
  async findItemsByPackingListId(packingListId: number): Promise<PackingListItem[]> {
    const [rows] = await pool.execute<PackingListItemRow[]>(
      `SELECT id, packing_list_id, purchase_order_id, product_name, product_image_url,
              entry_quantity, box_count, unit, total_quantity, created_at, updated_at
       FROM packing_list_items
       WHERE packing_list_id = ?
       ORDER BY id`,
      [packingListId]
    );

    return rows.map(this.mapRowToPackingListItem);
  }

  /**
   * 패킹리스트 아이템 ID로 조회
   */
  async findItemById(id: number): Promise<PackingListItem | null> {
    const [rows] = await pool.execute<PackingListItemRow[]>(
      `SELECT id, packing_list_id, purchase_order_id, product_name, product_image_url,
              entry_quantity, box_count, unit, total_quantity, created_at, updated_at
       FROM packing_list_items
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPackingListItem(rows[0]);
  }

  /**
   * 발주 조회 (FOR UPDATE - 동시성 제어용)
   */
  async findPurchaseOrderForUpdate(purchaseOrderId: string, connection: PoolConnection): Promise<{ id: string; quantity: number } | null> {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, quantity 
       FROM purchase_orders 
       WHERE id = ? 
       FOR UPDATE`,
      [purchaseOrderId]
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      id: rows[0].id,
      quantity: rows[0].quantity,
    };
  }

  /**
   * 발주별 총 출고 수량 계산 (트랜잭션 내에서 실행)
   */
  async getTotalShippedQuantityByPurchaseOrder(purchaseOrderId: string, connection: PoolConnection, excludeItemId?: number): Promise<number> {
    let query = `
      SELECT COALESCE(SUM(total_quantity), 0) AS total_shipped
      FROM packing_list_items
      WHERE purchase_order_id = ?
    `;
    const params: any[] = [purchaseOrderId];

    if (excludeItemId) {
      query += ' AND id != ?';
      params.push(excludeItemId);
    }

    const [rows] = await connection.execute<RowDataPacket[]>(query, params);

    return rows.length > 0 ? (rows[0].total_shipped as number) : 0;
  }

  /**
   * 패킹리스트 아이템 생성 (트랜잭션 내에서 실행)
   */
  async createItemWithConnection(data: CreatePackingListItemDTO, connection: PoolConnection): Promise<PackingListItem> {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO packing_list_items 
       (packing_list_id, purchase_order_id, product_name, product_image_url,
        entry_quantity, box_count, unit, total_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.packing_list_id,
        data.purchase_order_id || null,
        data.product_name,
        data.product_image_url || null,
        data.entry_quantity || null,
        data.box_count,
        data.unit,
        data.total_quantity,
      ]
    );

    // 생성된 아이템 조회
    const [rows] = await connection.execute<PackingListItemRow[]>(
      `SELECT id, packing_list_id, purchase_order_id, product_name, product_image_url,
              entry_quantity, box_count, unit, total_quantity, created_at, updated_at
       FROM packing_list_items
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('패킹리스트 아이템 생성에 실패했습니다.');
    }

    return this.mapRowToPackingListItem(rows[0]);
  }

  /**
   * 공장 출고 항목 생성 (트랜잭션 내에서 실행)
   * 공장→물류창고일 경우 패킹리스트 아이템 생성 시 자동으로 factory_shipments에 출고 항목 생성
   */
  async createFactoryShipmentWithConnection(
    purchaseOrderId: string,
    shipmentDate: string,
    quantity: number,
    receiveDate: string,
    packingListCode: string,
    connection: PoolConnection
  ): Promise<void> {
    // display_order를 위해 현재 최대값 조회
    const [orderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
       FROM factory_shipments
       WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    );
    const displayOrder = orderRows[0]?.next_order || 0;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO factory_shipments 
       (purchase_order_id, shipment_date, quantity, tracking_number, receive_date, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        purchaseOrderId,
        shipmentDate,
        quantity,
        packingListCode, // 패킹리스트 코드를 tracking_number로 사용
        receiveDate,
        displayOrder,
      ]
    );
  }

  /**
   * 패킹리스트 아이템 생성 (기존 메서드 - 호환성 유지)
   */
  async createItem(data: CreatePackingListItemDTO): Promise<PackingListItem> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO packing_list_items 
       (packing_list_id, purchase_order_id, product_name, product_image_url,
        entry_quantity, box_count, unit, total_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.packing_list_id,
        data.purchase_order_id || null,
        data.product_name,
        data.product_image_url || null,
        data.entry_quantity || null,
        data.box_count,
        data.unit,
        data.total_quantity,
      ]
    );

    const item = await this.findItemById(result.insertId);
    if (!item) {
      throw new Error('패킹리스트 아이템 생성에 실패했습니다.');
    }

    return item;
  }

  /**
   * 패킹리스트 아이템 수정 (트랜잭션 내에서 실행)
   */
  async updateItemWithConnection(id: number, data: UpdatePackingListItemDTO, connection: PoolConnection): Promise<PackingListItem> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.purchase_order_id !== undefined) {
      updates.push('purchase_order_id = ?');
      values.push(data.purchase_order_id || null);
    }
    if (data.product_name !== undefined) {
      updates.push('product_name = ?');
      values.push(data.product_name);
    }
    if (data.product_image_url !== undefined) {
      updates.push('product_image_url = ?');
      values.push(data.product_image_url || null);
    }
    if (data.entry_quantity !== undefined) {
      updates.push('entry_quantity = ?');
      values.push(data.entry_quantity || null);
    }
    if (data.box_count !== undefined) {
      updates.push('box_count = ?');
      values.push(data.box_count);
    }
    if (data.unit !== undefined) {
      updates.push('unit = ?');
      values.push(data.unit);
    }
    if (data.total_quantity !== undefined) {
      updates.push('total_quantity = ?');
      values.push(data.total_quantity);
    }

    if (updates.length === 0) {
      const [rows] = await connection.execute<PackingListItemRow[]>(
        `SELECT id, packing_list_id, purchase_order_id, product_name, product_image_url,
                entry_quantity, box_count, unit, total_quantity, created_at, updated_at
         FROM packing_list_items
         WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
      }

      return this.mapRowToPackingListItem(rows[0]);
    }

    values.push(id);

    await connection.execute<ResultSetHeader>(
      `UPDATE packing_list_items SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await connection.execute<PackingListItemRow[]>(
      `SELECT id, packing_list_id, purchase_order_id, product_name, product_image_url,
              entry_quantity, box_count, unit, total_quantity, created_at, updated_at
       FROM packing_list_items
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      throw new Error('패킹리스트 아이템 수정 후 조회에 실패했습니다.');
    }

    return this.mapRowToPackingListItem(rows[0]);
  }

  /**
   * 패킹리스트 아이템 수정
   */
  async updateItem(id: number, data: UpdatePackingListItemDTO): Promise<PackingListItem> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.purchase_order_id !== undefined) {
      updates.push('purchase_order_id = ?');
      values.push(data.purchase_order_id || null);
    }
    if (data.product_name !== undefined) {
      updates.push('product_name = ?');
      values.push(data.product_name);
    }
    if (data.product_image_url !== undefined) {
      updates.push('product_image_url = ?');
      values.push(data.product_image_url || null);
    }
    if (data.entry_quantity !== undefined) {
      updates.push('entry_quantity = ?');
      values.push(data.entry_quantity || null);
    }
    if (data.box_count !== undefined) {
      updates.push('box_count = ?');
      values.push(data.box_count);
    }
    if (data.unit !== undefined) {
      updates.push('unit = ?');
      values.push(data.unit);
    }
    if (data.total_quantity !== undefined) {
      updates.push('total_quantity = ?');
      values.push(data.total_quantity);
    }

    if (updates.length === 0) {
      const item = await this.findItemById(id);
      if (!item) {
        throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
      }
      return item;
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE packing_list_items SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const item = await this.findItemById(id);
    if (!item) {
      throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
    }

    return item;
  }

  /**
   * 패킹리스트 아이템 삭제
   */
  async deleteItem(id: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM packing_list_items WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('패킹리스트 아이템을 찾을 수 없습니다.');
    }
  }

  /**
   * 패킹리스트와 아이템 함께 조회
   */
  async findWithItems(id: number): Promise<PackingListWithItems | null> {
    const packingList = await this.findById(id);
    if (!packingList) {
      return null;
    }

    // 내륙송장은 패킹리스트 레벨이므로 한 번만 조회
    const invoices = await this.findDomesticInvoicesByPackingListId(id);
    const invoicesWithImages = await Promise.all(
      invoices.map(async (invoice) => {
        const images = await this.findInvoiceImagesByInvoiceId(invoice.id);
        return { ...invoice, images };
      })
    );

    const items = await this.findItemsByPackingListId(id);
    const itemsWithDetails: PackingListItemWithDetails[] = await Promise.all(
      items.map(async (item) => {
        // 한국도착일은 아이템별로 조회
        const koreaArrivals = await this.findKoreaArrivalsByItemId(item.id);
        return {
          ...item,
          // 내륙송장은 모든 아이템에 동일하게 포함 (UI에서 표시용)
          domestic_invoices: invoicesWithImages,
          korea_arrivals: koreaArrivals,
        };
      })
    );

    return {
      ...packingList,
      items: itemsWithDetails,
    };
  }

  /**
   * 내륙송장 조회 (패킹리스트 ID로)
   */
  async findDomesticInvoicesByPackingListId(packingListId: number): Promise<DomesticInvoice[]> {
    const [rows] = await pool.execute<DomesticInvoiceRow[]>(
      `SELECT id, packing_list_id, invoice_number, created_at, updated_at
       FROM packing_list_domestic_invoices
       WHERE packing_list_id = ?
       ORDER BY id`,
      [packingListId]
    );

    return rows.map(this.mapRowToDomesticInvoice);
  }

  /**
   * 내륙송장 생성
   */
  async createDomesticInvoice(data: CreateDomesticInvoiceDTO): Promise<DomesticInvoice> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO packing_list_domestic_invoices (packing_list_id, invoice_number)
       VALUES (?, ?)`,
      [data.packing_list_id, data.invoice_number]
    );

    const [rows] = await pool.execute<DomesticInvoiceRow[]>(
      `SELECT id, packing_list_id, invoice_number, created_at, updated_at
       FROM packing_list_domestic_invoices
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('내륙송장 생성에 실패했습니다.');
    }

    return this.mapRowToDomesticInvoice(rows[0]);
  }

  /**
   * 내륙송장 수정
   */
  async updateDomesticInvoice(id: number, data: UpdateDomesticInvoiceDTO): Promise<DomesticInvoice> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.invoice_number !== undefined) {
      updates.push('invoice_number = ?');
      values.push(data.invoice_number);
    }

    if (updates.length === 0) {
      // 수정할 항목이 없으면 조회만 반환
      const invoice = await this.findDomesticInvoiceById(id);
      if (!invoice) {
        throw new Error('내륙송장을 찾을 수 없습니다.');
      }
      return invoice;
    }

    values.push(id);
    await pool.execute<ResultSetHeader>(
      `UPDATE packing_list_domestic_invoices 
       SET ${updates.join(', ')} 
       WHERE id = ?`,
      values
    );

    const invoice = await this.findDomesticInvoiceById(id);
    if (!invoice) {
      throw new Error('내륙송장 수정 후 조회에 실패했습니다.');
    }

    return invoice;
  }

  /**
   * 내륙송장 조회 (ID로)
   */
  async findDomesticInvoiceById(id: number): Promise<DomesticInvoice | null> {
    const [rows] = await pool.execute<DomesticInvoiceRow[]>(
      `SELECT id, packing_list_id, invoice_number, created_at, updated_at
       FROM packing_list_domestic_invoices
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToDomesticInvoice(rows[0]);
  }

  /**
   * 내륙송장 삭제
   */
  async deleteDomesticInvoice(id: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM packing_list_domestic_invoices WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('내륙송장을 찾을 수 없습니다.');
    }
  }

  /**
   * 송장 이미지 조회 (송장 ID로)
   */
  async findInvoiceImagesByInvoiceId(invoiceId: number): Promise<DomesticInvoiceImage[]> {
    const [rows] = await pool.execute<DomesticInvoiceImageRow[]>(
      `SELECT id, domestic_invoice_id, image_url, display_order, created_at
       FROM packing_list_domestic_invoice_images
       WHERE domestic_invoice_id = ?
       ORDER BY display_order, id`,
      [invoiceId]
    );

    return rows.map(this.mapRowToDomesticInvoiceImage);
  }

  /**
   * 송장 이미지 생성
   */
  async createInvoiceImage(invoiceId: number, imageUrl: string, displayOrder: number): Promise<DomesticInvoiceImage> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO packing_list_domestic_invoice_images 
       (domestic_invoice_id, image_url, display_order)
       VALUES (?, ?, ?)`,
      [invoiceId, imageUrl, displayOrder]
    );

    const [rows] = await pool.execute<DomesticInvoiceImageRow[]>(
      `SELECT id, domestic_invoice_id, image_url, display_order, created_at
       FROM packing_list_domestic_invoice_images
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('송장 이미지 생성에 실패했습니다.');
    }

    return this.mapRowToDomesticInvoiceImage(rows[0]);
  }

  /**
   * 송장 이미지 ID로 조회
   */
  async findInvoiceImageById(id: number): Promise<DomesticInvoiceImage | null> {
    const [rows] = await pool.execute<DomesticInvoiceImageRow[]>(
      `SELECT id, domestic_invoice_id, image_url, display_order, created_at
       FROM packing_list_domestic_invoice_images
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToDomesticInvoiceImage(rows[0]);
  }

  /**
   * 송장 이미지 삭제 (이미지 URL 반환)
   */
  async deleteInvoiceImage(id: number): Promise<string | null> {
    // 삭제 전에 이미지 URL 가져오기
    const image = await this.findInvoiceImageById(id);
    if (!image) {
      throw new Error('송장 이미지를 찾을 수 없습니다.');
    }

    const imageUrl = image.image_url;

    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM packing_list_domestic_invoice_images WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('송장 이미지를 찾을 수 없습니다.');
    }

    return imageUrl;
  }

  /**
   * 한국도착일 조회 (아이템 ID로)
   */
  async findKoreaArrivalsByItemId(itemId: number): Promise<KoreaArrival[]> {
    const [rows] = await pool.execute<KoreaArrivalRow[]>(
      `SELECT id, packing_list_item_id, arrival_date, quantity, created_at, updated_at
       FROM packing_list_korea_arrivals
       WHERE packing_list_item_id = ?
       ORDER BY arrival_date, id`,
      [itemId]
    );

    return rows.map(this.mapRowToKoreaArrival);
  }

  /**
   * 한국도착일 생성
   */
  async createKoreaArrival(data: CreateKoreaArrivalDTO): Promise<KoreaArrival> {
    // 날짜 형식 변환: ISO 8601 형식('YYYY-MM-DDTHH:mm:ss.sssZ')을 'YYYY-MM-DD' 형식으로 변환
    const arrivalDate = typeof data.arrival_date === 'string' 
      ? data.arrival_date.split('T')[0] 
      : data.arrival_date;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO packing_list_korea_arrivals (packing_list_item_id, arrival_date, quantity)
       VALUES (?, ?, ?)`,
      [data.packing_list_item_id, arrivalDate, data.quantity]
    );

    const [rows] = await pool.execute<KoreaArrivalRow[]>(
      `SELECT id, packing_list_item_id, arrival_date, quantity, created_at, updated_at
       FROM packing_list_korea_arrivals
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('한국도착일 생성에 실패했습니다.');
    }

    return this.mapRowToKoreaArrival(rows[0]);
  }

  /**
   * 한국도착일 수정
   */
  async updateKoreaArrival(id: number, data: UpdateKoreaArrivalDTO): Promise<KoreaArrival> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.arrival_date !== undefined) {
      updates.push('arrival_date = ?');
      // 날짜 형식 변환: ISO 8601 형식('YYYY-MM-DDTHH:mm:ss.sssZ')을 'YYYY-MM-DD' 형식으로 변환
      const arrivalDate = typeof data.arrival_date === 'string' 
        ? data.arrival_date.split('T')[0] 
        : data.arrival_date;
      values.push(arrivalDate);
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(data.quantity);
    }

    if (updates.length === 0) {
      const arrival = await this.findKoreaArrivalById(id);
      if (!arrival) {
        throw new Error('한국도착일을 찾을 수 없습니다.');
      }
      return arrival;
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE packing_list_korea_arrivals SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const arrival = await this.findKoreaArrivalById(id);
    if (!arrival) {
      throw new Error('한국도착일을 찾을 수 없습니다.');
    }

    return arrival;
  }

  /**
   * 한국도착일 ID로 조회
   */
  async findKoreaArrivalById(id: number): Promise<KoreaArrival | null> {
    const [rows] = await pool.execute<KoreaArrivalRow[]>(
      `SELECT id, packing_list_item_id, arrival_date, quantity, created_at, updated_at
       FROM packing_list_korea_arrivals
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToKoreaArrival(rows[0]);
  }

  /**
   * 한국도착일 삭제
   */
  async deleteKoreaArrival(id: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM packing_list_korea_arrivals WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('한국도착일을 찾을 수 없습니다.');
    }
  }

  /**
   * 발주별 배송비 집계 조회
   */
  async getShippingCostByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderShippingCost | null> {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT purchase_order_id, ordered_quantity, total_shipping_cost, 
                total_shipped_quantity, unit_shipping_cost
         FROM v_purchase_order_packing_shipping_cost
         WHERE purchase_order_id = ?`,
        [purchaseOrderId]
      );

      if (rows.length === 0) {
        return null;
      }

      return rows[0] as PurchaseOrderShippingCost;
    } catch (error: any) {
      console.error(`[getShippingCostByPurchaseOrder] 오류 발생, purchaseOrderId: ${purchaseOrderId}`, error);
      console.error(`[getShippingCostByPurchaseOrder] 오류 메시지:`, error.message);
      console.error(`[getShippingCostByPurchaseOrder] 오류 코드:`, error.code);
      throw error;
    }
  }

  /**
   * 발주별 배송 수량 집계 조회
   */
  async getShippingSummaryByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderShippingSummary | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT purchase_order_id, ordered_quantity, shipped_quantity, arrived_quantity,
              unshipped_quantity, shipping_quantity
       FROM v_purchase_order_shipping_summary
       WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as PurchaseOrderShippingSummary;
  }

  // 매핑 함수들
  private mapRowToPackingList(row: PackingListRow): PackingList {
    console.log('[비율 로드 - 서버] mapRowToPackingList, row.weight_ratio:', row.weight_ratio, 'packingListId:', row.id);
    return {
      id: row.id,
      code: row.code,
      shipment_date: row.shipment_date,
      logistics_company: row.logistics_company,
      warehouse_arrival_date: row.warehouse_arrival_date,
      actual_weight: row.actual_weight,
      weight_ratio: row.weight_ratio,
      calculated_weight: row.calculated_weight,
      shipping_cost: row.shipping_cost,
      payment_date: row.payment_date,
      wk_payment_date: row.wk_payment_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  private mapRowToPackingListItem(row: PackingListItemRow): PackingListItem {
    return {
      id: row.id,
      packing_list_id: row.packing_list_id,
      purchase_order_id: row.purchase_order_id,
      product_name: row.product_name,
      product_image_url: row.product_image_url,
      entry_quantity: row.entry_quantity,
      box_count: row.box_count,
      unit: row.unit as '박스' | '마대',
      total_quantity: row.total_quantity,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapRowToDomesticInvoice(row: DomesticInvoiceRow): DomesticInvoice {
    return {
      id: row.id,
      packing_list_id: row.packing_list_id,
      invoice_number: row.invoice_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapRowToDomesticInvoiceImage(row: DomesticInvoiceImageRow): DomesticInvoiceImage {
    return {
      id: row.id,
      domestic_invoice_id: row.domestic_invoice_id,
      image_url: row.image_url,
      display_order: row.display_order,
      created_at: row.created_at,
    };
  }

  private mapRowToKoreaArrival(row: KoreaArrivalRow): KoreaArrival {
    return {
      id: row.id,
      packing_list_item_id: row.packing_list_item_id,
      arrival_date: row.arrival_date,
      quantity: row.quantity,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

