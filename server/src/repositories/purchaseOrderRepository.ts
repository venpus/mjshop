import { pool } from '../config/database.js';
import { PurchaseOrder, CreatePurchaseOrderDTO, UpdatePurchaseOrderDTO } from '../models/purchaseOrder.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface PurchaseOrderRow extends RowDataPacket {
  id: string;
  po_number: string;
  supplier_id: number;
  product_id: string;
  unit_price: number;
  back_margin: number | null;
  order_unit_price: number | null;
  expected_final_unit_price: number | null;
  quantity: number;
  size: string | null;
  weight: string | null;
  packaging: number | null;
  delivery_status: string;
  payment_status: string;
  is_confirmed: boolean;
  order_status: string;
  order_date: Date | null;
  estimated_delivery: Date | null;
  estimated_shipment_date: Date | null;
  work_start_date: Date | null;
  work_end_date: Date | null;
  shipping_cost: number;
  warehouse_shipping_cost: number;
  commission_rate: number;
  commission_type: string | null;
  advance_payment_rate: number;
  advance_payment_amount: number | null;
  advance_payment_date: Date | null;
  balance_payment_amount: number | null;
  balance_payment_date: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export class PurchaseOrderRepository {
  /**
   * 모든 발주 조회
   */
  async findAll(): Promise<PurchaseOrder[]> {
    const [rows] = await pool.execute<PurchaseOrderRow[]>(
      `SELECT id, po_number, supplier_id, product_id, unit_price, back_margin,
              order_unit_price, expected_final_unit_price, quantity, size, weight, packaging,
              delivery_status, payment_status, is_confirmed, order_status,
              order_date, estimated_delivery, estimated_shipment_date,
              work_start_date, work_end_date,
              shipping_cost, warehouse_shipping_cost, commission_rate, commission_type,
              advance_payment_rate, advance_payment_amount, advance_payment_date,
              balance_payment_amount, balance_payment_date,
              created_at, updated_at, created_by, updated_by
       FROM purchase_orders
       ORDER BY created_at DESC`
    );

    return rows.map(this.mapRowToPurchaseOrder);
  }

  /**
   * ID로 발주 조회
   */
  async findById(id: string): Promise<PurchaseOrder | null> {
    const [rows] = await pool.execute<PurchaseOrderRow[]>(
      `SELECT id, po_number, supplier_id, product_id, unit_price, back_margin,
              order_unit_price, expected_final_unit_price, quantity, size, weight, packaging,
              delivery_status, payment_status, is_confirmed, order_status,
              order_date, estimated_delivery, estimated_shipment_date,
              work_start_date, work_end_date,
              shipping_cost, warehouse_shipping_cost, commission_rate, commission_type,
              advance_payment_rate, advance_payment_amount, advance_payment_date,
              balance_payment_amount, balance_payment_date,
              created_at, updated_at, created_by, updated_by
       FROM purchase_orders
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPurchaseOrder(rows[0]);
  }

  /**
   * 발주 생성
   */
  async create(data: CreatePurchaseOrderDTO, poId: string, poNumber: string): Promise<PurchaseOrder> {
    const {
      product_id,
      supplier_id,
      unit_price,
      order_unit_price,
      quantity,
      size,
      weight,
      packaging,
      order_date,
      estimated_shipment_date,
      created_by,
    } = data;

    await pool.execute<ResultSetHeader>(
      `INSERT INTO purchase_orders
       (id, po_number, supplier_id, product_id, unit_price, order_unit_price, quantity,
        size, weight, packaging, order_date, estimated_shipment_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poId,
        poNumber,
        supplier_id!,
        product_id,
        unit_price,
        order_unit_price || null,
        quantity,
        size || null,
        weight || null,
        packaging || null,
        order_date || null,
        estimated_shipment_date || null,
        created_by || null,
      ]
    );

    const purchaseOrder = await this.findById(poId);
    if (!purchaseOrder) {
      throw new Error('발주 생성 후 조회에 실패했습니다.');
    }

    return purchaseOrder;
  }

  /**
   * 발주 수정
   */
  async update(id: string, data: UpdatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const updates: string[] = [];
    const values: any[] = [];

    // is_confirmed 변경 시 order_status 자동 동기화 (취소됨이 아닐 때만)
    if (data.is_confirmed !== undefined && data.order_status === undefined) {
      // 기존 발주 정보 조회
      const existingOrder = await this.findById(id);
      if (existingOrder && existingOrder.order_status !== '취소됨') {
        // order_status를 is_confirmed 값에 따라 자동 설정
        data.order_status = data.is_confirmed ? '발주확인' : '발주 대기';
      }
    }

    if (data.unit_price !== undefined) {
      updates.push('unit_price = ?');
      values.push(data.unit_price);
    }
    if (data.back_margin !== undefined) {
      updates.push('back_margin = ?');
      values.push(data.back_margin || null);
    }
    if (data.order_unit_price !== undefined) {
      updates.push('order_unit_price = ?');
      values.push(data.order_unit_price || null);
    }
    if (data.expected_final_unit_price !== undefined) {
      updates.push('expected_final_unit_price = ?');
      values.push(data.expected_final_unit_price || null);
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(data.quantity);
    }
    if (data.size !== undefined) {
      updates.push('size = ?');
      values.push(data.size || null);
    }
    if (data.weight !== undefined) {
      updates.push('weight = ?');
      values.push(data.weight || null);
    }
    if (data.packaging !== undefined) {
      updates.push('packaging = ?');
      values.push(data.packaging || null);
    }
    if (data.delivery_status !== undefined) {
      updates.push('delivery_status = ?');
      values.push(data.delivery_status);
    }
    if (data.payment_status !== undefined) {
      updates.push('payment_status = ?');
      values.push(data.payment_status);
    }
    if (data.is_confirmed !== undefined) {
      updates.push('is_confirmed = ?');
      values.push(data.is_confirmed);
    }
    if (data.order_status !== undefined) {
      updates.push('order_status = ?');
      values.push(data.order_status);
    }
    if (data.order_date !== undefined) {
      updates.push('order_date = ?');
      values.push(data.order_date || null);
    }
    if (data.estimated_delivery !== undefined) {
      updates.push('estimated_delivery = ?');
      values.push(data.estimated_delivery || null);
    }
    if (data.estimated_shipment_date !== undefined) {
      updates.push('estimated_shipment_date = ?');
      values.push(data.estimated_shipment_date || null);
    }
    if (data.work_start_date !== undefined) {
      updates.push('work_start_date = ?');
      values.push(data.work_start_date || null);
    }
    if (data.work_end_date !== undefined) {
      updates.push('work_end_date = ?');
      values.push(data.work_end_date || null);
    }
    if (data.shipping_cost !== undefined) {
      updates.push('shipping_cost = ?');
      values.push(data.shipping_cost);
    }
    if (data.warehouse_shipping_cost !== undefined) {
      updates.push('warehouse_shipping_cost = ?');
      values.push(data.warehouse_shipping_cost);
    }
    if (data.commission_rate !== undefined) {
      updates.push('commission_rate = ?');
      values.push(data.commission_rate);
    }
    if (data.commission_type !== undefined) {
      updates.push('commission_type = ?');
      values.push(data.commission_type || null);
    }
    if (data.advance_payment_rate !== undefined) {
      updates.push('advance_payment_rate = ?');
      values.push(data.advance_payment_rate);
    }
    if (data.advance_payment_amount !== undefined) {
      updates.push('advance_payment_amount = ?');
      values.push(data.advance_payment_amount || null);
    }
    if (data.advance_payment_date !== undefined) {
      updates.push('advance_payment_date = ?');
      values.push(data.advance_payment_date || null);
    }
    if (data.balance_payment_amount !== undefined) {
      updates.push('balance_payment_amount = ?');
      values.push(data.balance_payment_amount || null);
    }
    if (data.balance_payment_date !== undefined) {
      updates.push('balance_payment_date = ?');
      values.push(data.balance_payment_date || null);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by || null);
    }

    if (updates.length === 0) {
      const purchaseOrder = await this.findById(id);
      if (!purchaseOrder) {
        throw new Error('발주를 찾을 수 없습니다.');
      }
      return purchaseOrder;
    }

    const query = `UPDATE purchase_orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await pool.execute<ResultSetHeader>(query, [...values, id]);

    const purchaseOrder = await this.findById(id);
    if (!purchaseOrder) {
      throw new Error('발주 수정 후 조회에 실패했습니다.');
    }
    return purchaseOrder;
  }

  /**
   * 발주 삭제
   */
  async delete(id: string): Promise<void> {
    await pool.execute('DELETE FROM purchase_orders WHERE id = ?', [id]);
  }

  /**
   * 다음 발주 ID 생성 (PO001 형식)
   */
  async generateNextId(): Promise<string> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM purchase_orders WHERE id LIKE 'PO%' ORDER BY id DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return 'PO001';
    }

    const lastId = rows[0].id as string;
    const number = parseInt(lastId.substring(2), 10);
    const nextNumber = number + 1;
    return `PO${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * 다음 발주번호 생성 (PO-001 형식)
   */
  async generateNextPoNumber(): Promise<string> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT po_number FROM purchase_orders WHERE po_number LIKE 'PO-%' ORDER BY po_number DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return 'PO-001';
    }

    const lastPoNumber = rows[0].po_number as string;
    const match = lastPoNumber.match(/PO-(\d+)/);
    if (match) {
      const number = parseInt(match[1], 10);
      const nextNumber = number + 1;
      return `PO-${String(nextNumber).padStart(3, '0')}`;
    }

    return 'PO-001';
  }

  /**
   * 공급업체 이름으로 ID 조회
   */
  async findSupplierIdByName(name: string): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM suppliers WHERE name = ? LIMIT 1',
      [name]
    );

    return rows.length > 0 ? (rows[0].id as number) : null;
  }

  /**
   * Row를 PurchaseOrder 객체로 변환
   */
  private mapRowToPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
    return {
      id: row.id,
      po_number: row.po_number,
      supplier_id: row.supplier_id,
      product_id: row.product_id,
      unit_price: Number(row.unit_price),
      back_margin: row.back_margin ? Number(row.back_margin) : null,
      order_unit_price: row.order_unit_price ? Number(row.order_unit_price) : null,
      expected_final_unit_price: row.expected_final_unit_price ? Number(row.expected_final_unit_price) : null,
      quantity: row.quantity,
      size: row.size,
      weight: row.weight,
      packaging: row.packaging,
      delivery_status: row.delivery_status as any,
      payment_status: row.payment_status as any,
      is_confirmed: Boolean(row.is_confirmed),
      order_status: row.order_status as any,
      order_date: row.order_date,
      estimated_delivery: row.estimated_delivery,
      estimated_shipment_date: row.estimated_shipment_date,
      work_start_date: row.work_start_date,
      work_end_date: row.work_end_date,
      shipping_cost: Number(row.shipping_cost),
      warehouse_shipping_cost: Number(row.warehouse_shipping_cost),
      commission_rate: Number(row.commission_rate),
      commission_type: row.commission_type,
      advance_payment_rate: row.advance_payment_rate,
      advance_payment_amount: row.advance_payment_amount ? Number(row.advance_payment_amount) : null,
      advance_payment_date: row.advance_payment_date,
      balance_payment_amount: row.balance_payment_amount ? Number(row.balance_payment_amount) : null,
      balance_payment_date: row.balance_payment_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  /**
   * 발주 비용 항목 조회
   */
  async findCostItemsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; item_type: 'option' | 'labor'; name: string; cost: number; display_order: number }>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, item_type, name, cost, display_order
       FROM po_cost_items
       WHERE purchase_order_id = ?
       ORDER BY display_order ASC, id ASC`,
      [purchaseOrderId]
    );

    return rows.map(row => ({
      id: row.id,
      item_type: row.item_type,
      name: row.name,
      cost: Number(row.cost),
      display_order: row.display_order,
    }));
  }

  /**
   * 발주 비용 항목 저장 (기존 항목 삭제 후 새로 저장)
   */
  async saveCostItems(
    purchaseOrderId: string,
    items: Array<{ item_type: 'option' | 'labor'; name: string; cost: number; display_order?: number }>
  ): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 기존 항목 삭제
      await connection.execute(
        'DELETE FROM po_cost_items WHERE purchase_order_id = ?',
        [purchaseOrderId]
      );

      // 새 항목 저장
      if (items.length > 0) {
        const values = items.map((item, index) => [
          purchaseOrderId,
          item.item_type,
          item.name,
          item.cost,
          item.display_order !== undefined ? item.display_order : index
        ]);

        const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();

        await connection.execute(
          `INSERT INTO po_cost_items (purchase_order_id, item_type, name, cost, display_order)
           VALUES ${placeholders}`,
          flatValues
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 발주 업체 출고 항목 조회
   */
  async findFactoryShipmentsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; shipment_date: Date | null; quantity: number; tracking_number: string | null; receive_date: Date | null; display_order: number }>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, shipment_date, quantity, tracking_number, receive_date, display_order
       FROM factory_shipments
       WHERE purchase_order_id = ?
       ORDER BY display_order ASC, id ASC`,
      [purchaseOrderId]
    );

    return rows.map(row => ({
      id: row.id,
      shipment_date: row.shipment_date,
      quantity: row.quantity,
      tracking_number: row.tracking_number,
      receive_date: row.receive_date,
      display_order: row.display_order,
    }));
  }

  /**
   * 발주 업체 출고 항목 저장 (UPSERT 방식: UPDATE/INSERT/DELETE)
   */
  async saveFactoryShipments(
    purchaseOrderId: string,
    shipments: Array<{ id?: number; shipment_date?: string | null; quantity: number; tracking_number?: string | null; receive_date?: string | null; display_order?: number }>
  ): Promise<number[]> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 기존 항목 ID 조회
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM factory_shipments WHERE purchase_order_id = ?',
        [purchaseOrderId]
      );
      const existingIds = new Set(existingRows.map(row => row.id));
      
      // 클라이언트에서 보낸 ID들 (DB ID만)
      const receivedIds = new Set(shipments.filter(s => s.id !== undefined).map(s => s.id!));

      const resultIds: number[] = [];

      // 각 shipment 처리
      for (const shipment of shipments) {
        if (shipment.id !== undefined && existingIds.has(shipment.id)) {
          // 기존 항목 → UPDATE
          await connection.execute(
            `UPDATE factory_shipments 
             SET shipment_date = ?, quantity = ?, tracking_number = ?, receive_date = ?, display_order = ?
             WHERE id = ? AND purchase_order_id = ?`,
            [
              shipment.shipment_date || null,
              shipment.quantity,
              shipment.tracking_number || null,
              shipment.receive_date || null,
              shipment.display_order !== undefined ? shipment.display_order : 0,
              shipment.id,
              purchaseOrderId
            ]
          );
          resultIds.push(shipment.id);
        } else {
          // 새 항목 → INSERT
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO factory_shipments (purchase_order_id, shipment_date, quantity, tracking_number, receive_date, display_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              purchaseOrderId,
              shipment.shipment_date || null,
              shipment.quantity,
              shipment.tracking_number || null,
              shipment.receive_date || null,
              shipment.display_order !== undefined ? shipment.display_order : 0
            ]
          );
          resultIds.push(result.insertId);
        }
      }

      // 삭제된 항목만 DELETE (클라이언트에서 보내지 않은 기존 항목)
      const idsToDelete = [...existingIds].filter(id => !receivedIds.has(id));
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(', ');
        await connection.execute(
          `DELETE FROM factory_shipments WHERE purchase_order_id = ? AND id IN (${placeholders})`,
          [purchaseOrderId, ...idsToDelete]
        );
        
        // 삭제된 shipment의 이미지도 함께 삭제
        await connection.execute(
          `DELETE FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id IN (${placeholders})`,
          [purchaseOrderId, 'factory_shipment', ...idsToDelete]
        );
      }

      await connection.commit();
      return resultIds;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 발주 반품/교환 항목 조회
   */
  async findReturnExchangesByPoId(purchaseOrderId: string): Promise<Array<{ id: number; return_date: Date | null; quantity: number; tracking_number: string | null; receive_date: Date | null; reason: string | null; display_order: number }>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, return_date, quantity, tracking_number, receive_date, reason, display_order
       FROM return_exchanges
       WHERE purchase_order_id = ?
       ORDER BY display_order ASC, id ASC`,
      [purchaseOrderId]
    );

    return rows.map(row => ({
      id: row.id,
      return_date: row.return_date,
      quantity: row.quantity,
      tracking_number: row.tracking_number,
      receive_date: row.receive_date,
      reason: row.reason,
      display_order: row.display_order,
    }));
  }

  /**
   * 발주 반품/교환 항목 저장 (UPSERT 방식: UPDATE/INSERT/DELETE)
   */
  async saveReturnExchanges(
    purchaseOrderId: string,
    items: Array<{ id?: number; return_date?: string | null; quantity: number; tracking_number?: string | null; receive_date?: string | null; reason?: string | null; display_order?: number }>
  ): Promise<number[]> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 기존 항목 ID 조회
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM return_exchanges WHERE purchase_order_id = ?',
        [purchaseOrderId]
      );
      const existingIds = new Set(existingRows.map(row => row.id));
      
      // 클라이언트에서 보낸 ID들 (DB ID만)
      const receivedIds = new Set(items.filter(item => item.id !== undefined).map(item => item.id!));

      const resultIds: number[] = [];

      // 각 item 처리
      for (const item of items) {
        if (item.id !== undefined && existingIds.has(item.id)) {
          // 기존 항목 → UPDATE
          await connection.execute(
            `UPDATE return_exchanges 
             SET return_date = ?, quantity = ?, tracking_number = ?, receive_date = ?, reason = ?, display_order = ?
             WHERE id = ? AND purchase_order_id = ?`,
            [
              item.return_date || null,
              item.quantity,
              item.tracking_number || null,
              item.receive_date || null,
              item.reason || null,
              item.display_order !== undefined ? item.display_order : 0,
              item.id,
              purchaseOrderId
            ]
          );
          resultIds.push(item.id);
        } else {
          // 새 항목 → INSERT
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO return_exchanges (purchase_order_id, return_date, quantity, tracking_number, receive_date, reason, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              purchaseOrderId,
              item.return_date || null,
              item.quantity,
              item.tracking_number || null,
              item.receive_date || null,
              item.reason || null,
              item.display_order !== undefined ? item.display_order : 0
            ]
          );
          resultIds.push(result.insertId);
        }
      }

      // 삭제된 항목만 DELETE (클라이언트에서 보내지 않은 기존 항목)
      const idsToDelete = [...existingIds].filter(id => !receivedIds.has(id));
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(', ');
        await connection.execute(
          `DELETE FROM return_exchanges WHERE purchase_order_id = ? AND id IN (${placeholders})`,
          [purchaseOrderId, ...idsToDelete]
        );
        
        // 삭제된 return exchange의 이미지도 함께 삭제
        await connection.execute(
          `DELETE FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id IN (${placeholders})`,
          [purchaseOrderId, 'return_exchange', ...idsToDelete]
        );
      }

      await connection.commit();
      return resultIds;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 발주 작업 항목 조회
   */
  async findWorkItemsByPoId(purchaseOrderId: string): Promise<Array<{ id: number; description_ko: string | null; description_zh: string | null; is_completed: boolean; display_order: number }>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, description_ko, description_zh, is_completed, display_order
       FROM work_items
       WHERE purchase_order_id = ?
       ORDER BY display_order ASC, id ASC`,
      [purchaseOrderId]
    );

    return rows.map(row => ({
      id: row.id,
      description_ko: row.description_ko,
      description_zh: row.description_zh,
      is_completed: row.is_completed,
      display_order: row.display_order,
    }));
  }

  /**
   * 발주 작업 항목 저장 (UPSERT 방식: UPDATE/INSERT/DELETE)
   */
  async saveWorkItems(
    purchaseOrderId: string,
    items: Array<{ id?: number; description_ko?: string | null; description_zh?: string | null; is_completed?: boolean; display_order?: number }>
  ): Promise<number[]> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 기존 항목 ID 조회
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM work_items WHERE purchase_order_id = ?',
        [purchaseOrderId]
      );
      const existingIds = new Set(existingRows.map(row => row.id));
      
      // 클라이언트에서 보낸 ID들 (DB ID만)
      const receivedIds = new Set(items.filter(item => item.id !== undefined).map(item => item.id!));

      const resultIds: number[] = [];

      // 각 item 처리
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id !== undefined && existingIds.has(item.id)) {
          // 기존 항목 → UPDATE
          await connection.execute(
            `UPDATE work_items 
             SET description_ko = ?, description_zh = ?, is_completed = ?, display_order = ?
             WHERE id = ? AND purchase_order_id = ?`,
            [
              item.description_ko || null,
              item.description_zh || null,
              item.is_completed !== undefined ? item.is_completed : false,
              item.display_order !== undefined ? item.display_order : i,
              item.id,
              purchaseOrderId
            ]
          );
          resultIds.push(item.id);
        } else {
          // 새 항목 → INSERT
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO work_items (purchase_order_id, description_ko, description_zh, is_completed, display_order)
             VALUES (?, ?, ?, ?, ?)`,
            [
              purchaseOrderId,
              item.description_ko || null,
              item.description_zh || null,
              item.is_completed !== undefined ? item.is_completed : false,
              item.display_order !== undefined ? item.display_order : i
            ]
          );
          resultIds.push(result.insertId);
        }
      }

      // 삭제된 항목만 DELETE (클라이언트에서 보내지 않은 기존 항목)
      const idsToDelete = [...existingIds].filter(id => !receivedIds.has(id));
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(', ');
        await connection.execute(
          `DELETE FROM work_items WHERE purchase_order_id = ? AND id IN (${placeholders})`,
          [purchaseOrderId, ...idsToDelete]
        );
        
        // 삭제된 work item의 이미지도 함께 삭제
        await connection.execute(
          `DELETE FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id IN (${placeholders})`,
          [purchaseOrderId, 'work_item', ...idsToDelete]
        );
      }

      await connection.commit();
      return resultIds;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 발주 배송 세트 조회
   */
  async findDeliverySetsByPoId(purchaseOrderId: string): Promise<Array<{
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
      count: number | null;
      weight: string | null;
      display_order: number;
    }>;
    logistics_info: Array<{
      id: number;
      tracking_number: string | null;
      inland_company_id: number | null;
      inland_company_name: string | null;
      warehouse_id: number | null;
      warehouse_name: string | null;
      display_order: number;
    }>;
  }>> {
    // delivery_sets 조회
    const [setRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, packing_code, packing_date, display_order
       FROM delivery_sets
       WHERE purchase_order_id = ?
       ORDER BY display_order ASC, id ASC`,
      [purchaseOrderId]
    );

    const result = await Promise.all(
      setRows.map(async (setRow) => {
        // package_info 조회
        const [packageRows] = await pool.execute<RowDataPacket[]>(
          `SELECT id, types, pieces, sets, total, method, count, weight, display_order
           FROM package_info
           WHERE delivery_set_id = ?
           ORDER BY display_order ASC, id ASC`,
          [setRow.id]
        );

        // logistics_info 조회 (JOIN으로 name도 함께 조회)
        const [logisticsRows] = await pool.execute<RowDataPacket[]>(
          `SELECT 
            li.id, 
            li.tracking_number, 
            li.inland_company_id, 
            ic.name as inland_company_name,
            li.warehouse_id,
            w.name as warehouse_name,
            li.display_order
           FROM logistics_info li
           LEFT JOIN inland_companies ic ON li.inland_company_id = ic.id
           LEFT JOIN warehouses w ON li.warehouse_id = w.id
           WHERE li.delivery_set_id = ?
           ORDER BY li.display_order ASC, li.id ASC`,
          [setRow.id]
        );

        return {
          id: setRow.id,
          packing_code: setRow.packing_code,
          packing_date: setRow.packing_date,
          display_order: setRow.display_order,
          package_info: packageRows.map(pkg => ({
            id: pkg.id,
            types: pkg.types,
            pieces: pkg.pieces,
            sets: pkg.sets,
            total: pkg.total,
            method: pkg.method,
            count: pkg.count,
            weight: pkg.weight,
            display_order: pkg.display_order,
          })),
          logistics_info: logisticsRows.map(log => ({
            id: log.id,
            tracking_number: log.tracking_number,
            inland_company_id: log.inland_company_id,
            inland_company_name: log.inland_company_name,
            warehouse_id: log.warehouse_id,
            warehouse_name: log.warehouse_name,
            display_order: log.display_order,
          })),
        };
      })
    );

    return result;
  }

  /**
   * 발주 배송 세트 저장 (UPSERT 방식: UPDATE/INSERT/DELETE)
   * 반환값: 각 delivery_set의 ID와 해당하는 logistics_info ID 배열
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
        count?: number | null;
        weight?: string | null;
        display_order?: number;
      }>;
      logistics_info?: Array<{
        id?: number;
        tracking_number?: string | null;
        inland_company_id?: number | null;
        warehouse_id?: number | null;
        display_order?: number;
      }>;
    }>
  ): Promise<Array<{
    delivery_set_id: number;
    logistics_info_ids: number[];
  }>> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 기존 delivery_sets ID 조회
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM delivery_sets WHERE purchase_order_id = ?',
        [purchaseOrderId]
      );
      const existingIds = new Set(existingRows.map(row => row.id));
      
      // 클라이언트에서 보낸 ID들 (DB ID만)
      const receivedIds = new Set(sets.filter(s => s.id !== undefined).map(s => s.id!));

      const result: Array<{
        delivery_set_id: number;
        logistics_info_ids: number[];
      }> = [];

      // 각 delivery set 처리
      for (let setIndex = 0; setIndex < sets.length; setIndex++) {
        const set = sets[setIndex];
        let deliverySetId: number;

        if (set.id !== undefined && existingIds.has(set.id)) {
          // 기존 delivery set → UPDATE
          await connection.execute(
            `UPDATE delivery_sets 
             SET packing_code = ?, packing_date = ?, display_order = ?
             WHERE id = ? AND purchase_order_id = ?`,
            [
              set.packing_code,
              set.packing_date || null,
              set.display_order !== undefined ? set.display_order : setIndex,
              set.id,
              purchaseOrderId
            ]
          );
          deliverySetId = set.id;
        } else {
          // 새 delivery set → INSERT
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO delivery_sets (purchase_order_id, packing_code, packing_date, display_order)
             VALUES (?, ?, ?, ?)`,
            [
              purchaseOrderId,
              set.packing_code,
              set.packing_date || null,
              set.display_order !== undefined ? set.display_order : setIndex
            ]
          );
          deliverySetId = result.insertId;
        }
        
        // logistics_info_ids 배열 초기화 (package_info 및 logistics_info 처리 전에)
        const logisticsInfoIds: number[] = [];

        // package_info 처리
        if (set.package_info && set.package_info.length > 0) {
          const [existingPackageRows] = await connection.execute<RowDataPacket[]>(
            'SELECT id FROM package_info WHERE delivery_set_id = ?',
            [deliverySetId]
          );
          const existingPackageIds = new Set(existingPackageRows.map(row => row.id));
          const receivedPackageIds = new Set(
            set.package_info.filter(p => p.id !== undefined).map(p => p.id!)
          );

          for (let pkgIndex = 0; pkgIndex < set.package_info.length; pkgIndex++) {
            const pkg = set.package_info[pkgIndex];
            if (pkg.id !== undefined && existingPackageIds.has(pkg.id)) {
              // 기존 package_info → UPDATE
              await connection.execute(
                `UPDATE package_info 
                 SET types = ?, pieces = ?, sets = ?, total = ?, method = ?, count = ?, weight = ?, display_order = ?
                 WHERE id = ? AND delivery_set_id = ?`,
                [
                  pkg.types || null,
                  pkg.pieces || null,
                  pkg.sets || null,
                  pkg.total || null,
                  pkg.method || '박스',
                  pkg.count || null,
                  pkg.weight || null,
                  pkg.display_order !== undefined ? pkg.display_order : pkgIndex,
                  pkg.id,
                  deliverySetId
                ]
              );
            } else {
              // 새 package_info → INSERT
              await connection.execute(
                `INSERT INTO package_info (delivery_set_id, types, pieces, sets, total, method, count, weight, display_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  deliverySetId,
                  pkg.types || null,
                  pkg.pieces || null,
                  pkg.sets || null,
                  pkg.total || null,
                  pkg.method || '박스',
                  pkg.count || null,
                  pkg.weight || null,
                  pkg.display_order !== undefined ? pkg.display_order : pkgIndex
                ]
              );
            }
          }

          // 삭제된 package_info만 DELETE
          const packageIdsToDelete = [...existingPackageIds].filter(id => !receivedPackageIds.has(id));
          if (packageIdsToDelete.length > 0) {
            const placeholders = packageIdsToDelete.map(() => '?').join(', ');
            await connection.execute(
              `DELETE FROM package_info WHERE delivery_set_id = ? AND id IN (${placeholders})`,
              [deliverySetId, ...packageIdsToDelete]
            );
          }
        }

        // logistics_info 처리 (logisticsInfoIds는 이미 위에서 초기화됨)
        if (set.logistics_info && set.logistics_info.length > 0) {
          const [existingLogisticsRows] = await connection.execute<RowDataPacket[]>(
            'SELECT id FROM logistics_info WHERE delivery_set_id = ?',
            [deliverySetId]
          );
          const existingLogisticsIds = new Set(existingLogisticsRows.map(row => row.id));
          const receivedLogisticsIds = new Set(
            set.logistics_info.filter(l => l.id !== undefined).map(l => l.id!)
          );

          for (let logIndex = 0; logIndex < set.logistics_info.length; logIndex++) {
            const log = set.logistics_info[logIndex];
            let logisticsInfoId: number;
            
            if (log.id !== undefined && existingLogisticsIds.has(log.id)) {
              // 기존 logistics_info → UPDATE
              await connection.execute(
                `UPDATE logistics_info 
                 SET tracking_number = ?, inland_company_id = ?, warehouse_id = ?, display_order = ?
                 WHERE id = ? AND delivery_set_id = ?`,
                [
                  log.tracking_number || null,
                  log.inland_company_id || null,
                  log.warehouse_id || null,
                  log.display_order !== undefined ? log.display_order : logIndex,
                  log.id,
                  deliverySetId
                ]
              );
              logisticsInfoId = log.id;
            } else {
              // 새 logistics_info → INSERT
              const [logResult] = await connection.execute<ResultSetHeader>(
                `INSERT INTO logistics_info (delivery_set_id, tracking_number, inland_company_id, warehouse_id, display_order)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                  deliverySetId,
                  log.tracking_number || null,
                  log.inland_company_id || null,
                  log.warehouse_id || null,
                  log.display_order !== undefined ? log.display_order : logIndex
                ]
              );
              logisticsInfoId = logResult.insertId;
            }
            logisticsInfoIds.push(logisticsInfoId);
          }

          // 삭제된 logistics_info만 DELETE (CASCADE로 이미지도 함께 삭제됨)
          const logisticsIdsToDelete = [...existingLogisticsIds].filter(id => !receivedLogisticsIds.has(id));
          if (logisticsIdsToDelete.length > 0) {
            const placeholders = logisticsIdsToDelete.map(() => '?').join(', ');
            await connection.execute(
              `DELETE FROM logistics_info WHERE delivery_set_id = ? AND id IN (${placeholders})`,
              [deliverySetId, ...logisticsIdsToDelete]
            );
            // 삭제된 logistics_info의 이미지도 함께 삭제
            await connection.execute(
              `DELETE FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id IN (${placeholders})`,
              [purchaseOrderId, 'logistics', ...logisticsIdsToDelete]
            );
          }
        }
        
        // 결과에 추가 (delivery_set_id와 logistics_info_ids) - logistics_info 처리 후
        result.push({
          delivery_set_id: deliverySetId,
          logistics_info_ids: logisticsInfoIds,
        });
      }

      // 삭제된 delivery_set만 DELETE (CASCADE로 package_info, logistics_info도 함께 삭제됨)
      const idsToDelete = [...existingIds].filter(id => !receivedIds.has(id));
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(', ');
        // 삭제 전에 관련 이미지 먼저 삭제
        const [logisticsRows] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM logistics_info WHERE delivery_set_id IN (${placeholders})`,
          idsToDelete
        );
        const logisticsIds = logisticsRows.map(row => row.id);
        if (logisticsIds.length > 0) {
          const logisticsPlaceholders = logisticsIds.map(() => '?').join(', ');
          await connection.execute(
            `DELETE FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id IN (${logisticsPlaceholders})`,
            [purchaseOrderId, 'logistics', ...logisticsIds]
          );
        }
        // delivery_set 삭제 (CASCADE로 package_info, logistics_info도 함께 삭제됨)
        await connection.execute(
          `DELETE FROM delivery_sets WHERE purchase_order_id = ? AND id IN (${placeholders})`,
          [purchaseOrderId, ...idsToDelete]
        );
      }

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 발주 이미지 조회 (타입별)
   */
  async findImagesByPoIdAndType(
    purchaseOrderId: string,
    imageType: 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
    relatedId?: number
  ): Promise<Array<{ id: number; image_url: string; display_order: number }>> {
    let query = `
      SELECT id, image_url, display_order
      FROM po_images
      WHERE purchase_order_id = ? AND image_type = ?
    `;
    const params: any[] = [purchaseOrderId, imageType];

    if (relatedId !== undefined) {
      query += ' AND related_id = ?';
      params.push(relatedId);
    }

    query += ' ORDER BY display_order ASC, id ASC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return rows.map(row => ({
      id: row.id,
      image_url: row.image_url,
      display_order: row.display_order,
    }));
  }

  /**
   * 발주 이미지 저장 (기존 이미지 삭제 후 새로 저장)
   */
  async saveImages(
    purchaseOrderId: string,
    imageType: 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
    relatedId: number,
    imageUrls: string[]
  ): Promise<number[]> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 기존 이미지 조회
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        'SELECT image_url, display_order FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id = ? ORDER BY display_order ASC',
        [purchaseOrderId, imageType, relatedId]
      );

      const existingUrls = existingRows.map(row => row.image_url);
      const existingCount = existingRows.length;

      // 중복 제거: 기존 이미지와 새 이미지 합치기 (중복 URL 제거)
      const allUrls = [...existingUrls];
      for (const url of imageUrls) {
        if (!allUrls.includes(url)) {
          allUrls.push(url);
        }
      }

      // 기존 이미지 삭제 (같은 타입, 같은 related_id)
      console.log(`[saveImages] 기존 이미지 삭제: purchaseOrderId=${purchaseOrderId}, type=${imageType}, relatedId=${relatedId}`);
      const [deleteResult] = await connection.execute(
        'DELETE FROM po_images WHERE purchase_order_id = ? AND image_type = ? AND related_id = ?',
        [purchaseOrderId, imageType, relatedId]
      );
      console.log(`[saveImages] 기존 이미지 삭제 완료:`, deleteResult);

      const insertedIds: number[] = [];

      // 모든 이미지 저장 (기존 + 새로 추가된 것만)
      console.log(`[saveImages] 저장할 이미지 URL 개수: ${allUrls.length}`);
      if (allUrls.length > 0) {
        const values = allUrls.map((url, index) => [
          purchaseOrderId,
          imageType,
          relatedId,
          url,
          index
        ]);

        const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();

        console.log(`[saveImages] INSERT 실행: ${allUrls.length}개 이미지`);
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO po_images (purchase_order_id, image_type, related_id, image_url, display_order)
           VALUES ${placeholders}`,
          flatValues
        );

        console.log(`[saveImages] INSERT 결과: insertId=${result.insertId}, affectedRows=${result.affectedRows}`);

        // 첫 번째 insertId를 기준으로 순차적으로 ID 계산
        for (let i = 0; i < allUrls.length; i++) {
          insertedIds.push(result.insertId + i);
        }
        console.log(`[saveImages] 생성된 이미지 IDs:`, insertedIds);
      } else {
        console.log(`[saveImages] 저장할 이미지가 없습니다.`);
      }

      await connection.commit();
      console.log(`[saveImages] 트랜잭션 커밋 완료`);
      // 새로 추가된 이미지의 ID만 반환
      return insertedIds.slice(existingCount);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 발주 이미지 삭제 (특정 이미지 ID들)
   */
  async deleteImages(imageIds: number[]): Promise<void> {
    if (imageIds.length === 0) {
      return;
    }

    const placeholders = imageIds.map(() => '?').join(', ');
    await pool.execute(
      `DELETE FROM po_images WHERE id IN (${placeholders})`,
      imageIds
    );
  }
}

