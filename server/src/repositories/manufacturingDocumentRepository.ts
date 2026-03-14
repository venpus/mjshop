import { pool } from '../config/database.js';
import {
  ManufacturingDocument,
  ManufacturingProcessStep,
  ManufacturingProcessStepImage,
  CreateManufacturingDocumentDTO,
  UpdateManufacturingDocumentDTO,
  CreateManufacturingStepDTO,
  type TranslationStatus,
} from '../models/manufacturingDocument.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'crypto';

interface ManufacturingDocumentRow extends RowDataPacket {
  id: string;
  purchase_order_id: string | null;
  product_name: string;
  product_name_zh: string | null;
  product_image: string | null;
  quantity: number;
  finished_product_image: string | null;
  small_pack_count: number | null;
  quantity_per_box: number | null;
  packing_list_code: string | null;
  barcode: string | null;
  document_file_path: string | null;
  original_file_name: string | null;
  translation_status: string;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ManufacturingProcessStepRow extends RowDataPacket {
  id: number;
  manufacturing_document_id: string;
  display_order: number;
  process_name: string;
  process_name_zh: string | null;
  work_method: string | null;
  work_method_zh: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ManufacturingStepImageRow extends RowDataPacket {
  id: number;
  manufacturing_process_step_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

function rowToDocument(row: ManufacturingDocumentRow): ManufacturingDocument {
  return {
    id: row.id,
    purchase_order_id: row.purchase_order_id,
    product_name: row.product_name,
    product_name_zh: row.product_name_zh,
    product_image: row.product_image,
    quantity: row.quantity,
    finished_product_image: row.finished_product_image,
    small_pack_count: row.small_pack_count,
    quantity_per_box: row.quantity_per_box,
    packing_list_code: row.packing_list_code,
    barcode: row.barcode,
    document_file_path: row.document_file_path ?? undefined,
    original_file_name: row.original_file_name ?? undefined,
    translation_status: (row.translation_status as TranslationStatus) || 'idle',
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
  };
}

export class ManufacturingDocumentRepository {
  async findAll(purchaseOrderId?: string | null, limit?: number, offset?: number): Promise<{ data: ManufacturingDocument[]; total: number }> {
    let whereClause = '';
    const params: (string | number)[] = [];
    if (purchaseOrderId !== undefined && purchaseOrderId !== null && purchaseOrderId !== '') {
      whereClause = ' WHERE md.purchase_order_id = ?';
      params.push(purchaseOrderId);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM manufacturing_documents md${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countQuery, params);
    const total = (countRows[0]?.total as number) ?? 0;

    let listQuery = `SELECT md.id, md.purchase_order_id, md.product_name, md.product_name_zh, md.product_image, md.quantity,
      md.finished_product_image, md.small_pack_count, md.quantity_per_box, md.packing_list_code, md.barcode,
      md.document_file_path, md.original_file_name,
      COALESCE(md.translation_status, 'idle') AS translation_status,
      md.created_at, md.updated_at, md.created_by, md.updated_by
      FROM manufacturing_documents md${whereClause} ORDER BY md.created_at DESC`;
    if (limit != null && limit > 0) {
      listQuery += ' LIMIT ?';
      params.push(limit);
    }
    if (offset != null && offset > 0) {
      listQuery += ' OFFSET ?';
      params.push(offset);
    }
    const [rows] = await pool.query<ManufacturingDocumentRow[]>(listQuery, params);
    const data = rows.map(rowToDocument);
    return { data, total };
  }

  async findById(id: string): Promise<ManufacturingDocument | null> {
    const [rows] = await pool.query<ManufacturingDocumentRow[]>(
      `SELECT id, purchase_order_id, product_name, product_name_zh, product_image, quantity,
       finished_product_image, small_pack_count, quantity_per_box, packing_list_code, barcode,
       document_file_path, original_file_name,
       COALESCE(translation_status, 'idle') AS translation_status,
       created_at, updated_at, created_by, updated_by
       FROM manufacturing_documents WHERE id = ?`,
      [id]
    );
    const row = rows[0];
    if (!row) return null;
    const doc = rowToDocument(row);
    const steps = await this.findStepsByDocumentId(id);
    doc.steps = steps;
    return doc;
  }

  async findByPurchaseOrderId(purchaseOrderId: string): Promise<ManufacturingDocument | null> {
    const [rows] = await pool.query<ManufacturingDocumentRow[]>(
      `SELECT id, purchase_order_id, product_name, product_name_zh, product_image, quantity,
       finished_product_image, small_pack_count, quantity_per_box, packing_list_code, barcode,
       document_file_path, original_file_name,
       COALESCE(translation_status, 'idle') AS translation_status,
       created_at, updated_at, created_by, updated_by
       FROM manufacturing_documents WHERE purchase_order_id = ? LIMIT 1`,
      [purchaseOrderId]
    );
    const row = rows[0];
    if (!row) return null;
    return this.findById(row.id);
  }

  async findStepsByDocumentId(documentId: string): Promise<ManufacturingProcessStep[]> {
    const [stepRows] = await pool.query<ManufacturingProcessStepRow[]>(
      `SELECT id, manufacturing_document_id, display_order, process_name, process_name_zh, work_method, work_method_zh, created_at, updated_at
       FROM manufacturing_process_steps WHERE manufacturing_document_id = ? ORDER BY display_order ASC, id ASC`,
      [documentId]
    );
    const steps: ManufacturingProcessStep[] = [];
    for (const sr of stepRows) {
      const [imgRows] = await pool.query<ManufacturingStepImageRow[]>(
        `SELECT id, manufacturing_process_step_id, image_url, display_order, created_at
         FROM manufacturing_step_images WHERE manufacturing_process_step_id = ? ORDER BY display_order ASC, id ASC`,
        [sr.id]
      );
      steps.push({
        id: sr.id,
        manufacturing_document_id: sr.manufacturing_document_id,
        display_order: sr.display_order,
        process_name: sr.process_name,
        process_name_zh: sr.process_name_zh,
        work_method: sr.work_method,
        work_method_zh: sr.work_method_zh,
        created_at: sr.created_at,
        updated_at: sr.updated_at,
        images: imgRows.map((r) => ({
          id: r.id,
          manufacturing_process_step_id: r.manufacturing_process_step_id,
          image_url: r.image_url,
          display_order: r.display_order,
          created_at: r.created_at,
        })),
      });
    }
    return steps;
  }

  async create(dto: CreateManufacturingDocumentDTO, userId?: string | null): Promise<ManufacturingDocument> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO manufacturing_documents (id, purchase_order_id, product_name, product_name_zh, product_image, quantity,
       finished_product_image, small_pack_count, quantity_per_box, packing_list_code, barcode, translation_status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        id,
        dto.purchase_order_id ?? null,
        dto.product_name ?? '',
        dto.product_name_zh ?? null,
        dto.product_image ?? null,
        dto.quantity ?? 0,
        dto.finished_product_image ?? null,
        dto.small_pack_count ?? null,
        dto.quantity_per_box ?? null,
        dto.packing_list_code ?? null,
        dto.barcode ?? null,
        userId ?? null,
        userId ?? null,
      ]
    );
    if (dto.steps && dto.steps.length > 0) {
      await this.saveSteps(id, dto.steps);
    }
    const created = await this.findById(id);
    if (!created) throw new Error('Failed to load created manufacturing document');
    return created;
  }

  async update(id: string, dto: UpdateManufacturingDocumentDTO, userId?: string | null): Promise<ManufacturingDocument | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await pool.query(
      `UPDATE manufacturing_documents SET
       product_name = COALESCE(?, product_name), product_name_zh = ?, product_image = COALESCE(?, product_image),
       quantity = COALESCE(?, quantity), finished_product_image = ?, small_pack_count = ?, quantity_per_box = ?,
       packing_list_code = ?, barcode = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        dto.product_name ?? existing.product_name,
        dto.product_name_zh !== undefined ? dto.product_name_zh : existing.product_name_zh,
        dto.product_image !== undefined ? dto.product_image : existing.product_image,
        dto.quantity !== undefined ? dto.quantity : existing.quantity,
        dto.finished_product_image !== undefined ? dto.finished_product_image : existing.finished_product_image,
        dto.small_pack_count !== undefined ? dto.small_pack_count : existing.small_pack_count,
        dto.quantity_per_box !== undefined ? dto.quantity_per_box : existing.quantity_per_box,
        dto.packing_list_code !== undefined ? dto.packing_list_code : existing.packing_list_code,
        dto.barcode !== undefined ? dto.barcode : existing.barcode,
        userId ?? null,
        id,
      ]
    );
    // update 시 translation_status는 변경하지 않음 (사용자가 중국어 수정 시 유지)
    if (dto.steps !== undefined) {
      await this.saveSteps(id, dto.steps);
    }
    return this.findById(id);
  }

  async saveSteps(documentId: string, steps: CreateManufacturingStepDTO[]): Promise<void> {
    const conn = await pool.getConnection();
    try {
      const [stepRows] = await conn.query<RowDataPacket[]>('SELECT id FROM manufacturing_process_steps WHERE manufacturing_document_id = ?', [documentId]);
      const stepIds = stepRows.map((r) => r.id);
      if (stepIds.length > 0) {
        const placeholders = stepIds.map(() => '?').join(',');
        await conn.query(`DELETE FROM manufacturing_step_images WHERE manufacturing_process_step_id IN (${placeholders})`, stepIds);
      }
      await conn.query('DELETE FROM manufacturing_process_steps WHERE manufacturing_document_id = ?', [documentId]);

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const [insertResult] = await conn.query<ResultSetHeader>(
          `INSERT INTO manufacturing_process_steps (manufacturing_document_id, display_order, process_name, process_name_zh, work_method, work_method_zh)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [documentId, s.display_order ?? i, s.process_name ?? '', s.process_name_zh ?? null, s.work_method ?? null, s.work_method_zh ?? null]
        );
        const stepId = insertResult.insertId;
        const urls = s.image_urls ?? [];
        for (let j = 0; j < urls.length; j++) {
          await conn.query(
            `INSERT INTO manufacturing_step_images (manufacturing_process_step_id, image_url, display_order) VALUES (?, ?, ?)`,
            [stepId, urls[j], j]
          );
        }
      }
    } finally {
      conn.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM manufacturing_documents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async updateFinishedProductImage(id: string, imageUrl: string | null): Promise<void> {
    await pool.query('UPDATE manufacturing_documents SET finished_product_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [imageUrl, id]);
  }

  async setTranslationStatus(id: string, status: TranslationStatus): Promise<void> {
    await pool.query(
      'UPDATE manufacturing_documents SET translation_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
  }

  async updateTranslationResult(
    id: string,
    productNameZh: string | null,
    stepsZh: { stepId: number; process_name_zh: string | null; work_method_zh: string | null }[]
  ): Promise<void> {
    await pool.query(
      'UPDATE manufacturing_documents SET product_name_zh = ?, translation_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [productNameZh, 'completed', id]
    );
    for (const s of stepsZh) {
      await pool.query(
        'UPDATE manufacturing_process_steps SET process_name_zh = ?, work_method_zh = ? WHERE id = ?',
        [s.process_name_zh, s.work_method_zh, s.stepId]
      );
    }
  }

  /** 파일 업로드용 문서 생성 (엑셀/PDF) */
  async createWithFile(
    purchaseOrderId: string | null,
    originalFileName: string,
    documentFilePath: string,
    userId?: string | null
  ): Promise<ManufacturingDocument> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO manufacturing_documents (id, purchase_order_id, product_name, quantity, document_file_path, original_file_name, created_by, updated_by)
       VALUES (?, ?, '', 0, ?, ?, ?, ?)`,
      [id, purchaseOrderId, documentFilePath, originalFileName, userId ?? null, userId ?? null]
    );
    const doc = await this.findById(id);
    if (!doc) throw new Error('Failed to load created document');
    return doc;
  }

  async updateDocumentFile(id: string, documentFilePath: string, originalFileName: string): Promise<void> {
    await pool.query(
      'UPDATE manufacturing_documents SET document_file_path = ?, original_file_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [documentFilePath, originalFileName, id]
    );
  }
}
