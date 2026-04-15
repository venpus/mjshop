import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/** JSON 배열에 저장된 토큰이 검색어(코드만 또는 code::…)와 일치하는지 */
export function packingListJsonElementMatchesQuery(element: string, query: string): boolean {
  const el = String(element).trim();
  const q = String(query).trim();
  if (!el || !q) return false;
  if (el === q) return true;
  if (!q.includes('::')) {
    return el.startsWith(`${q}::`);
  }
  return false;
}

export interface SweetTrackerInvoiceCacheListRow extends RowDataPacket {
  invoice_no: string;
  is_delivery_complete: number;
  last_kind: string | null;
  last_where: string | null;
  last_time_string: string | null;
  packing_list_codes_json: string | null;
}

export interface SweetTrackerInvoiceCacheRow extends RowDataPacket {
  t_code: string;
  invoice_no: string;
  is_delivery_complete: number;
  item_name: string | null;
  receiver_name: string | null;
  sender_name: string | null;
  level_code: number | null;
  last_kind: string | null;
  last_where: string | null;
  last_time_string: string | null;
}

export interface SweetTrackerInvoiceCacheUpsert {
  t_code: string;
  invoice_no: string;
  is_delivery_complete: boolean;
  item_name: string;
  receiver_name: string;
  sender_name: string;
  level_code: number | null;
  last_kind: string;
  last_where: string;
  last_time_string: string;
}

export class SweetTrackerInvoiceCacheRepository {
  /**
   * t_code + 운송장 목록에 해당하는 캐시 행 조회 (없는 번호는 맵에 없음)
   */
  async findByTCodeAndInvoices(tCode: string, invoices: string[]): Promise<Map<string, SweetTrackerInvoiceCacheRow>> {
    const map = new Map<string, SweetTrackerInvoiceCacheRow>();
    if (invoices.length === 0) return map;

    const placeholders = invoices.map(() => '?').join(',');
    const [rows] = await pool.execute<SweetTrackerInvoiceCacheRow[]>(
      `SELECT t_code, invoice_no, is_delivery_complete, item_name, receiver_name, sender_name,
              level_code, last_kind, last_where, last_time_string
       FROM sweet_tracker_invoice_cache
       WHERE t_code = ? AND invoice_no IN (${placeholders})`,
      [tCode, ...invoices]
    );
    for (const r of rows) {
      map.set(r.invoice_no, r);
    }
    return map;
  }

  /**
   * t_code 기준 저장된 운송장 목록 (최근 갱신순)
   */
  async listByTCodePaged(
    tCode: string,
    limit: number,
    offset: number
  ): Promise<{ rows: SweetTrackerInvoiceCacheListRow[]; total: number }> {
    const [countRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM sweet_tracker_invoice_cache WHERE t_code = ?',
      [tCode]
    );
    const total = Number((countRows[0] as { cnt: number }).cnt ?? 0);

    const [rows] = await pool.execute<SweetTrackerInvoiceCacheListRow[]>(
      `SELECT invoice_no, is_delivery_complete, last_kind, last_where, last_time_string,
              packing_list_codes_json
       FROM sweet_tracker_invoice_cache
       WHERE t_code = ?
       ORDER BY updated_at DESC, invoice_no ASC
       LIMIT ? OFFSET ?`,
      [tCode, limit, offset]
    );

    return { rows, total };
  }

  /**
   * 운송장 번호 목록에 해당하는 캐시 행(목록용 컬럼) — IN 순서는 보장되지 않음
   */
  async listRowsByTCodeAndInvoiceNos(
    tCode: string,
    invoiceNos: string[]
  ): Promise<SweetTrackerInvoiceCacheListRow[]> {
    if (invoiceNos.length === 0) return [];
    const placeholders = invoiceNos.map(() => '?').join(',');
    const [rows] = await pool.execute<SweetTrackerInvoiceCacheListRow[]>(
      `SELECT invoice_no, is_delivery_complete, last_kind, last_where, last_time_string,
              packing_list_codes_json
       FROM sweet_tracker_invoice_cache
       WHERE t_code = ? AND invoice_no IN (${placeholders})`,
      [tCode, ...invoiceNos]
    );
    return rows;
  }

  async upsert(dto: SweetTrackerInvoiceCacheUpsert): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO sweet_tracker_invoice_cache
        (t_code, invoice_no, is_delivery_complete, item_name, receiver_name, sender_name,
         level_code, last_kind, last_where, last_time_string)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_delivery_complete = VALUES(is_delivery_complete),
         item_name = VALUES(item_name),
         receiver_name = VALUES(receiver_name),
         sender_name = VALUES(sender_name),
         level_code = VALUES(level_code),
         last_kind = VALUES(last_kind),
         last_where = VALUES(last_where),
         last_time_string = VALUES(last_time_string),
         updated_at = CURRENT_TIMESTAMP`,
      [
        dto.t_code,
        dto.invoice_no,
        dto.is_delivery_complete ? 1 : 0,
        dto.item_name || null,
        dto.receiver_name || null,
        dto.sender_name || null,
        dto.level_code,
        dto.last_kind || null,
        dto.last_where || null,
        dto.last_time_string || null,
      ]
    );
  }

  /**
   * 패킹리스트 코드가 packing_list_codes_json 배열에 포함된 운송장 번호 목록 (최근 갱신순)
   * MariaDB 호환: JSON_CONTAINS/CAST AS JSON/JSON_QUOTE 조합은 버전에 따라 구문 오류가 나므로,
   * LIKE로 후보만 좁힌 뒤 JSON 배열을 파싱해 문자열 요소와 정확히 일치하는지만 판별합니다.
   */
  async listInvoiceNosByPackingListCode(tCode: string, packingListCode: string): Promise<string[]> {
    const code = packingListCode.trim();
    if (!code) return [];

    const forLike = code.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/"/g, '\\"');
    const likePattern = `%"${forLike}"%`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT invoice_no, packing_list_codes_json
       FROM sweet_tracker_invoice_cache
       WHERE t_code = ?
         AND packing_list_codes_json IS NOT NULL
         AND packing_list_codes_json != ''
         AND packing_list_codes_json LIKE ?
       ORDER BY updated_at DESC, invoice_no ASC`,
      [tCode, likePattern]
    );

    const out: string[] = [];
    for (const r of rows) {
      const row = r as { invoice_no: string; packing_list_codes_json: string | null };
      const raw = row.packing_list_codes_json;
      if (raw == null || !String(raw).trim()) continue;
      try {
        const parsed = JSON.parse(String(raw)) as unknown;
        if (!Array.isArray(parsed)) continue;
        let hit = false;
        for (const el of parsed) {
          if (typeof el === 'string' && packingListJsonElementMatchesQuery(el, code)) {
            hit = true;
            break;
          }
        }
        if (hit) out.push(String(row.invoice_no));
      } catch {
        continue;
      }
    }
    return out;
  }

  async updatePackingListCodesByTCodeAndInvoice(
    tCode: string,
    invoiceNo: string,
    codes: string[]
  ): Promise<boolean> {
    const json = JSON.stringify(codes);
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE sweet_tracker_invoice_cache
       SET packing_list_codes_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE t_code = ? AND invoice_no = ?`,
      [json, tCode, invoiceNo]
    );
    return header.affectedRows > 0;
  }
}
