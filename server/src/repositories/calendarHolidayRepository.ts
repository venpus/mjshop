import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CalendarHolidayDTO {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
}

interface Row extends RowDataPacket {
  id: string;
  start_date: string;
  end_date: string;
  title: string;
}

function toDto(row: Row): CalendarHolidayDTO {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    title: row.title ?? '',
  };
}

export class CalendarHolidayRepository {
  /** 뷰포트 [from, to]와 겹치는 공휴일 (기간 겹침) */
  async findOverlappingRange(fromKey: string, toKey: string): Promise<CalendarHolidayDTO[]> {
    const [rows] = await pool.execute<Row[]>(
      `SELECT id,
              DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
              title
       FROM calendar_holidays
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY start_date ASC, id ASC`,
      [toKey, fromKey],
    );
    return rows.map(toDto);
  }

  async findById(id: string): Promise<CalendarHolidayDTO | null> {
    const [rows] = await pool.execute<Row[]>(
      `SELECT id,
              DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
              title
       FROM calendar_holidays
       WHERE id = ?`,
      [id],
    );
    if (rows.length === 0) return null;
    return toDto(rows[0]);
  }

  async create(data: {
    id: string;
    startDate: string;
    endDate: string;
    title: string;
    createdBy: string | null;
  }): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO calendar_holidays (id, start_date, end_date, title, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [data.id, data.startDate, data.endDate, data.title, data.createdBy],
    );
  }

  async update(
    id: string,
    data: { startDate: string; endDate: string; title: string },
  ): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE calendar_holidays SET start_date = ?, end_date = ?, title = ? WHERE id = ?`,
      [data.startDate, data.endDate, data.title, id],
    );
    return result.affectedRows > 0;
  }

  async deleteById(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM calendar_holidays WHERE id = ?`,
      [id],
    );
    return result.affectedRows > 0;
  }
}
