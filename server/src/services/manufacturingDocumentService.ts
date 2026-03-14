import { ManufacturingDocumentRepository } from '../repositories/manufacturingDocumentRepository.js';
import {
  ManufacturingDocument,
  CreateManufacturingDocumentDTO,
  UpdateManufacturingDocumentDTO,
} from '../models/manufacturingDocument.js';

export class ManufacturingDocumentService {
  private repo: ManufacturingDocumentRepository;

  constructor() {
    this.repo = new ManufacturingDocumentRepository();
  }

  async list(purchaseOrderId?: string | null, limit?: number, offset?: number): Promise<{ data: ManufacturingDocument[]; total: number }> {
    return this.repo.findAll(purchaseOrderId, limit, offset);
  }

  async getById(id: string): Promise<ManufacturingDocument | null> {
    return this.repo.findById(id);
  }

  async getByPurchaseOrderId(purchaseOrderId: string): Promise<ManufacturingDocument | null> {
    return this.repo.findByPurchaseOrderId(purchaseOrderId);
  }

  async create(dto: CreateManufacturingDocumentDTO, userId?: string | null): Promise<ManufacturingDocument> {
    return this.repo.create(dto, userId);
  }

  async update(id: string, dto: UpdateManufacturingDocumentDTO, userId?: string | null): Promise<ManufacturingDocument | null> {
    return this.repo.update(id, dto, userId);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async updateFinishedProductImage(id: string, imageUrl: string | null): Promise<void> {
    return this.repo.updateFinishedProductImage(id, imageUrl);
  }

  /** 제조 문서 파일 업로드 (엑셀/PDF) → 새 문서 생성 */
  async uploadDocument(
    tempFilePath: string,
    originalFileName: string,
    purchaseOrderId: string | null,
    userId?: string | null
  ): Promise<ManufacturingDocument> {
    const doc = await this.repo.createWithFile(purchaseOrderId, originalFileName, '', userId);
    const { saveManufacturingDocumentFile } = await import('../utils/upload.js');
    const relativePath = await saveManufacturingDocumentFile(tempFilePath, doc.id, originalFileName);
    await this.repo.updateDocumentFile(doc.id, relativePath, originalFileName);
    const updated = await this.repo.findById(doc.id);
    if (!updated) throw new Error('Failed to load document after upload');
    return updated;
  }

  /** 다운로드용 파일 경로 반환 (없으면 null) */
  async getDocumentFileInfo(id: string): Promise<{ absolutePath: string; originalFileName: string } | null> {
    const doc = await this.repo.findById(id);
    if (!doc?.document_file_path || !doc?.original_file_name) return null;
    const { getManufacturingDocumentAbsolutePath } = await import('../utils/upload.js');
    return {
      absolutePath: getManufacturingDocumentAbsolutePath(doc.document_file_path),
      originalFileName: doc.original_file_name,
    };
  }
}
