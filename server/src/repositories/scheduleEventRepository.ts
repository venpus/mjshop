import { pool } from '../config/database.js';
import type { ScheduleEventDTO, ScheduleEventKind } from '../models/scheduleEvent.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Row extends RowDataPacket {
  id: string;
  title: string;
  /** 항상 YYYY-MM-DD (DATE_FORMAT으로 조회, JSON/타임존 이슈 방지) */
  start_date: string;
  end_date: string;
  kind: ScheduleEventKind;
  note: string | null;
  purchase_order_id: string | null;
  po_number: string | null;
  product_name: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const JOIN_PO = `schedule_events se
  LEFT JOIN purchase_orders po ON po.id = se.purchase_order_id`;

function normalizeKindFromDb(raw: unknown): ScheduleEventKind {
  const s = Buffer.isBuffer(raw)
    ? raw.toString('utf8').trim().toLowerCase()
    : String(raw ?? '')
        .trim()
        .toLowerCase();
  if (s === 'production' || s === 'shipment' || s === 'other') return s;
  return 'other';
}

function toDto(row: Row): ScheduleEventDTO {
  return {
    id: row.id,
    title: row.title,
    startDateKey: row.start_date,
    endDateKey: row.end_date,
    kind: normalizeKindFromDb(row.kind),
    note: row.note,
    purchaseOrderId: row.purchase_order_id ?? null,
    poNumber: row.po_number ?? null,
    productName: row.product_name ?? null,
  };
}

export class ScheduleEventRepository {
  /**
   * 뷰포트 [viewFrom, viewTo]와 겹치는 일정 (양 끝 날짜 포함)
   */
  async findOverlappingRange(viewFrom: string, viewTo: string): Promise<ScheduleEventDTO[]> {
    const [rows] = await pool.execute<Row[]>(
      `SELECT se.id, se.title,
              DATE_FORMAT(se.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(se.end_date, '%Y-%m-%d') AS end_date,
              se.kind, se.note, se.purchase_order_id,
              po.po_number AS po_number, po.product_name AS product_name,
              se.created_by, se.created_at, se.updated_at
       FROM ${JOIN_PO}
       WHERE se.start_date <= ? AND se.end_date >= ?
       ORDER BY se.start_date ASC, se.id ASC`,
      [viewTo, viewFrom],
    );
    return rows.map(toDto);
  }

  async findById(id: string): Promise<ScheduleEventDTO | null> {
    const [rows] = await pool.execute<Row[]>(
      `SELECT se.id, se.title,
              DATE_FORMAT(se.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(se.end_date, '%Y-%m-%d') AS end_date,
              se.kind, se.note, se.purchase_order_id,
              po.po_number AS po_number, po.product_name AS product_name,
              se.created_by, se.created_at, se.updated_at
       FROM ${JOIN_PO}
       WHERE se.id = ?`,
      [id],
    );
    if (rows.length === 0) return null;
    return toDto(rows[0]);
  }

  async create(
    data: {
      id: string;
      title: string;
      startDateKey: string;
      endDateKey: string;
      kind: ScheduleEventKind;
      note: string | null;
      purchaseOrderId: string | null;
      createdBy: string | null;
    },
  ): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO schedule_events (id, title, start_date, end_date, kind, note, purchase_order_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.title,
        data.startDateKey,
        data.endDateKey,
        data.kind,
        data.note,
        data.purchaseOrderId,
        data.createdBy,
      ],
    );
  }

  async update(
    id: string,
    data: {
      title: string;
      startDateKey: string;
      endDateKey: string;
      kind: ScheduleEventKind;
      note: string | null;
      purchaseOrderId: string | null;
    },
  ): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE schedule_events
       SET title = ?, start_date = ?, end_date = ?, kind = ?, note = ?, purchase_order_id = ?
       WHERE id = ?`,
      [data.title, data.startDateKey, data.endDateKey, data.kind, data.note, data.purchaseOrderId, id],
    );
    return result.affectedRows > 0;
  }

  async deleteById(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM schedule_events WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}
