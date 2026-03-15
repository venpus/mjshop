import { pool } from '../config/database.js';
import { AccessLogWithUserName, CreateAccessLogDTO } from '../models/accessLog.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface AccessLogRow extends RowDataPacket {
  id: number;
  user_id: string;
  accessed_at: Date;
  ip: string | null;
  url: string;
  device: string;
  device_model: string | null;
  event_type: string;
  user_name: string;
}

export interface AccessLogListFilters {
  userName?: string;
  /** true면 admin_accounts에 없는 user_id 접속 로그만 조회 */
  othersOnly?: boolean;
  /** true면 event_type = 'login' 인 로그만 조회 (기본: true) */
  loginOnly?: boolean;
}

export class AccessLogRepository {
  async create(dto: CreateAccessLogDTO): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO access_logs (user_id, accessed_at, ip, url, device, device_model, event_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.user_id,
        dto.accessed_at,
        dto.ip,
        dto.url,
        dto.device,
        dto.device_model ?? null,
        dto.event_type,
      ]
    );
    return result.insertId;
  }

  async findWithFilter(
    filters: AccessLogListFilters,
    limit: number,
    offset: number
  ): Promise<AccessLogWithUserName[]> {
    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];
    if (filters.loginOnly !== false) {
      conditions.push("l.event_type = 'login'");
    }
    if (filters.othersOnly) {
      conditions.push('l.user_id NOT IN (SELECT id FROM admin_accounts)');
    } else if (filters.userName && filters.userName.trim()) {
      conditions.push('a.name LIKE ?');
      params.push(`%${filters.userName.trim()}%`);
    }
    const where = conditions.join(' AND ');
    const [rows] = await pool.execute<AccessLogRow[]>(
      `SELECT l.id, l.user_id, l.accessed_at, l.ip, l.url, l.device, l.device_model, l.event_type, a.name AS user_name
       FROM access_logs l
       LEFT JOIN admin_accounts a ON a.id = l.user_id
       WHERE ${where}
       ORDER BY l.accessed_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      accessed_at: r.accessed_at,
      ip: r.ip,
      url: r.url,
      device: r.device as 'PC' | 'Mobile',
      device_model: r.device_model ?? null,
      event_type: (r.event_type === 'login' ? 'login' : 'access') as 'login' | 'access',
      user_name: r.user_name ?? r.user_id,
    }));
  }

  async countWithFilter(filters: AccessLogListFilters): Promise<number> {
    const conditions: string[] = ['1=1'];
    const params: string[] = [];
    if (filters.loginOnly !== false) {
      conditions.push("l.event_type = 'login'");
    }
    if (filters.othersOnly) {
      conditions.push('l.user_id NOT IN (SELECT id FROM admin_accounts)');
    } else if (filters.userName && filters.userName.trim()) {
      conditions.push('a.name LIKE ?');
      params.push(`%${filters.userName.trim()}%`);
    }
    const where = conditions.join(' AND ');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM access_logs l
       LEFT JOIN admin_accounts a ON a.id = l.user_id
       WHERE ${where}`,
      params
    );
    return Number(rows[0]?.total ?? 0);
  }

  /** 접속 시각이 before 이전인 로그 삭제. 삭제된 행 수 반환. */
  async deleteOlderThan(before: Date): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM access_logs WHERE accessed_at < ?`,
      [before]
    );
    return result.affectedRows;
  }
}
