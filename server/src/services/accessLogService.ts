import { AccessLogRepository } from '../repositories/accessLogRepository.js';
import { AccessLogWithUserName, CreateAccessLogDTO } from '../models/accessLog.js';

const PAGE_SIZE = 20;

export class AccessLogService {
  private repo = new AccessLogRepository();

  async create(dto: CreateAccessLogDTO): Promise<number> {
    return this.repo.create(dto);
  }

  async list(options: {
    userName?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AccessLogWithUserName[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? PAGE_SIZE));
    const offset = (page - 1) * limit;
    const filters = { userName: options.userName?.trim() || undefined };

    const [data, total] = await Promise.all([
      this.repo.findWithFilter(filters, limit, offset),
      this.repo.countWithFilter(filters),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** 2주(14일) 초과 로그 삭제. 삭제된 건수 반환. */
  async deleteOlderThanRetention(retentionDays: number = 14): Promise<{ deleted: number }> {
    const before = new Date();
    before.setDate(before.getDate() - retentionDays);
    const deleted = await this.repo.deleteOlderThan(before);
    return { deleted };
  }
}
