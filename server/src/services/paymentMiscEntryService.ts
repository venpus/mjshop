import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  PaymentMiscEntryRepository,
  PaymentMiscEntryDTO,
} from '../repositories/paymentMiscEntryRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../../uploads');

export class PaymentMiscEntryService {
  private repo = new PaymentMiscEntryRepository();

  list(): Promise<PaymentMiscEntryDTO[]> {
    return this.repo.findAll();
  }

  async getTotalCny(): Promise<number> {
    return this.repo.sumTotalCny();
  }

  async create(body: {
    entry_date?: string;
    description?: string | null;
    amount_cny?: number;
    is_completed?: boolean;
  }): Promise<PaymentMiscEntryDTO> {
    const entry_date = body.entry_date || new Date().toISOString().slice(0, 10);
    const id = await this.repo.create({
      entry_date,
      description: body.description ?? '',
      amount_cny: body.amount_cny ?? 0,
      is_completed: body.is_completed ?? false,
    });
    const row = await this.repo.findById(id);
    if (!row) throw new Error('생성 후 조회 실패');
    return row;
  }

  async update(
    id: number,
    body: Partial<{
      entry_date: string;
      description: string | null;
      amount_cny: number;
      is_completed: boolean;
    }>
  ): Promise<PaymentMiscEntryDTO | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    await this.repo.update(id, body);
    return this.repo.findById(id);
  }

  getAbsoluteFilePath(relative: string): string {
    const normalized = relative.replace(/^[/\\]+/, '').replace(/\.\./g, '');
    return path.join(uploadsRoot, normalized);
  }

  async attachFile(id: number, diskPath: string, originalName: string): Promise<PaymentMiscEntryDTO | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    if (existing.file_relative_path) {
      const oldAbs = this.getAbsoluteFilePath(existing.file_relative_path);
      try {
        if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
      } catch {
        /* ignore */
      }
    }
    const rel = path.relative(uploadsRoot, diskPath).split(path.sep).join('/');
    await this.repo.update(id, {
      file_relative_path: rel,
      original_filename: originalName,
    });
    return this.repo.findById(id);
  }

  async removeFile(id: number): Promise<PaymentMiscEntryDTO | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    if (existing.file_relative_path) {
      const abs = this.getAbsoluteFilePath(existing.file_relative_path);
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
    await this.repo.update(id, {
      file_relative_path: null,
      original_filename: null,
    });
    return this.repo.findById(id);
  }

  async deleteEntry(id: number): Promise<boolean> {
    const existing = await this.repo.findById(id);
    if (!existing) return false;
    if (existing.file_relative_path) {
      const abs = this.getAbsoluteFilePath(existing.file_relative_path);
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }
    const dir = path.join(uploadsRoot, 'payment-misc', String(id));
    try {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    } catch {
      /* ignore */
    }
    return this.repo.delete(id);
  }
}
