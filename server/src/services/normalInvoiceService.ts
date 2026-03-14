import { NormalInvoiceRepository } from '../repositories/normalInvoiceRepository.js';
import type {
  NormalInvoiceEntryWithFiles,
  CreateNormalInvoiceEntryDTO,
  UpdateNormalInvoiceEntryDTO,
} from '../models/normalInvoice.js';
import {
  saveNormalInvoiceFile,
  deleteNormalInvoiceEntryFiles,
} from '../utils/upload.js';

const repository = new NormalInvoiceRepository();

export class NormalInvoiceService {
  async list(): Promise<NormalInvoiceEntryWithFiles[]> {
    return repository.findAll();
  }

  async getById(id: number): Promise<NormalInvoiceEntryWithFiles | null> {
    return repository.findById(id);
  }

  async create(
    data: CreateNormalInvoiceEntryDTO,
    files?: { invoice?: Express.Multer.File[]; photos?: Express.Multer.File[] },
    originalNames?: { invoice_original_name?: string; photo_original_names?: string[] }
  ): Promise<NormalInvoiceEntryWithFiles> {
    const entry = await repository.create(data);
    const entryId = entry.id;
    if (files?.invoice?.[0]) {
      const name = originalNames?.invoice_original_name || files.invoice[0].originalname || 'invoice';
      const relPath = await saveNormalInvoiceFile(files.invoice[0].path, entryId, 'invoice', name);
      await repository.addFile(entryId, 'invoice', relPath, name, 0);
    }
    if (files?.photos?.length) {
      const names = originalNames?.photo_original_names;
      for (let i = 0; i < files.photos.length; i++) {
        const file = files.photos[i]!;
        const name = (names && names[i]) || file.originalname || `photo-${i + 1}`;
        const relPath = await saveNormalInvoiceFile(file.path, entryId, 'photo', name);
        await repository.addFile(entryId, 'photo', relPath, name, i);
      }
    }
    const withFiles = await repository.findById(entryId);
    return withFiles!;
  }

  async update(
    id: number,
    data: UpdateNormalInvoiceEntryDTO,
    files?: { invoice?: Express.Multer.File[]; photos?: Express.Multer.File[] },
    originalNames?: { invoice_original_name?: string; photo_original_names?: string[] }
  ): Promise<NormalInvoiceEntryWithFiles | null> {
    const existing = await repository.findById(id);
    if (!existing) return null;
    if (data.entry_date !== undefined || data.product_name !== undefined) {
      await repository.update(id, data);
    }
    if (files?.invoice?.[0]) {
      await repository.deleteFilesByEntryId(id, 'invoice');
      const name = originalNames?.invoice_original_name || files.invoice[0].originalname || 'invoice';
      const relPath = await saveNormalInvoiceFile(files.invoice[0].path, id, 'invoice', name);
      await repository.addFile(id, 'invoice', relPath, name, 0);
    }
    if (files?.photos?.length) {
      await repository.deleteFilesByEntryId(id, 'photo');
      const names = originalNames?.photo_original_names;
      for (let i = 0; i < files.photos.length; i++) {
        const file = files.photos[i]!;
        const name = (names && names[i]) || file.originalname || `photo-${i + 1}`;
        const relPath = await saveNormalInvoiceFile(file.path, id, 'photo', name);
        await repository.addFile(id, 'photo', relPath, name, i);
      }
    }
    return repository.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await repository.delete(id);
    if (deleted) {
      await deleteNormalInvoiceEntryFiles(id);
    }
    return deleted;
  }
}
