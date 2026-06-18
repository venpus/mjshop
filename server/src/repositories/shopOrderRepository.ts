import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  ShopOrder,
  ShopOrderStatus,
  UpdateShopOrderDTO,
} from '../models/shopOrder.js';
import { ShopOrderLineRepository } from './shopOrderLineRepository.js';
import type { ShopOrderLine } from '../models/shopOrderLine.js';

interface ShopOrderRow extends RowDataPacket {
  id: string;
  order_number: string;
  stock_inbound_item_id: number | null;
  purchase_order_id: string | null;
  product_id: string | null;
  product_name: string;
  product_main_image: string | null;
  unit_price: number | null;
  quantity: number;
  stock_quantity: number;
  warehouse_stock_quantity: number | null;
  selling_price: number | null;
  status: ShopOrderStatus;
  order_date: string | Date | null;
  note: string | null;
  company_name: string | null;
  order_box_count: number;
  quantity_per_box: number;
  sale_unit_price: number | null;
  delivery_fee: number | null;
  total_amount: number | null;
  address: string | null;
  recipient_name: string | null;
  phone_number: string | null;
  tracking_number: string | null;
  statement_issued: number;
  payment_received: number;
  product_arrived: number;
  statement_file_path: string | null;
  payment_proof_image: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export interface CreateShopOrderData {
  id: string;
  orderNumber: string;
  stockInboundItemId: number | null;
  purchaseOrderId: string | null;
  productId: string | null;
  productName: string;
  productMainImage: string | null;
  unitPrice: number | null;
  quantity: number;
  stockQuantity: number;
  sellingPrice: number | null;
  status: ShopOrderStatus;
  orderDate: string;
  createdBy?: string;
}

function normalizeOrderDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

const SHOP_ORDER_SELECT = `id, order_number, stock_inbound_item_id, purchase_order_id, product_id,
              product_name, product_main_image, unit_price, quantity, stock_quantity,
              warehouse_stock_quantity, selling_price, status, order_date, note,
              company_name, order_box_count, quantity_per_box, sale_unit_price,
              delivery_fee, total_amount, address, recipient_name, phone_number,
              tracking_number, statement_issued, payment_received, product_arrived,
              statement_file_path, payment_proof_image,
              created_at, updated_at, created_by`;

export class ShopOrderRepository {
  private lineRepository = new ShopOrderLineRepository();

  async findAll(): Promise<ShopOrder[]> {
    const [rows] = await pool.execute<ShopOrderRow[]>(
      `SELECT ${SHOP_ORDER_SELECT}
       FROM kr_shop_orders
       ORDER BY created_at DESC`
    );
    const orders = rows.map(this.mapRow);
    return this.attachLinesToOrders(orders);
  }

  async findById(id: string): Promise<ShopOrder | null> {
    const [rows] = await pool.execute<ShopOrderRow[]>(
      `SELECT ${SHOP_ORDER_SELECT}
       FROM kr_shop_orders
       WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    const order = this.mapRow(rows[0]);
    order.lines = await this.lineRepository.findByShopOrderId(id);
    order.lineCount = order.lines.length;
    return order;
  }

  async findByStockInboundItemId(stockInboundItemId: number): Promise<ShopOrder | null> {
    const [rows] = await pool.execute<ShopOrderRow[]>(
      `SELECT ${SHOP_ORDER_SELECT}
       FROM kr_shop_orders
       WHERE stock_inbound_item_id = ?`,
      [stockInboundItemId]
    );
    if (rows.length === 0) return null;
    const order = this.mapRow(rows[0]);
    order.lines = await this.lineRepository.findByShopOrderId(order.id);
    order.lineCount = order.lines.length;
    return order;
  }

  async getNextOrderNumber(): Promise<string> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT order_number FROM kr_shop_orders
       WHERE order_number LIKE 'ORD-%'
       ORDER BY CAST(SUBSTRING(order_number, 5) AS UNSIGNED) DESC
       LIMIT 1`
    );

    if (rows.length === 0) {
      return 'ORD-001';
    }

    const last = String(rows[0].order_number);
    const match = last.match(/^ORD-(\d+)$/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
    return `ORD-${String(nextNum).padStart(3, '0')}`;
  }

  async create(data: CreateShopOrderData): Promise<ShopOrder> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO kr_shop_orders
       (id, order_number, stock_inbound_item_id, purchase_order_id, product_id,
        product_name, product_main_image, unit_price, quantity, stock_quantity,
        selling_price, status, order_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.orderNumber,
        data.stockInboundItemId,
        data.purchaseOrderId,
        data.productId,
        data.productName,
        data.productMainImage,
        data.unitPrice,
        data.quantity,
        data.stockQuantity,
        data.sellingPrice,
        data.status,
        data.orderDate,
        data.createdBy ?? null,
      ]
    );

