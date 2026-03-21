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
  pair_id: string | null;
  transit_days: number | null;
  paired_event_id: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const JOIN_PO = `schedule_events se
  LEFT JOIN purchase_orders po ON po.id = se.purchase_order_id`;

const PAIRED_JOIN = `LEFT JOIN schedule_events se_paired
  ON se_paired.pair_id = se.pair_id AND se_paired.id <> se.id`;

function normalizeKindFromDb(raw: unknown): ScheduleEventKind {
  const s = Buffer.isBuffer(raw)
    ? raw.toString('utf8').trim().toLowerCase()
    : String(raw ?? '')
        .trim()
        .toLowerCase();
  if (
    s === 'production' ||
    s === 'shipment' ||
    s === 'other' ||
    s === 'logistics_dispatch' ||
    s === 'korea_arrival_expected'
  ) {
    return s;
  }
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
    pairId: row.pair_id ?? null,
    transitDays: row.transit_days != null ? Number(row.transit_days) : null,
    pairedEventId: row.paired_event_id ?? null,
  };
}

const SELECT_FIELDS = `se.id, se.title,
              DATE_FORMAT(se.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(se.end_date, '%Y-%m-%d') AS end_date,
              se.kind, se.note, se.purchase_order_id,
              se.pair_id, se.transit_days,
              se_paired.id AS paired_event_id,
              po.po_number AS po_number, po.product_name AS product_name,
              se.created_by, se.created_at, se.updated_at`;

export class ScheduleEventRepository {
  /**
   * 뷰포트 [viewFrom, viewTo]와 겹치는 일정 (양 끝 날짜 포함)
   */
  async findOverlappingRange(viewFrom: string, viewTo: string): Promise<ScheduleEventDTO[]> {
    const [rows] = await pool.execute<Row[]>(
      `SELECT ${SELECT_FIELDS}
       FROM ${JOIN_PO}
       ${PAIRED_JOIN}
       WHERE se.start_date <= ? AND se.end_date >= ?
       ORDER BY se.start_date ASC, se.id ASC`,
      [viewTo, viewFrom],
    );
    return rows.map(toDto);
  }

  async findById(id: string): Promise<ScheduleEventDTO | null> {
    const [rows] = await pool.execute<Row[]>(
      `SELECT ${SELECT_FIELDS}
       FROM ${JOIN_PO}
       ${PAIRED_JOIN}
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
      pairId: string | null;
      transitDays: number | null;
      createdBy: string | null;
    },
  ): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO schedule_events (id, title, start_date, end_date, kind, note, purchase_order_id, pair_id, transit_days, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.title,
        data.startDateKey,
        data.endDateKey,
        data.kind,
        data.note,
        data.purchaseOrderId,
        data.pairId,
        data.transitDays,
        data.createdBy,
      ],
    );
  }

  /**
   * 물류발송 + 한국도착예정 2행 (동일 트랜잭션)
   */
  async createLogisticsDispatchWithArrival(params: {
    dispatchId: string;
    arrivalId: string;
    pairId: string;
    titleDispatch: string;
    titleArrival: string;
    dispatchStart: string;
    dispatchEnd: string;
    arrivalDateKey: string;
    transitDays: number;
    purchaseOrderId: string;
    note: string | null;
    createdBy: string | null;
  }): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute<ResultSetHeader>(
        `INSERT INTO schedule_events (id, title, start_date, end_date, kind, note, purchase_order_id, pair_id, transit_days, created_by)
         VALUES (?, ?, ?, ?, 'logistics_dispatch', ?, ?, ?, ?, ?)`,
        [
          params.dispatchId,
          params.titleDispatch,
          params.dispatchStart,
          params.dispatchEnd,
          params.note,
          params.purchaseOrderId,
          params.pairId,
          params.transitDays,
          params.createdBy,
        ],
      );
      await conn.execute<ResultSetHeader>(
        `INSERT INTO schedule_events (id, title, start_date, end_date, kind, note, purchase_order_id, pair_id, transit_days, created_by)
         VALUES (?, ?, ?, ?, 'korea_arrival_expected', ?, ?, ?, NULL, ?)`,
        [
          params.arrivalId,
          params.titleArrival,
          params.arrivalDateKey,
          params.arrivalDateKey,
          params.note,
          params.purchaseOrderId,
          params.pairId,
          params.createdBy,
        ],
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
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
      transitDays: number | null;
    },
  ): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE schedule_events
       SET title = ?, start_date = ?, end_date = ?, kind = ?, note = ?, purchase_order_id = ?, transit_days = ?
       WHERE id = ?`,
      [
        data.title,
        data.startDateKey,
        data.endDateKey,
        data.kind,
        data.note,
        data.purchaseOrderId,
        data.transitDays,
        id,
      ],
    );
    return result.affectedRows > 0;
  }

  async updateArrivalForPair(
    pairId: string,
    data: {
      startDateKey: string;
      endDateKey: string;
      title: string;
      purchaseOrderId: string | null;
      note: string | null;
    },
  ): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE schedule_events
       SET start_date = ?, end_date = ?, title = ?, purchase_order_id = ?, note = ?
       WHERE pair_id = ? AND kind = 'korea_arrival_expected'`,
      [
        data.startDateKey,
        data.endDateKey,
        data.title,
        data.purchaseOrderId,
        data.note,
        pairId,
      ],
    );
  }

  /** pair_id가 있으면 짝 행까지 함께 삭제 */
  async deleteById(id: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pair_id FROM schedule_events WHERE id = ?`,
      [id],
    );
    if (rows.length === 0) return false;
    const pairId = rows[0].pair_id as string | null;
    if (pairId) {
      const [result] = await pool.execute<ResultSetHeader>(
        `DELETE FROM schedule_events WHERE pair_id = ?`,
        [pairId],
      );
      return result.affectedRows > 0;
    }
    const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM schedule_events WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}
