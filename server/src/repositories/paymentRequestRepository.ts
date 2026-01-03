import { pool } from '../config/database.js';
import {
  PaymentRequest,
  CreatePaymentRequestDTO,
  UpdatePaymentRequestDTO,
  CompletePaymentRequestDTO,
  PaymentRequestFilter,
} from '../models/paymentRequest.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 데이터베이스에서 조회한 결과 타입
interface PaymentRequestRow extends RowDataPacket {
  id: number;
  request_number: string;
  source_type: string;
  source_id: string;
  payment_type: string;
  amount: number;
  status: string;
  request_date: Date;
  payment_date: Date | null;
  requested_by: string | null;
  completed_by: string | null;
  memo: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PaymentRequestRepository {
  /**
   * 다음 지급요청 번호 생성
   */
  async generateRequestNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT request_number 
       FROM payment_requests 
       WHERE request_number LIKE ? 
       ORDER BY request_number DESC 
       LIMIT 1`,
      [`PR-${currentYear}-%`]
    );

    let sequence = 1;
    if (rows.length > 0) {
      const lastNumber = rows[0].request_number;
      const lastSequence = parseInt(lastNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `PR-${currentYear}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * 모든 지급요청 조회 (필터 적용)
   */
  async findAll(filter?: PaymentRequestFilter): Promise<PaymentRequest[]> {
    let query = `SELECT id, request_number, source_type, source_id, payment_type, 
                        amount, status, request_date, payment_date, 
                        requested_by, completed_by, memo, created_at, updated_at
                 FROM payment_requests
                 WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.source_type) {
      query += ' AND source_type = ?';
      params.push(filter.source_type);
    }

    if (filter?.payment_type) {
      query += ' AND payment_type = ?';
      params.push(filter.payment_type);
    }

    if (filter?.start_date) {
      query += ' AND request_date >= ?';
      params.push(filter.start_date);
    }

    if (filter?.end_date) {
      query += ' AND request_date <= ?';
      params.push(filter.end_date);
    }

    if (filter?.search) {
      query += ' AND (request_number LIKE ? OR source_id LIKE ?)';
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY request_date DESC, created_at DESC';

    const [rows] = await pool.execute<PaymentRequestRow[]>(query, params);
    return rows.map(this.mapRowToPaymentRequest);
  }

  /**
   * ID로 지급요청 조회
   */
  async findById(id: number): Promise<PaymentRequest | null> {
    const [rows] = await pool.execute<PaymentRequestRow[]>(
      `SELECT id, request_number, source_type, source_id, payment_type, 
              amount, status, request_date, payment_date, 
              requested_by, completed_by, memo, created_at, updated_at
       FROM payment_requests
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentRequest(rows[0]);
  }

  /**
   * 출처 정보로 지급요청 조회
   */
  async findBySource(
    sourceType: string,
    sourceId: string,
    paymentType?: string
  ): Promise<PaymentRequest[]> {
    let query = `SELECT id, request_number, source_type, source_id, payment_type, 
                        amount, status, request_date, payment_date, 
                        requested_by, completed_by, memo, created_at, updated_at
                 FROM payment_requests
                 WHERE source_type = ? AND source_id = ?`;
    const params: any[] = [sourceType, sourceId];

    if (paymentType) {
      query += ' AND payment_type = ?';
      params.push(paymentType);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute<PaymentRequestRow[]>(query, params);
    return rows.map(this.mapRowToPaymentRequest);
  }

  /**
   * 지급요청 생성
   */
  async create(data: CreatePaymentRequestDTO): Promise<PaymentRequest> {
    const requestNumber = await this.generateRequestNumber();
    const requestDate = new Date().toISOString().split('T')[0];

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO payment_requests 
       (request_number, source_type, source_id, payment_type, amount, status, 
        request_date, requested_by, memo)
       VALUES (?, ?, ?, ?, ?, '요청중', ?, ?, ?)`,
      [
        requestNumber,
        data.source_type,
        data.source_id,
        data.payment_type,
        data.amount,
        requestDate,
        data.requested_by || null,
        data.memo || null,
      ]
    );

    const created = await this.findById(result.insertId);
    if (!created) {
      throw new Error('지급요청 생성 후 조회 실패');
    }

    return created;
  }

  /**
   * 지급요청 수정
   */
  async update(id: number, data: UpdatePaymentRequestDTO): Promise<PaymentRequest> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.memo !== undefined) {
      updates.push('memo = ?');
      params.push(data.memo);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('지급요청을 찾을 수 없습니다.');
      }
      return existing;
    }

    params.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE payment_requests 
       SET ${updates.join(', ')} 
       WHERE id = ?`,
      params
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('지급요청 수정 후 조회 실패');
    }

    return updated;
  }

  /**
   * 지급완료 처리
   */
  async complete(
    id: number,
    data: CompletePaymentRequestDTO
  ): Promise<PaymentRequest> {
    await pool.execute<ResultSetHeader>(
      `UPDATE payment_requests 
       SET status = '완료', payment_date = ?, completed_by = ?
       WHERE id = ?`,
      [data.payment_date, data.completed_by || null, id]
    );

    const completed = await this.findById(id);
    if (!completed) {
      throw new Error('지급완료 처리 후 조회 실패');
    }

    return completed;
  }

  /**
   * 일괄 지급완료 처리
   */
  async batchComplete(
    ids: number[],
    data: CompletePaymentRequestDTO
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE payment_requests 
       SET status = '완료', payment_date = ?, completed_by = ?
       WHERE id IN (${placeholders}) AND status = '요청중'`,
      [data.payment_date, data.completed_by || null, ...ids]
    );

    return result.affectedRows;
  }

  /**
   * 지급요청 삭제
   */
  async delete(id: number): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM payment_requests WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('지급요청을 찾을 수 없습니다.');
    }
  }

  /**
   * 데이터베이스 행을 PaymentRequest로 변환
   */
  private mapRowToPaymentRequest(row: PaymentRequestRow): PaymentRequest {
    return {
      id: row.id,
      request_number: row.request_number,
      source_type: row.source_type as 'purchase_order' | 'packing_list',
      source_id: row.source_id,
      payment_type: row.payment_type as 'advance' | 'balance' | 'shipping',
      amount: Number(row.amount),
      status: row.status as '요청중' | '완료',
      request_date: row.request_date,
      payment_date: row.payment_date,
      requested_by: row.requested_by,
      completed_by: row.completed_by,
      memo: row.memo,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