    const created = await this.findById(data.id);
    if (!created) {
      throw new Error('주문 생성 후 조회에 실패했습니다.');
    }
    return created;
  }

  async update(id: string, data: UpdateShopOrderDTO): Promise<ShopOrder | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.productName !== undefined) {
      fields.push('product_name = ?');
      values.push(data.productName);
    }
    if (data.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(data.quantity);
    }
    if (data.unitPrice !== undefined) {
      fields.push('unit_price = ?');
      values.push(data.unitPrice);
    }
    if (data.warehouseStockQuantity !== undefined) {
      fields.push('warehouse_stock_quantity = ?');
      values.push(data.warehouseStockQuantity);
    }
    if (data.sellingPrice !== undefined) {
      fields.push('selling_price = ?');
      values.push(data.sellingPrice);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.orderDate !== undefined) {
      fields.push('order_date = ?');
      values.push(data.orderDate);
    }
    if (data.note !== undefined) {
      fields.push('note = ?');
      values.push(data.note);
    }
    if (data.quantityPerBox !== undefined) {
      fields.push('quantity_per_box = ?');
      values.push(data.quantityPerBox);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM kr_shop_orders WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async syncStockQuantityFromInbound(stockInboundItemId: number, stockQuantity: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_orders SET stock_quantity = ? WHERE stock_inbound_item_id = ?`,
      [stockQuantity, stockInboundItemId]
    );
  }

  async syncQuantityFromLines(shopOrderId: string): Promise<number> {
    const lines = await this.lineRepository.findByShopOrderId(shopOrderId);
    const totalQuantity = lines.reduce(
      (sum, line) => sum + line.orderBoxCount * line.quantityPerBox,
      0
    );
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_orders SET quantity = ? WHERE id = ?`,
      [totalQuantity, shopOrderId]
    );
    return totalQuantity;
  }

  async updateStockQuantity(id: string, stockQuantity: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_orders SET stock_quantity = ? WHERE id = ?`,
      [stockQuantity, id]
    );
  }

  getLineRepository(): ShopOrderLineRepository {
    return this.lineRepository;
  }

  private synthesizeLegacyLine(order: ShopOrder): ShopOrderLine | null {
    const hasLegacyData =
      Boolean(order.companyName?.trim()) ||
      order.orderBoxCount > 0 ||
      Boolean(order.address?.trim()) ||
      Boolean(order.recipientName?.trim()) ||
      Boolean(order.phoneNumber?.trim()) ||
      Boolean(order.trackingNumber?.trim()) ||
      order.saleUnitPrice != null ||
      order.deliveryFee != null;

    if (!hasLegacyData) {
      return null;
    }

    return {
      id: `${order.id}-legacy-line`,
      lineOrderNumber: null,
      shopOrderId: order.id,
      sortOrder: 0,
      isReservation: false,
      companyName: order.companyName,
      orderBoxCount: order.orderBoxCount,
      quantityPerBox: order.quantityPerBox,
      saleUnitPrice: order.saleUnitPrice,
      deliveryFee: order.deliveryFee,
      productSupplyAmount: null,
      vatAmount: null,
      totalAmount: order.totalAmount,
      address: order.address,
      recipientName: order.recipientName,
      phoneNumber: order.phoneNumber,
      trackingNumber: order.trackingNumber,
      statementIssued: order.statementIssued,
      paymentReceived: order.paymentReceived,
      productArrived: order.productArrived,
      taxInvoiceIssued: false,
      vatExempt: false,
      shippingReady: false,
      cnyExchangeRate: null,
      wkSettlementPaid: false,
      inventioSettlementPaid: false,
      shipmentBoxCount: null,
      logisticsFeePaid: false,
      logisticsFeePaidAt: null,
      wkSettlementPaidAt: null,
      inventioSettlementPaidAt: null,
      statementFilePath: order.statementFilePath,
      statementGroupId: null,
      statementIssuedAt: null,
      statementDelivered: false,
      paymentProofImage: order.paymentProofImage,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private async attachLinesToOrders(orders: ShopOrder[]): Promise<ShopOrder[]> {
    if (orders.length === 0) return orders;

    const ids = orders.map((order) => order.id);
    const allLines = await this.lineRepository.findByShopOrderIds(ids);
    const linesByOrderId = new Map<string, ShopOrderLine[]>();

    for (const line of allLines) {
      const list = linesByOrderId.get(line.shopOrderId) ?? [];
      list.push(line);
      linesByOrderId.set(line.shopOrderId, list);
    }

    return orders.map((order) => {
      let lines = linesByOrderId.get(order.id) ?? [];

      if (lines.length === 0) {
        const legacyLine = this.synthesizeLegacyLine(order);
        if (legacyLine) {
          lines = [legacyLine];
        }
      }

      const totalProductSupplyAmount = lines.reduce(
        (sum, line) => sum + (line.productSupplyAmount ?? 0),
        0
      );
      const totalSalesAmount = lines.reduce(
        (sum, line) => sum + (line.totalAmount ?? 0),
        0
      );

      return {
        ...order,
        lines,
        lineCount: lines.length,
        totalProductSupplyAmount,
        totalSalesAmount,
      };
    });
  }

  private mapRow(row: ShopOrderRow): ShopOrder {
    const lines: ShopOrderLine[] = [];
    return {
      id: row.id,
      orderNumber: row.order_number,
      stockInboundItemId: row.stock_inbound_item_id,
      purchaseOrderId: row.purchase_order_id,
      productId: row.product_id,
      productName: row.product_name,
      productMainImage: row.product_main_image,
      unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
      quantity: Number(row.quantity) || 0,
      stockQuantity: Number(row.stock_quantity) || 0,
      warehouseStockQuantity:
        row.warehouse_stock_quantity != null ? Number(row.warehouse_stock_quantity) : 0,
      sellingPrice: row.selling_price != null ? Number(row.selling_price) : null,
      status: row.status,
      orderDate: normalizeOrderDate(row.order_date),
      note: row.note,
      quantityPerBox: Number(row.quantity_per_box) || 0,
      companyName: row.company_name,
      orderBoxCount: Number(row.order_box_count) || 0,
      saleUnitPrice: row.sale_unit_price != null ? Number(row.sale_unit_price) : null,
      deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
      totalAmount: row.total_amount != null ? Number(row.total_amount) : null,
      address: row.address,
      recipientName: row.recipient_name,
      phoneNumber: row.phone_number,
      trackingNumber: row.tracking_number,
      statementIssued: Boolean(row.statement_issued) || Boolean(row.statement_file_path),
      paymentReceived: Boolean(row.payment_received) || Boolean(row.payment_proof_image),
      productArrived: Boolean(row.product_arrived),
      statementFilePath: row.statement_file_path,
      paymentProofImage: row.payment_proof_image,
      lines,
      lineCount: 0,
      totalSalesAmount: 0,
      totalProductSupplyAmount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
