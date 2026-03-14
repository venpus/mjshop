import { pool } from '../config/database.js';
import type {
  NormalInvoiceEntry,
  NormalInvoiceFile,
  NormalInvoiceEntryWithFiles,
  CreateNormalInvoiceEntryDTO,
  UpdateNormalInvoiceEntryDTO,
} from '../models/normalInvoice.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface EntryRow extends RowDataPacket, NormalInvoiceEntry {}
interface FileRow extends RowDataPacket, NormalInvoiceFile {}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export class NormalInvoiceRepository {
  async findAll(): Promise<NormalInvoiceEntryWithFiles[]> {
    const [entryRows] = await pool.query<EntryRow[]>(
      'SELECT id, entry_date, product_name, created_at, updated_at FROM normal_invoice_entries ORDER BY entry_date DESC, id DESC'
    );
    const entries: NormalInvoiceEntryWithFiles[] = [];
    for (const row of entryRows) {
      const [fileRows] = await pool.query<FileRow[]>(
        'SELECT id, entry_id, file_kind, file_path, original_name, display_order, created_at FROM normal_invoice_files WHERE entry_id = ? ORDER BY file_kind, display_order, id',
        [row.id]
      );
      const invoiceFile = fileRows.find((f) => f.file_kind === 'invoice') ?? null;
      const photoFiles = fileRows.filter((f) => f.file_kind === 'photo');
      entries.push({
        id: row.id,
        entry_date: formatDate(row.entry_date),
        product_name: row.product_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        invoice_file: invoiceFile
          ? { file_path: invoiceFile.file_path, original_name: invoiceFile.original_name }
          : null,
        photo_files: photoFiles.map((f) => ({ file_path: f.file_path, original_name: f.original_name })),
      });
    }
    return entries;
  }

  async findById(id: number): Promise<NormalInvoiceEntryWithFiles | null> {
    const [entryRows] = await pool.query<EntryRow[]>(
      'SELECT id, entry_date, product_name, created_at, updated_at FROM normal_invoice_entries WHERE id = ?',
      [id]
    );
    const row = entryRows[0];
    if (!row) return null;
    const [fileRows] = await pool.query<FileRow[]>(
      'SELECT id, entry_id, file_kind, file_path, original_name, display_order, created_at FROM normal_invoice_files WHERE entry_id = ? ORDER BY file_kind, display_order, id',
      [id]
    );
    const invoiceFile = fileRows.find((f) => f.file_kind === 'invoice') ?? null;
    const photoFiles = fileRows.filter((f) => f.file_kind === 'photo');
    return {
      id: row.id,
      entry_date: formatDate(row.entry_date),
      product_name: row.product_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      invoice_file: invoiceFile
        ? { file_path: invoiceFile.file_path, original_name: invoiceFile.original_name }
        : null,
      photo_files: photoFiles.map((f) => ({ file_path: f.file_path, original_name: f.original_name })),
    };
  }

  async create(data: CreateNormalInvoiceEntryDTO): Promise<NormalInvoiceEntry> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO normal_invoice_entries (entry_date, product_name) VALUES (?, ?)',
      [data.entry_date, data.product_name]
    );
    const [rows] = await pool.query<EntryRow[]>(
      'SELECT id, entry_date, product_name, created_at, updated_at FROM normal_invoice_entries WHERE id = ?',
      [result.insertId]
    );
    const row = rows[0];
    return {
      id: row.id,
      entry_date: formatDate(row.entry_date),
      product_name: row.product_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async update(id: number, data: UpdateNormalInvoiceEntryDTO): Promise<NormalInvoiceEntry | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    if (data.entry_date !== undefined) {
      updates.push('entry_date = ?');
      values.push(data.entry_date);
    }
    if (data.product_name !== undefined) {
      updates.push('product_name = ?');
      values.push(data.product_name);
    }
    if (updates.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(
      `UPDATE normal_invoice_entries SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    const [rows] = await pool.query<EntryRow[]>(
      'SELECT id, entry_date, product_name, created_at, updated_at FROM normal_invoice_entries WHERE id = ?',
      [id]
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          entry_date: formatDate(row.entry_date),
          product_name: row.product_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : null;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM normal_invoice_entries WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async addFile(entryId: number, fileKind: 'invoice' | 'photo', filePath: string, originalName: string, displayOrder: number): Promise<NormalInvoiceFile> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO normal_invoice_files (entry_id, file_kind, file_path, original_name, display_order) VALUES (?, ?, ?, ?, ?)',
      [entryId, fileKind, filePath, originalName, displayOrder]
    );
    const [rows] = await pool.query<FileRow[]>(
      'SELECT id, entry_id, file_kind, file_path, original_name, display_order, created_at FROM normal_invoice_files WHERE id = ?',
      [result.insertId]
    );
    return rows[0]!;
  }

  async deleteFilesByEntryId(entryId: number, fileKind?: 'invoice' | 'photo'): Promise<void> {
    if (fileKind) {
      await pool.query('DELETE FROM normal_invoice_files WHERE entry_id = ? AND file_kind = ?', [entryId, fileKind]);
    } else {
      await pool.query('DELETE FROM normal_invoice_files WHERE entry_id = ?', [entryId]);
    }
  }

  async getFilesByEntryId(entryId: number): Promise<NormalInvoiceFile[]> {
    const [rows] = await pool.query<FileRow[]>(
      'SELECT id, entry_id, file_kind, file_path, original_name, display_order, created_at FROM normal_invoice_files WHERE entry_id = ? ORDER BY file_kind, display_order, id',
      [entryId]
    );
    return rows;
  }
}
