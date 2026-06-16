import { pool } from '../config/database.js';
import {
  StockInboundItem,
  AvailablePurchaseOrderForInbound,
} from '../models/stockInbound.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface StockInboundItemRow extends RowDataPacket {
  id: number;
  purchase_order_id: string;
  group_key: string;
  product_id: string | null;
  product_name: string;
  po_number: string | null;
  product_main_image: string | null;
  unit_price: number | null;
  inbound_quantity: number;
  selling_price: number | null;
  stock_quantity: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

interface AvailablePurchaseOrderRow extends RowDataPacket {
  id: string;
  po_number: string;
  product_name: string;
  product_main_image: string | null;
  product_id: string | null;
  quantity: number;
  arrived_quantity: number;
  unit_price: number | null;
  order_unit_price: number | null;
  expected_final_unit_price: number | null;
  selling_price: number | null;
}

export interface UpdateStockInboundQuantitiesData {
  inboundQuantity: number;
  stockQuantity: number;
  unitPrice?: number | null;
  sellingPrice?: number | null;
  productMainImage?: string | null;
  productName?: string;
  poNumber?: string | null;
  productId?: string | null;
}

export interface CreateStockInboundItemData {
  purchaseOrderId: string;
  groupKey: string;
  productId: string | null;
  productName: string;
  poNumber: string | null;
  productMainImage: string | null;
  unitPrice: number | null;
  inboundQuantity: number;
  sellingPrice: number | null;
  stockQuantity: number;
  createdBy?: string;
}

export class StockInboundRepository {
  async findAll(): Promise<StockInboundItem[]> {
    const [rows] = await pool.execute<StockInboundItemRow[]>(
      `SELECT inbound.id, inbound.purchase_order_id, inbound.group_key, inbound.product_id,
              inbound.product_name, inbound.po_number, inbound.product_main_image, inbound.unit_price,
              inbound.inbound_quantity, inbound.selling_price, inbound.stock_quantity,
              inbound.created_at, inbound.updated_at, inbound.created_by
       FROM kr_stock_inbound_items inbound
       LEFT JOIN kr_shop_orders shop_order ON shop_order.stock_inbound_item_id = inbound.id
       WHERE shop_order.id IS NULL
       ORDER BY inbound.created_at DESC`
    );
    return rows.map(this.mapRowToItem);
  }

