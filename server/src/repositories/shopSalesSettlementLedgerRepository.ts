import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import type {
  CreateSalesSettlementLedgerDTO,
  SalesSettlementLedgerEntry,
  SalesSettlementLedgerListResult,
  SalesSettlementLedgerPartner,
  SalesSettlementLedgerSummary,
} from '../models/shopSalesSettlementLedger.js';

interface LedgerRow extends RowDataPacket {
  id: string;
  partner: SalesSettlementLedgerPartner;
  settlement_date: Date | string;
  amount: number;
  note: string | null;
  created_at: Date;
}

function normalizeDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function mapRow(row: LedgerRow): SalesSettlementLedgerEntry {
  return {
    id: row.id,
    partner: row.partner,
    settlementDate: normalizeDateOnly(row.settlement_date),
    amount: Number(row.amount) || 0,
    note: row.note,
    createdAt: row.created_at.toISOString(),
  };
}

export class ShopSalesSettlementLedgerRepository {
  async getSummary(partner: SalesSettlementLedgerPartner): Promise<SalesSettlementLedgerSummary> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS entry_count
       FROM kr_shop_sales_settlement_ledger
       WHERE partner = ?`,
      [partner]
    );
    return {
      totalAmount: Number(rows[0]?.total_amount) || 0,
      entryCount: Number(rows[0]?.entry_count) || 0,
    };
  }

  async getAllSummaries(): Promise<Record<SalesSettlementLedgerPartner, SalesSettlementLedgerSummary>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT partner,
              COALESCE(SUM(amount), 0) AS total_amount,
              COUNT(*) AS entry_count
       FROM kr_shop_sales_settlement_ledger
       GROUP BY partner`
    );

    const result: Record<SalesSettlementLedgerPartner, SalesSettlementLedgerSummary> = {
      wk: { totalAmount: 0, entryCount: 0 },
      inventio: { totalAmount: 0, entryCount: 0 },
    };

    for (const row of rows) {
      const partner = row.partner as SalesSettlementLedgerPartner;
      result[partner] = {
        totalAmount: Number(row.total_amount) || 0,
        entryCount: Number(row.entry_count) || 0,
      };
    }

    return result;
  }

  async list(
    partner: SalesSettlementLedgerPartner,
    page: number,
    limit: number
  ): Promise<SalesSettlementLedgerListResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM kr_shop_sales_settlement_ledger WHERE partner = ?`,
      [partner]
    );
    const totalItems = Number(countRows[0]?.total) || 0;

    const [rows] = await pool.execute<LedgerRow[]>(
      `SELECT id, partner, settlement_date, amount, note, created_at
       FROM kr_shop_sales_settlement_ledger
       WHERE partner = ?
       ORDER BY settlement_date DESC, created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      [partner]
    );

    return {
      items: rows.map(mapRow),
      totalItems,
      page: safePage,
      limit: safeLimit,
      totalPages: totalItems > 0 ? Math.ceil(totalItems / safeLimit) : 1,
    };
  }

  async create(data: CreateSalesSettlementLedgerDTO): Promise<SalesSettlementLedgerEntry> {
    const id = randomUUID();
    await pool.execute<ResultSetHeader>(
      `INSERT INTO kr_shop_sales_settlement_ledger (id, partner, settlement_date, amount, note)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.partner, data.settlementDate, data.amount, data.note ?? null]
    );

    const [rows] = await pool.execute<LedgerRow[]>(
      `SELECT id, partner, settlement_date, amount, note, created_at
       FROM kr_shop_sales_settlement_ledger WHERE id = ?`,
      [id]
    );
    return mapRow(rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM kr_shop_sales_settlement_ledger WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}
