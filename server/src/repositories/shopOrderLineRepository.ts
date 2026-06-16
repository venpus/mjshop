import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  ShopOrderLine,
  CreateShopOrderLineDTO,
  UpdateShopOrderLineDTO,
} from '../models/shopOrderLine.js';
import { generateRandomLineOrderNumber } from '../utils/shopOrderLineNumber.js';

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

interface ShopOrderLineRow extends RowDataPacket {
  id: string;
  line_order_number: string | null;
  shop_order_id: string;
  sort_order: number;
  is_reservation: number;
  company_name: string | null;
  order_box_count: number;
  quantity_per_box: number;
  sale_unit_price: number | null;
  delivery_fee: number | null;
  product_supply_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  address: string | null;
  recipient_name: string | null;
  phone_number: string | null;
  tracking_number: string | null;
  statement_issued: number;
  payment_received: number;
  product_arrived: number;
  tax_invoice_issued: number;
  cny_exchange_rate: number | null;
  wk_settlement_paid: number;
  inventio_settlement_paid: number;
  shipment_box_count: number | null;
  logistics_fee_paid: number;
  logistics_fee_paid_at: Date | null;
  wk_settlement_paid_at: Date | null;
  inventio_settlement_paid_at: Date | null;
  statement_file_path: string | null;
  statement_group_id: string | null;
  statement_issued_at: Date | null;
  statement_delivered: number;
  payment_proof_image: string | null;
  created_at: Date;
  updated_at: Date;
}

const LINE_SELECT = `id, line_order_number, shop_order_id, sort_order, is_reservation, company_name, order_box_count, quantity_per_box,
  sale_unit_price, delivery_fee, product_supply_amount, vat_amount, total_amount, address, recipient_name, phone_number,
  tracking_number, statement_issued, payment_received, product_arrived, tax_invoice_issued,
  cny_exchange_rate, wk_settlement_paid, inventio_settlement_paid, shipment_box_count,
  logistics_fee_paid,   logistics_fee_paid_at, wk_settlement_paid_at, inventio_settlement_paid_at,
  statement_file_path, statement_group_id, statement_issued_at, statement_delivered, payment_proof_image, created_at, updated_at`;