  async findByPurchaseOrderId(purchaseOrderId: string): Promise<StockInboundItem | null> {
    const [rows] = await pool.execute<StockInboundItemRow[]>(
      `SELECT id, purchase_order_id, group_key, product_id, product_name, po_number,
              product_main_image, unit_price, inbound_quantity, selling_price, stock_quantity,
              created_at, updated_at, created_by
       FROM kr_stock_inbound_items
       WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    );
    return rows.length > 0 ? this.mapRowToItem(rows[0]) : null;
  }

  async findById(id: number): Promise<StockInboundItem | null> {
    const [rows] = await pool.execute<StockInboundItemRow[]>(
      `SELECT id, purchase_order_id, group_key, product_id, product_name, po_number,
              product_main_image, unit_price, inbound_quantity, selling_price, stock_quantity,
              created_at, updated_at, created_by
       FROM kr_stock_inbound_items
       WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? this.mapRowToItem(rows[0]) : null;
  }

  async findAvailablePurchaseOrders(
    searchTerm?: string,
    limit?: number,
    offset?: number
  ): Promise<{ items: AvailablePurchaseOrderForInbound[]; total: number }> {
    let whereClause = `inbound.id IS NULL AND po.order_status != '취소됨'`;
    const params: unknown[] = [];

    if (searchTerm?.trim()) {
      const pattern = `%${searchTerm.trim()}%`;
      whereClause += ` AND (po.po_number LIKE ? OR po.product_name LIKE ? OR po.product_name_chinese LIKE ?)`;
      params.push(pattern, pattern, pattern);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM purchase_orders po
       LEFT JOIN kr_stock_inbound_items inbound ON po.id = inbound.purchase_order_id
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total) || 0;

    let query = `
      SELECT po.id, po.po_number, po.product_name, po.product_main_image, po.product_id,
             po.quantity, po.unit_price, po.order_unit_price, po.expected_final_unit_price,
             COALESCE(summary.arrived_quantity, 0) AS arrived_quantity,
             p.price AS selling_price
      FROM purchase_orders po
      LEFT JOIN kr_stock_inbound_items inbound ON po.id = inbound.purchase_order_id
      LEFT JOIN v_purchase_order_shipping_summary summary ON po.id = summary.purchase_order_id
      LEFT JOIN products p ON po.product_id = p.id
      WHERE ${whereClause}
      ORDER BY po.order_date DESC, po.created_at DESC`;

    const queryParams = [...params];
    if (limit !== undefined) {
      query += ` LIMIT ?`;
      queryParams.push(limit);
      if (offset !== undefined) {
        query += ` OFFSET ?`;
        queryParams.push(offset);
      }
    }

    const [rows] = await pool.execute<AvailablePurchaseOrderRow[]>(query, queryParams);

    return {
      items: rows.map((row) => ({
        id: row.id,
        poNumber: row.po_number,
        productName: row.product_name,
        productMainImage: row.product_main_image,
        productId: row.product_id,
        quantity: Number(row.quantity) || 0,
        arrivedQuantity: Number(row.arrived_quantity) || 0,
        unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
        orderUnitPrice: row.order_unit_price != null ? Number(row.order_unit_price) : null,
        expectedFinalUnitPrice:
          row.expected_final_unit_price != null ? Number(row.expected_final_unit_price) : null,
        sellingPrice: row.selling_price != null ? Number(row.selling_price) : null,
      })),
      total,
    };
  }

  async findByGroupKey(groupKey: string): Promise<StockInboundItem | null> {
    const [rows] = await pool.execute<StockInboundItemRow[]>(
      `SELECT id, purchase_order_id, group_key, product_id, product_name, po_number,
              product_main_image, unit_price, inbound_quantity, selling_price, stock_quantity,
              created_at, updated_at, created_by
       FROM kr_stock_inbound_items
       WHERE group_key = ?`,
      [groupKey]
    );
    return rows.length > 0 ? this.mapRowToItem(rows[0]) : null;
  }

  async findPurchaseOrderForInboundById(
    purchaseOrderId: string
  ): Promise<AvailablePurchaseOrderForInbound | null> {
    const [rows] = await pool.execute<AvailablePurchaseOrderRow[]>(
      `SELECT po.id, po.po_number, po.product_name, po.product_main_image, po.product_id,
              po.quantity, po.unit_price, po.order_unit_price, po.expected_final_unit_price,
              COALESCE(summary.arrived_quantity, 0) AS arrived_quantity,
              p.price AS selling_price
       FROM purchase_orders po
       LEFT JOIN kr_stock_inbound_items inbound ON po.id = inbound.purchase_order_id
       LEFT JOIN v_purchase_order_shipping_summary summary ON po.id = summary.purchase_order_id
       LEFT JOIN products p ON po.product_id = p.id
       WHERE po.id = ? AND inbound.id IS NULL AND po.order_status != '취소됨'`,
      [purchaseOrderId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      poNumber: row.po_number,
      productName: row.product_name,
      productMainImage: row.product_main_image,
      productId: row.product_id,
      quantity: Number(row.quantity) || 0,
      arrivedQuantity: Number(row.arrived_quantity) || 0,
      unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
      orderUnitPrice: row.order_unit_price != null ? Number(row.order_unit_price) : null,
      expectedFinalUnitPrice:
        row.expected_final_unit_price != null ? Number(row.expected_final_unit_price) : null,
      sellingPrice: row.selling_price != null ? Number(row.selling_price) : null,
    };
  }

  async findPurchaseOrderForSync(
    purchaseOrderId: string
  ): Promise<AvailablePurchaseOrderForInbound | null> {
    const [rows] = await pool.execute<AvailablePurchaseOrderRow[]>(
      `SELECT po.id, po.po_number, po.product_name, po.product_main_image, po.product_id,
              po.quantity, po.unit_price, po.order_unit_price, po.expected_final_unit_price,
              COALESCE(summary.arrived_quantity, 0) AS arrived_quantity,
              p.price AS selling_price
       FROM purchase_orders po
       LEFT JOIN v_purchase_order_shipping_summary summary ON po.id = summary.purchase_order_id
       LEFT JOIN products p ON po.product_id = p.id
       WHERE po.id = ? AND po.order_status != '취소됨'`,
      [purchaseOrderId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      poNumber: row.po_number,
      productName: row.product_name,
      productMainImage: row.product_main_image,
      productId: row.product_id,
      quantity: Number(row.quantity) || 0,
      arrivedQuantity: Number(row.arrived_quantity) || 0,
      unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
      orderUnitPrice: row.order_unit_price != null ? Number(row.order_unit_price) : null,
      expectedFinalUnitPrice:
        row.expected_final_unit_price != null ? Number(row.expected_final_unit_price) : null,
      sellingPrice: row.selling_price != null ? Number(row.selling_price) : null,
    };
  }

  async updateQuantities(
    id: number,
    data: UpdateStockInboundQuantitiesData
  ): Promise<StockInboundItem> {
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_stock_inbound_items
       SET inbound_quantity = ?,
           stock_quantity = ?,
           unit_price = COALESCE(?, unit_price),
           selling_price = COALESCE(?, selling_price),
           product_main_image = COALESCE(?, product_main_image),
           product_name = COALESCE(?, product_name),
           po_number = COALESCE(?, po_number),
           product_id = COALESCE(?, product_id)
       WHERE id = ?`,
      [
        data.inboundQuantity,
        data.stockQuantity,
        data.unitPrice ?? null,
        data.sellingPrice ?? null,
        data.productMainImage ?? null,
        data.productName ?? null,
        data.poNumber ?? null,
        data.productId ?? null,
        id,
      ]
    );

    const [rows] = await pool.execute<StockInboundItemRow[]>(
      `SELECT id, purchase_order_id, group_key, product_id, product_name, po_number,
              product_main_image, unit_price, inbound_quantity, selling_price, stock_quantity,
              created_at, updated_at, created_by
       FROM kr_stock_inbound_items WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      throw new Error('입고 항목 수정 후 조회에 실패했습니다.');
    }

    return this.mapRowToItem(rows[0]);
  }

  async deleteByPurchaseOrderId(purchaseOrderId: string): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `DELETE FROM kr_stock_inbound_items WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    );
  }

  async create(data: CreateStockInboundItemData): Promise<StockInboundItem> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO kr_stock_inbound_items
       (purchase_order_id, group_key, product_id, product_name, po_number, product_main_image,
        unit_price, inbound_quantity, selling_price, stock_quantity, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.purchaseOrderId,
        data.groupKey,
        data.productId,
        data.productName,
        data.poNumber,
        data.productMainImage,
        data.unitPrice,
        data.inboundQuantity,
        data.sellingPrice,
        data.stockQuantity,
        data.createdBy ?? null,
      ]
    );

    const [rows] = await pool.execute<StockInboundItemRow[]>(
      `SELECT id, purchase_order_id, group_key, product_id, product_name, po_number,
              product_main_image, unit_price, inbound_quantity, selling_price, stock_quantity,
              created_at, updated_at, created_by
       FROM kr_stock_inbound_items WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('입고 항목 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToItem(rows[0]);
  }

  async updateStockQuantity(id: number, stockQuantity: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_stock_inbound_items SET stock_quantity = ? WHERE id = ?`,
      [stockQuantity, id]
    );
  }

  async updateUnitPrice(id: number, unitPrice: number | null): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE kr_stock_inbound_items SET unit_price = ? WHERE id = ?`,
      [unitPrice, id]
    );
  }

  private mapRowToItem(row: StockInboundItemRow): StockInboundItem {
    return {
      id: row.id,
      purchaseOrderId: row.purchase_order_id,
      groupKey: row.group_key,
      productId: row.product_id,
      productName: row.product_name,
      poNumber: row.po_number,
      productMainImage: row.product_main_image,
      unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
      inboundQuantity: Number(row.inbound_quantity) || 0,
      sellingPrice: row.selling_price != null ? Number(row.selling_price) : null,
      stockQuantity: Number(row.stock_quantity) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
