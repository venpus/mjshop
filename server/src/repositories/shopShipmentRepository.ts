import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  CreateShopShipmentBatchDTO,
  SHOP_LOGISTICS_COMPANY_LOGEN,
  SHOP_LOGISTICS_T_CODE_LOGEN,
  ShopShipment,
  ShopShipmentDeliveryStatus,
  ShopShipmentListRow,
  ShopShipmentBatchListItem,
  ShopShipmentBatchShipmentItem,
  ShopShipmentBatchLineItem,
  UpdateShopShipmentDTO,
  UpdateShopShipmentBatchDTO,
} from '../models/shopShipment.js';

interface ShipmentRow extends RowDataPacket {
  id: string;
  batch_id: string;
  tracking_number: string;
  logistics_company: string;
  t_code: string;
  delivery_status: ShopShipmentDeliveryStatus;
  shipment_box_count: number | null;
  delivery_fee: number | null;
  box_price: number | null;
  last_tracking_kind: string | null;
  last_tracking_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ShipmentListRow extends RowDataPacket {
  shipment_line_id: string;
  shipment_id: string;
  shipment_date: Date | string;
  tracking_number: string;
  logistics_company: string;
  delivery_status: ShopShipmentDeliveryStatus;
  shipment_box_count: number | null;
  delivery_fee: number | null;
  box_price: number | null;
  last_tracking_kind: string | null;
  last_tracking_at: Date | null;
  shop_order_id: string;
  line_id: string;
  order_number: string;
  product_name: string;
  order_date: Date | string | null;
  line_order_number: string | null;
  sort_order: number;
  is_reservation: number;
  company_name: string | null;
  recipient_name: string | null;
  phone_number: string | null;
  address: string | null;
  order_box_count: number;
  quantity_per_box: number;
}

function normalizeDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function mapShipmentRow(row: ShipmentRow): ShopShipment {
  return {
    id: row.id,
    batchId: row.batch_id,
    trackingNumber: row.tracking_number,
    logisticsCompany: row.logistics_company,
    tCode: row.t_code,
    deliveryStatus: row.delivery_status,
    shipmentBoxCount: row.shipment_box_count != null ? Number(row.shipment_box_count) : null,
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
    boxPrice: row.box_price != null ? Number(row.box_price) : null,
    lastTrackingKind: row.last_tracking_kind,
    lastTrackingAt: row.last_tracking_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ShopShipmentRepository {
  async listRows(): Promise<ShopShipmentListRow[]> {
    const [rows] = await pool.execute<ShipmentListRow[]>(
      `SELECT
        CONCAT(s.id, ':', bl.line_id) AS shipment_line_id,
        s.id AS shipment_id,
        b.shipment_date,
        s.tracking_number,
        s.logistics_company,
        s.delivery_status,
        s.shipment_box_count,
        s.delivery_fee,
        s.box_price,
        s.last_tracking_kind,
        s.last_tracking_at,
        bl.shop_order_id,
        bl.line_id,
        o.order_number,
        o.product_name,
        o.order_date,
        ol.line_order_number,
        ol.sort_order,
        ol.is_reservation,
        ol.company_name,
        ol.recipient_name,
        ol.phone_number,
        ol.address,
        ol.order_box_count,
        ol.quantity_per_box
      FROM kr_shop_shipment_batch_lines bl
      INNER JOIN kr_shop_shipment_batches b ON b.id = bl.batch_id
      INNER JOIN kr_shop_shipments s ON s.batch_id = b.id
      INNER JOIN kr_shop_order_lines ol ON ol.id = bl.line_id
      INNER JOIN kr_shop_orders o ON o.id = bl.shop_order_id
      ORDER BY b.shipment_date DESC, s.tracking_number ASC, ol.sort_order ASC, bl.created_at ASC`
    );

    return rows.map((row) => ({
      shipmentLineId: row.shipment_line_id,
      shipmentId: row.shipment_id,
      shipmentDate: normalizeDateOnly(row.shipment_date),
      trackingNumber: row.tracking_number,
      logisticsCompany: row.logistics_company,
      deliveryStatus: row.delivery_status,
      shipmentBoxCount:
        row.shipment_box_count != null ? Number(row.shipment_box_count) : null,
      deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
      boxPrice: row.box_price != null ? Number(row.box_price) : null,
      lastTrackingKind: row.last_tracking_kind,
      lastTrackingAt: row.last_tracking_at ? row.last_tracking_at.toISOString() : null,
      shopOrderId: row.shop_order_id,
      lineId: row.line_id,
      orderNumber: row.order_number,
      productName: row.product_name,
      orderDate: row.order_date ? normalizeDateOnly(row.order_date) : null,
      lineOrderNumber: row.line_order_number,
      lineIndex: Number(row.sort_order) + 1,
      isReservation: Boolean(row.is_reservation),
      companyName: row.company_name,
      recipientName: row.recipient_name,
      phoneNumber: row.phone_number,
      address: row.address,
      orderBoxCount: Number(row.order_box_count) || 0,
      quantityPerBox: Number(row.quantity_per_box) || 0,
    }));
  }

  async listBatches(): Promise<ShopShipmentBatchListItem[]> {
    const [batchRows] = await pool.execute<
      (RowDataPacket & {
        id: string;
        shipment_date: Date | string;
        logistics_fee_paid: number;
        logistics_fee_paid_at: Date | null;
      })[]
    >(
      `SELECT id, shipment_date, logistics_fee_paid, logistics_fee_paid_at
       FROM kr_shop_shipment_batches
       ORDER BY shipment_date DESC, created_at DESC`
    );

    if (batchRows.length === 0) {
      return [];
    }

    const batchIds = batchRows.map((row) => row.id);

    const [shipmentRows] = await pool.execute<
      (RowDataPacket & {
        id: string;
        batch_id: string;
        tracking_number: string;
        logistics_company: string;
        delivery_status: ShopShipmentDeliveryStatus;
        shipment_box_count: number | null;
        delivery_fee: number | null;
        box_price: number | null;
        last_tracking_kind: string | null;
        last_tracking_at: Date | null;
      })[]
    >(
      `SELECT id, batch_id, tracking_number, logistics_company, delivery_status,
              shipment_box_count, delivery_fee, box_price, last_tracking_kind, last_tracking_at
       FROM kr_shop_shipments
       WHERE batch_id IN (${batchIds.map(() => '?').join(', ')})
       ORDER BY batch_id, tracking_number ASC`,
      batchIds
    );

    const [lineRows] = await pool.execute<
      (RowDataPacket & {
        batch_id: string;
        line_id: string;
        shop_order_id: string;
        order_number: string;
        product_name: string;
        line_order_number: string | null;
        sort_order: number;
        company_name: string | null;
        recipient_name: string | null;
        phone_number: string | null;
        address: string | null;
        order_box_count: number;
        quantity_per_box: number;
      })[]
    >(
      `SELECT
        bl.batch_id,
        bl.line_id,
        bl.shop_order_id,
        o.order_number,
        o.product_name,
        ol.line_order_number,
        ol.sort_order,
        ol.company_name,
        ol.recipient_name,
        ol.phone_number,
        ol.address,
        ol.order_box_count,
        ol.quantity_per_box
      FROM kr_shop_shipment_batch_lines bl
      INNER JOIN kr_shop_order_lines ol ON ol.id = bl.line_id
      INNER JOIN kr_shop_orders o ON o.id = bl.shop_order_id
      WHERE bl.batch_id IN (${batchIds.map(() => '?').join(', ')})
      ORDER BY bl.batch_id, ol.sort_order ASC, bl.created_at ASC`,
      batchIds
    );

    const shipmentsByBatch = new Map<string, ShopShipmentBatchShipmentItem[]>();
    const costsByBatch = new Map<
      string,
      { shipmentBoxCount: number | null; deliveryFee: number | null; boxPrice: number | null }
    >();

    for (const row of shipmentRows) {
      const list = shipmentsByBatch.get(row.batch_id) ?? [];
      list.push({
        shipmentId: row.id,
        trackingNumber: row.tracking_number,
        logisticsCompany: row.logistics_company,
        deliveryStatus: row.delivery_status,
        lastTrackingKind: row.last_tracking_kind,
        lastTrackingAt: row.last_tracking_at ? row.last_tracking_at.toISOString() : null,
      });
      shipmentsByBatch.set(row.batch_id, list);

      if (!costsByBatch.has(row.batch_id)) {
        costsByBatch.set(row.batch_id, {
          shipmentBoxCount:
            row.shipment_box_count != null ? Number(row.shipment_box_count) : null,
          deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
          boxPrice: row.box_price != null ? Number(row.box_price) : null,
        });
      }
    }

    const linesByBatch = new Map<string, ShopShipmentBatchLineItem[]>();
    const deliveryByBatch = new Map<
      string,
      { recipientName: string | null; phoneNumber: string | null; address: string | null }
    >();

    for (const row of lineRows) {
      const list = linesByBatch.get(row.batch_id) ?? [];
      list.push({
        lineId: row.line_id,
        shopOrderId: row.shop_order_id,
        orderNumber: row.order_number,
        productName: row.product_name,
        lineOrderNumber: row.line_order_number,
        lineIndex: Number(row.sort_order) + 1,
        companyName: row.company_name,
        orderBoxCount: Number(row.order_box_count) || 0,
        quantityPerBox: Number(row.quantity_per_box) || 0,
      });
      linesByBatch.set(row.batch_id, list);

      if (!deliveryByBatch.has(row.batch_id)) {
        deliveryByBatch.set(row.batch_id, {
          recipientName: row.recipient_name,
          phoneNumber: row.phone_number,
          address: row.address,
        });
      }
    }

    return batchRows.map((batch) => {
      const delivery = deliveryByBatch.get(batch.id);
      const costs = costsByBatch.get(batch.id);
      return {
        batchId: batch.id,
        shipmentDate: normalizeDateOnly(batch.shipment_date),
        recipientName: delivery?.recipientName ?? null,
        phoneNumber: delivery?.phoneNumber ?? null,
        address: delivery?.address ?? null,
        shipmentBoxCount: costs?.shipmentBoxCount ?? null,
        deliveryFee: costs?.deliveryFee ?? null,
        boxPrice: costs?.boxPrice ?? null,
        logisticsFeePaid: Boolean(batch.logistics_fee_paid),
        logisticsFeePaidAt: batch.logistics_fee_paid_at
          ? batch.logistics_fee_paid_at.toISOString()
          : null,
        shipments: shipmentsByBatch.get(batch.id) ?? [],
        lineItems: linesByBatch.get(batch.id) ?? [],
      };
    });
  }

  async listAssignedLineIds(): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT line_id FROM kr_shop_shipment_batch_lines`
    );
    return rows.map((row) => String(row.line_id));
  }

  async findById(id: string): Promise<ShopShipment | null> {
    const [rows] = await pool.execute<ShipmentRow[]>(
      `SELECT id, batch_id, tracking_number, logistics_company, t_code, delivery_status,
              shipment_box_count, delivery_fee, box_price, last_tracking_kind, last_tracking_at,
              created_at, updated_at
       FROM kr_shop_shipments WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? mapShipmentRow(rows[0]) : null;
  }

  async listBatchLineIds(batchId: string): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT line_id FROM kr_shop_shipment_batch_lines WHERE batch_id = ?`,
      [batchId]
    );
    return rows.map((row) => String(row.line_id));
  }

  async areAllBatchShipmentsDelivered(batchId: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count
       FROM kr_shop_shipments
       WHERE batch_id = ?`,
      [batchId]
    );
    if (rows.length === 0) return false;
    const total = Number(rows[0].total) || 0;
    const deliveredCount = Number(rows[0].delivered_count) || 0;
    return total > 0 && total === deliveredCount;
  }

