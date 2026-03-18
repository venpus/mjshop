import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface PaymentMiscEntryRow extends RowDataPacket {
  id: number;
  entry_date: string;
  description: string | null;
  amount_cny: string;
  is_completed: number;
  file_relative_path: string | null;
  original_filename: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentMiscEntryDTO {
  id: number;
  entry_date: string;
  description: string | null;
  amount_cny: number;
  is_completed: boolean;
  file_relative_path: string | null;
  original_filename: string | null;
  created_at: string;
  updated_at: string;
}

/** MySQL DATE·JS Date·문자열 → YYYY-MM-DD (로컬 달력 기준) */
export function normalizeEntryDateYmd(v: unknown): string {
  if (v == null || v === '') {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function rowToDTO(r: PaymentMiscEntryRow): PaymentMiscEntryDTO {
  return {
    id: r.id,
    entry_date: normalizeEntryDateYmd(r.entry_date as unknown),
    description: r.description,
    amount_cny: Number(r.amount_cny),
    is_completed: Boolean(r.is_completed),
    file_relative_path: r.file_relative_path,
    original_filename: r.original_filename,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

export class PaymentMiscEntryRepository {
  /** 등록된 별도처리 금액 합계(위안) */
  async sumTotalCny(): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount_cny), 0) AS total FROM payment_misc_entries`
    );
    const t = rows[0]?.total;
    return t != null ? Number(t) : 0;
  }

  async findAll(): Promise<PaymentMiscEntryDTO[]> {
    const [rows] = await pool.execute<PaymentMiscEntryRow[]>(
      `SELECT id, entry_date, description, amount_cny, is_completed,
              file_relative_path, original_filename, created_at, updated_at
       FROM payment_misc_entries
       ORDER BY entry_date DESC, id DESC`
    );
    return rows.map(rowToDTO);
  }

  async findById(id: number): Promise<PaymentMiscEntryDTO | null> {
    const [rows] = await pool.execute<PaymentMiscEntryRow[]>(
      `SELECT id, entry_date, description, amount_cny, is_completed,
              file_relative_path, original_filename, created_at, updated_at
       FROM payment_misc_entries WHERE id = ?`,
      [id]
    );
    return rows[0] ? rowToDTO(rows[0]) : null;
  }

  async create(data: {
    entry_date: string;
    description?: string | null;
    amount_cny?: number;
    is_completed?: boolean;
  }): Promise<number> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO payment_misc_entries (entry_date, description, amount_cny, is_completed)
       VALUES (?, ?, ?, ?)`,
      [
        data.entry_date.slice(0, 10),
        data.description ?? null,
        data.amount_cny ?? 0,
        data.is_completed ? 1 : 0,
      ]
    );
    return res.insertId;
  }

  async update(
    id: number,
    data: Partial<{
      entry_date: string;
      description: string | null;
      amount_cny: number;
      is_completed: boolean;
      file_relative_path: string | null;
      original_filename: string | null;
    }>
  ): Promise<boolean> {
    const fields: string[] = [];
    const vals: unknown[] = [];
    if (data.entry_date !== undefined) {
      fields.push('entry_date = ?');
      vals.push(normalizeEntryDateYmd(data.entry_date));
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      vals.push(data.description);
    }
    if (data.amount_cny !== undefined) {
      fields.push('amount_cny = ?');
      vals.push(data.amount_cny);
    }
    if (data.is_completed !== undefined) {
      fields.push('is_completed = ?');
      vals.push(data.is_completed ? 1 : 0);
    }
    if (data.file_relative_path !== undefined) {
      fields.push('file_relative_path = ?');
      vals.push(data.file_relative_path);
    }
    if (data.original_filename !== undefined) {
      fields.push('original_filename = ?');
      vals.push(data.original_filename);
    }
    if (fields.length === 0) return true;
    vals.push(id);
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE payment_misc_entries SET ${fields.join(', ')} WHERE id = ?`,
      vals
    );
    return res.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      `DELETE FROM payment_misc_entries WHERE id = ?`,
      [id]
    );
    return res.affectedRows > 0;
  }
}
