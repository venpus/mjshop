import { pool } from '../config/database.js';
import { StockOutboundRecord, CreateStockOutboundRecordDTO, UpdateStockOutboundRecordDTO } from '../models/stockOutbound.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface StockOutboundRecordRow extends RowDataPacket {
  id: number;
  group_key: string;
  outbound_date: string;
  customer_name: string;
  quantity: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export class StockOutboundRepository {
  /**
   * 최근 출고 기록 목록 조회 (AI 검색용)
   */
  async findAll(limit: number = 50): Promise<StockOutboundRecord[]> {
    const [rows] = await pool.execute<StockOutboundRecordRow[]>(
      `SELECT id, group_key, outbound_date, customer_name, quantity,
              created_at, updated_at, created_by, updated_by
       FROM kr_stock_outbound_records
       ORDER BY outbound_date DESC, created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map(this.mapRowToRecord);
  }

  /**
   * groupKey로 출고 기록 목록 조회
   */
  async findByGroupKey(groupKey: string): Promise<StockOutboundRecord[]> {
    const [rows] = await pool.execute<StockOutboundRecordRow[]>(
      `SELECT id, group_key, outbound_date, customer_name, quantity, 
              created_at, updated_at, created_by, updated_by
       FROM kr_stock_outbound_records
       WHERE group_key = ?
       ORDER BY outbound_date DESC, created_at DESC`,
      [groupKey]
    );

    return rows.map(this.mapRowToRecord);
  }

  /**
   * ID로 출고 기록 조회
   */
  async findById(id: number): Promise<StockOutboundRecord | null> {
    const [rows] = await pool.execute<StockOutboundRecordRow[]>(
      `SELECT id, group_key, outbound_date, customer_name, quantity, 
              created_at, updated_at, created_by, updated_by
       FROM kr_stock_outbound_records
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(rows[0]);
  }

  /**
   * 출고 기록 생성
   */
  async create(data: CreateStockOutboundRecordDTO): Promise<StockOutboundRecord> {
    const { groupKey, outboundDate, customerName, quantity, createdBy } = data;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO kr_stock_outbound_records 
       (group_key, outbound_date, customer_name, quantity, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [groupKey, outboundDate, customerName, quantity, createdBy || null]
    );

    const record = await this.findById(result.insertId);
    if (!record) {
      throw new Error('출고 기록 생성 후 조회에 실패했습니다.');
    }

    return record;
  }

  /**
   * 출고 기록 수정
   */
  async update(id: number, data: UpdateStockOutboundRecordDTO): Promise<StockOutboundRecord> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.outboundDate !== undefined) {
      updates.push('outbound_date = ?');
      values.push(data.outboundDate);
    }
    if (data.customerName !== undefined) {
      updates.push('customer_name = ?');
      values.push(data.customerName);
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(data.quantity);
    }
    if (data.updatedBy !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updatedBy);
    }

    if (updates.length === 0) {
      const record = await this.findById(id);
      if (!record) {
        throw new Error('출고 기록을 찾을 수 없습니다.');
      }
      return record;
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE kr_stock_outbound_records 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      values
    );

    const record = await this.findById(id);
    if (!record) {
      throw new Error('출고 기록 수정 후 조회에 실패했습니다.');
    }

    return record;
  }

  /**
   * 출고 기록 삭제
   */
  async delete(id: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `DELETE FROM kr_stock_outbound_records 
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * groupKey로 출고 수량 합계 조회
   */
  async getTotalQuantityByGroupKey(groupKey: string): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(quantity), 0) as total_quantity
       FROM kr_stock_outbound_records
       WHERE group_key = ?`,
      [groupKey]
    );

    return rows[0]?.total_quantity || 0;
  }

  /**
   * DB Row를 StockOutboundRecord로 변환
   */
  private mapRowToRecord(row: StockOutboundRecordRow): StockOutboundRecord {
    return {
      id: row.id,
      groupKey: row.group_key,
      outboundDate: row.outbound_date,
      customerName: row.customer_name,
      quantity: row.quantity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}