  async createBatchWithShipments(data: CreateShopShipmentBatchDTO): Promise<{ batchId: string }> {
    const connection = await pool.getConnection();
    const batchId = randomUUID();

    try {
      await connection.beginTransaction();

      await connection.execute<ResultSetHeader>(
        `INSERT INTO kr_shop_shipment_batches (id, shipment_date) VALUES (?, ?)`,
        [batchId, data.shipmentDate]
      );

      const sharedLineItems = new Map<string, { shopOrderId: string; lineId: string }>();
      for (const shipment of data.shipments) {
        for (const item of shipment.lineItems) {
          sharedLineItems.set(item.lineId, item);
        }
      }

      const lineItems = Array.from(sharedLineItems.values());
      if (lineItems.length === 0) {
        throw new Error('포함할 주문건을 선택해 주세요.');
      }

      const trackingNumbers = data.shipments
        .map((shipment) => shipment.trackingNumber.replace(/\D/g, '').slice(0, 32))
        .filter(Boolean);
      const trackingNumberLabel = trackingNumbers.join(', ').slice(0, 255);

      const batchBoxCount = data.shipments[0]?.shipmentBoxCount ?? null;
      const batchDeliveryFee = data.shipments[0]?.deliveryFee ?? null;
      const batchBoxPrice = data.shipments[0]?.boxPrice ?? null;

      for (const item of lineItems) {
        const batchLineId = randomUUID();
        await connection.execute<ResultSetHeader>(
          `INSERT INTO kr_shop_shipment_batch_lines (id, batch_id, shop_order_id, line_id)
           VALUES (?, ?, ?, ?)`,
          [batchLineId, batchId, item.shopOrderId, item.lineId]
        );
      }

      for (const shipment of data.shipments) {
        const shipmentId = randomUUID();
        const trackingNumber = shipment.trackingNumber.replace(/\D/g, '').slice(0, 32);
        if (!trackingNumber) {
          throw new Error('송장번호를 입력해 주세요.');
        }

        await connection.execute<ResultSetHeader>(
          `INSERT INTO kr_shop_shipments
            (id, batch_id, tracking_number, logistics_company, t_code,
             shipment_box_count, delivery_fee, box_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            shipmentId,
            batchId,
            trackingNumber,
            SHOP_LOGISTICS_COMPANY_LOGEN,
            SHOP_LOGISTICS_T_CODE_LOGEN,
            batchBoxCount,
            batchDeliveryFee,
            batchBoxPrice,
          ]
        );
      }

      for (const item of lineItems) {
        await connection.execute<ResultSetHeader>(
          `UPDATE kr_shop_order_lines SET tracking_number = ? WHERE id = ?`,
          [trackingNumberLabel, item.lineId]
        );
      }

      await connection.commit();
      return { batchId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateBatch(batchId: string, data: UpdateShopShipmentBatchDTO): Promise<void> {
    const shipmentFields: string[] = [];
    const shipmentValues: unknown[] = [];

    if (data.shipmentBoxCount !== undefined) {
      shipmentFields.push('shipment_box_count = ?');
      shipmentValues.push(data.shipmentBoxCount);
    }
    if (data.deliveryFee !== undefined) {
      shipmentFields.push('delivery_fee = ?');
      shipmentValues.push(data.deliveryFee);
    }
    if (data.boxPrice !== undefined) {
      shipmentFields.push('box_price = ?');
      shipmentValues.push(data.boxPrice);
    }

    if (shipmentFields.length > 0) {
      shipmentValues.push(batchId);
      await pool.execute<ResultSetHeader>(
        `UPDATE kr_shop_shipments SET ${shipmentFields.join(', ')} WHERE batch_id = ?`,
        shipmentValues
      );
    }

    if (data.logisticsFeePaid !== undefined) {
      await pool.execute<ResultSetHeader>(
        `UPDATE kr_shop_shipment_batches
         SET logistics_fee_paid = ?, logistics_fee_paid_at = ?
         WHERE id = ?`,
        [data.logisticsFeePaid ? 1 : 0, data.logisticsFeePaid ? new Date() : null, batchId]
      );
    }
  }

  async updateShipment(id: string, data: UpdateShopShipmentDTO): Promise<ShopShipment | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.shipmentBoxCount !== undefined) {
      fields.push('shipment_box_count = ?');
      values.push(data.shipmentBoxCount);
    }
    if (data.deliveryFee !== undefined) {
      fields.push('delivery_fee = ?');
      values.push(data.deliveryFee);
    }
    if (data.boxPrice !== undefined) {
      fields.push('box_price = ?');
      values.push(data.boxPrice);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_shipments SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  async updateDeliveryStatus(
    id: string,
    deliveryStatus: ShopShipmentDeliveryStatus,
    lastTrackingKind: string | null,
    lastTrackingAt: Date | null
  ): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_shipments
       SET delivery_status = ?, last_tracking_kind = ?, last_tracking_at = ?
       WHERE id = ?`,
      [deliveryStatus, lastTrackingKind, lastTrackingAt, id]
    );
  }

  async deleteShipment(id: string): Promise<void> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [shipmentRows] = await connection.execute<ShipmentRow[]>(
        `SELECT id, batch_id FROM kr_shop_shipments WHERE id = ?`,
        [id]
      );
      if (shipmentRows.length === 0) {
        throw new Error('송장을 찾을 수 없습니다.');
      }

      const batchId = shipmentRows[0].batch_id;

      const [batchLineRows] = await connection.execute<RowDataPacket[]>(
        `SELECT line_id FROM kr_shop_shipment_batch_lines WHERE batch_id = ?`,
        [batchId]
      );
      const lineIds = batchLineRows.map((row) => String(row.line_id));

      await connection.execute<ResultSetHeader>(
        `DELETE FROM kr_shop_shipments WHERE id = ?`,
        [id]
      );

      const [remainingRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM kr_shop_shipments WHERE batch_id = ?`,
        [batchId]
      );

      if (remainingRows.length === 0) {
        await connection.execute<ResultSetHeader>(
          `DELETE FROM kr_shop_shipment_batches WHERE id = ?`,
          [batchId]
        );

        for (const lineId of lineIds) {
          await connection.execute<ResultSetHeader>(
            `UPDATE kr_shop_order_lines SET tracking_number = NULL WHERE id = ?`,
            [lineId]
          );
        }
      } else {
        const [trackingRows] = await connection.execute<RowDataPacket[]>(
          `SELECT tracking_number FROM kr_shop_shipments WHERE batch_id = ? ORDER BY tracking_number ASC`,
          [batchId]
        );
        const trackingNumberLabel = trackingRows
          .map((row) => String(row.tracking_number))
          .join(', ')
          .slice(0, 255);

        for (const lineId of lineIds) {
          await connection.execute<ResultSetHeader>(
            `UPDATE kr_shop_order_lines SET tracking_number = ? WHERE id = ?`,
            [trackingNumberLabel, lineId]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteBatch(batchId: string): Promise<void> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [batchRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM kr_shop_shipment_batches WHERE id = ?`,
        [batchId]
      );
      if (batchRows.length === 0) {
        throw new Error('배송 묶음을 찾을 수 없습니다.');
      }

      const [batchLineRows] = await connection.execute<RowDataPacket[]>(
        `SELECT line_id FROM kr_shop_shipment_batch_lines WHERE batch_id = ?`,
        [batchId]
      );
      const lineIds = batchLineRows.map((row) => String(row.line_id));

      await connection.execute<ResultSetHeader>(
        `DELETE FROM kr_shop_shipment_batches WHERE id = ?`,
        [batchId]
      );

      for (const lineId of lineIds) {
        await connection.execute<ResultSetHeader>(
          `UPDATE kr_shop_order_lines SET tracking_number = NULL WHERE id = ?`,
          [lineId]
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
}