export class ShopOrderLineRepository {
  async findByShopOrderId(shopOrderId: string): Promise<ShopOrderLine[]> {
    const [rows] = await pool.execute<ShopOrderLineRow[]>(
      `SELECT ${LINE_SELECT}
       FROM kr_shop_order_lines
       WHERE shop_order_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [shopOrderId]
    );
    return rows.map(this.mapRow);
  }

  async findByShopOrderIds(shopOrderIds: string[]): Promise<ShopOrderLine[]> {
    if (shopOrderIds.length === 0) return [];

    const placeholders = shopOrderIds.map(() => '?').join(', ');
    const [rows] = await pool.execute<ShopOrderLineRow[]>(
      `SELECT ${LINE_SELECT}
       FROM kr_shop_order_lines
       WHERE shop_order_id IN (${placeholders})
       ORDER BY shop_order_id ASC, sort_order ASC, created_at ASC`,
      shopOrderIds
    );
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<ShopOrderLine | null> {
    const [rows] = await pool.execute<ShopOrderLineRow[]>(
      `SELECT ${LINE_SELECT} FROM kr_shop_order_lines WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async getNextSortOrder(shopOrderId: string): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM kr_shop_order_lines WHERE shop_order_id = ?`,
      [shopOrderId]
    );
    return Number(rows[0]?.next_sort) || 0;
  }

  async generateUniqueLineOrderNumber(maxAttempts = 30): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = generateRandomLineOrderNumber();
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM kr_shop_order_lines WHERE line_order_number = ? LIMIT 1`,
        [candidate]
      );
      if (rows.length === 0) {
        return candidate;
      }
    }
    throw new Error('고유 주문번호 생성에 실패했습니다.');
  }

  async backfillMissingLineOrderNumbers(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM kr_shop_order_lines
       WHERE line_order_number IS NULL OR line_order_number = ''`
    );

    let count = 0;
    for (const row of rows) {
      const lineOrderNumber = await this.generateUniqueLineOrderNumber();
      await pool.execute<ResultSetHeader>(
        `UPDATE kr_shop_order_lines SET line_order_number = ? WHERE id = ?`,
        [lineOrderNumber, row.id]
      );
      count += 1;
    }
    return count;
  }

  async create(data: CreateShopOrderLineDTO): Promise<ShopOrderLine> {
    const id = randomUUID();
    const sortOrder =
      data.sortOrder ?? (await this.getNextSortOrder(data.shopOrderId));
    const lineOrderNumber = await this.generateUniqueLineOrderNumber();

    await pool.execute<ResultSetHeader>(
      `INSERT INTO kr_shop_order_lines
       (id, line_order_number, shop_order_id, sort_order, is_reservation, order_box_count, quantity_per_box, sale_unit_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        lineOrderNumber,
        data.shopOrderId,
        sortOrder,
        data.isReservation ? 1 : 0,
        data.orderBoxCount ?? 1,
        data.quantityPerBox ?? 0,
        data.saleUnitPrice ?? null,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('주문 라인 생성 후 조회에 실패했습니다.');
    }
    return created;
  }

  async update(id: string, data: UpdateShopOrderLineDTO): Promise<ShopOrderLine | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.companyName !== undefined) {
      fields.push('company_name = ?');
      values.push(data.companyName);
    }
    if (data.orderBoxCount !== undefined) {
      fields.push('order_box_count = ?');
      values.push(data.orderBoxCount);
    }
    if (data.quantityPerBox !== undefined) {
      fields.push('quantity_per_box = ?');
      values.push(data.quantityPerBox);
    }
    if (data.saleUnitPrice !== undefined) {
      fields.push('sale_unit_price = ?');
      values.push(data.saleUnitPrice);
    }
    if (data.deliveryFee !== undefined) {
      fields.push('delivery_fee = ?');
      values.push(data.deliveryFee);
    }
    if (data.productSupplyAmount !== undefined) {
      fields.push('product_supply_amount = ?');
      values.push(data.productSupplyAmount);
    }
    if (data.vatAmount !== undefined) {
      fields.push('vat_amount = ?');
      values.push(data.vatAmount);
    }
    if (data.totalAmount !== undefined) {
      fields.push('total_amount = ?');
      values.push(data.totalAmount);
    }
    if (data.address !== undefined) {
      fields.push('address = ?');
      values.push(data.address);
    }
    if (data.recipientName !== undefined) {
      fields.push('recipient_name = ?');
      values.push(data.recipientName);
    }
    if (data.phoneNumber !== undefined) {
      fields.push('phone_number = ?');
      values.push(data.phoneNumber);
    }
    if (data.trackingNumber !== undefined) {
      fields.push('tracking_number = ?');
      values.push(data.trackingNumber?.trim() || null);
    }
    if (data.productArrived !== undefined) {
      fields.push('product_arrived = ?');
      values.push(data.productArrived ? 1 : 0);
    }
    if (data.taxInvoiceIssued !== undefined) {
      fields.push('tax_invoice_issued = ?');
      values.push(data.taxInvoiceIssued ? 1 : 0);
    }
    if (data.cnyExchangeRate !== undefined) {
      fields.push('cny_exchange_rate = ?');
      values.push(data.cnyExchangeRate);
    }
    if (data.wkSettlementPaid !== undefined) {
      fields.push('wk_settlement_paid = ?');
      values.push(data.wkSettlementPaid ? 1 : 0);
    }
    if (data.inventioSettlementPaid !== undefined) {
      fields.push('inventio_settlement_paid = ?');
      values.push(data.inventioSettlementPaid ? 1 : 0);
    }
    if (data.shipmentBoxCount !== undefined) {
      fields.push('shipment_box_count = ?');
      values.push(data.shipmentBoxCount);
    }
    if (data.logisticsFeePaid !== undefined) {
      fields.push('logistics_fee_paid = ?');
      values.push(data.logisticsFeePaid ? 1 : 0);
    }
    if (data.logisticsFeePaidAt !== undefined) {
      fields.push('logistics_fee_paid_at = ?');
      values.push(data.logisticsFeePaidAt);
    }
    if (data.wkSettlementPaidAt !== undefined) {
      fields.push('wk_settlement_paid_at = ?');
      values.push(data.wkSettlementPaidAt);
    }
    if (data.inventioSettlementPaidAt !== undefined) {
      fields.push('inventio_settlement_paid_at = ?');
      values.push(data.inventioSettlementPaidAt);
    }
    if (data.statementIssued !== undefined) {
      fields.push('statement_issued = ?');
      values.push(data.statementIssued ? 1 : 0);
    }
    if (data.paymentReceived !== undefined) {
      fields.push('payment_received = ?');
      values.push(data.paymentReceived ? 1 : 0);
    }
    if (data.statementFilePath !== undefined) {
      fields.push('statement_file_path = ?');
      values.push(data.statementFilePath);
      fields.push('statement_issued = ?');
      values.push(data.statementFilePath ? 1 : 0);
    }
    if (data.statementGroupId !== undefined) {
      fields.push('statement_group_id = ?');
      values.push(data.statementGroupId);
    }
    if (data.statementIssuedAt !== undefined) {
      fields.push('statement_issued_at = ?');
      values.push(data.statementIssuedAt);
    }
    if (data.statementDelivered !== undefined) {
      fields.push('statement_delivered = ?');
      values.push(data.statementDelivered ? 1 : 0);
    }
    if (data.paymentProofImage !== undefined) {
      fields.push('payment_proof_image = ?');
      values.push(data.paymentProofImage);
      fields.push('payment_received = ?');
      values.push(data.paymentProofImage ? 1 : 0);
    }
    if (data.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sortOrder);
    }
    if (data.isReservation !== undefined) {
      fields.push('is_reservation = ?');
      values.push(data.isReservation ? 1 : 0);
    }
    if (data.shopOrderId !== undefined) {
      fields.push('shop_order_id = ?');
      values.push(data.shopOrderId);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_order_lines SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async setProductArrivedByIds(lineIds: string[], productArrived: boolean): Promise<void> {
    if (lineIds.length === 0) return;

    const placeholders = lineIds.map(() => '?').join(', ');
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_order_lines SET product_arrived = ? WHERE id IN (${placeholders})`,
      [productArrived ? 1 : 0, ...lineIds]
    );
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM kr_shop_order_lines WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async countByShopOrderId(shopOrderId: string): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM kr_shop_order_lines WHERE shop_order_id = ?`,
      [shopOrderId]
    );
    return Number(rows[0]?.cnt) || 0;
  }

  private mapRow(row: ShopOrderLineRow): ShopOrderLine {
    return {
      id: row.id,
      lineOrderNumber: row.line_order_number,
      shopOrderId: row.shop_order_id,
      sortOrder: Number(row.sort_order) || 0,
      isReservation: Boolean(row.is_reservation),
      companyName: row.company_name,
      orderBoxCount: Number(row.order_box_count) || 0,
      quantityPerBox: Number(row.quantity_per_box) || 0,
      saleUnitPrice: row.sale_unit_price != null ? Number(row.sale_unit_price) : null,
      deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
      productSupplyAmount:
        row.product_supply_amount != null ? Number(row.product_supply_amount) : null,
      vatAmount: row.vat_amount != null ? Number(row.vat_amount) : null,
      totalAmount: row.total_amount != null ? Number(row.total_amount) : null,
      address: row.address,
      recipientName: row.recipient_name,
      phoneNumber: row.phone_number,
      trackingNumber: row.tracking_number,
      statementIssued: Boolean(row.statement_issued) || Boolean(row.statement_file_path),
      paymentReceived: Boolean(row.payment_received) || Boolean(row.payment_proof_image),
      productArrived: Boolean(row.product_arrived),
      taxInvoiceIssued: Boolean(row.tax_invoice_issued),
      cnyExchangeRate:
        row.cny_exchange_rate != null ? Number(row.cny_exchange_rate) : null,
      wkSettlementPaid: Boolean(row.wk_settlement_paid),
      inventioSettlementPaid: Boolean(row.inventio_settlement_paid),
      shipmentBoxCount:
        row.shipment_box_count != null ? Number(row.shipment_box_count) : null,
      logisticsFeePaid: Boolean(row.logistics_fee_paid),
      logisticsFeePaidAt: row.logistics_fee_paid_at,
      wkSettlementPaidAt: row.wk_settlement_paid_at,
      inventioSettlementPaidAt: row.inventio_settlement_paid_at,
      statementFilePath: row.statement_file_path,
      statementGroupId: row.statement_group_id,
      statementIssuedAt:
        row.statement_issued_at != null
          ? normalizeDateOnly(row.statement_issued_at)
          : null,
      statementDelivered: Boolean(row.statement_delivered),
      paymentProofImage: row.payment_proof_image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
