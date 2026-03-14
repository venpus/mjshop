import { Request, Response } from 'express';
import { AccessLogService } from '../services/accessLogService.js';
import { AdminAccountRepository } from '../repositories/adminAccountRepository.js';
import { logger } from '../utils/logger.js';

const accessLogService = new AccessLogService();
const adminAccountRepository = new AdminAccountRepository();

/**
 * GET /api/access-logs
 * A-SuperAdmin만 조회 가능. 페이지당 20건, 사용자 명 필터 지원.
 */
export async function list(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    const account = await adminAccountRepository.findById(user.id);
    if (!account || account.level !== 'A-SuperAdmin') {
      return res.status(403).json({ error: '접속 로그는 A레벨 관리자만 조회할 수 있습니다.' });
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const userName = typeof req.query.userName === 'string' ? req.query.userName : undefined;

    const result = await accessLogService.list({ userName, page, limit });
    return res.json({
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('접속 로그 목록 조회 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '접속 로그 조회 중 오류가 발생했습니다.',
    });
  }
}

/** DELETE /api/access-logs/older-than
 * 2주(14일) 초과 로그 삭제. A-SuperAdmin만 호출 가능.
 */
export async function deleteOlderThan(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    const account = await adminAccountRepository.findById(user.id);
    if (!account || account.level !== 'A-SuperAdmin') {
      return res.status(403).json({ error: '2주 초과 로그 삭제는 A레벨 관리자만 가능합니다.' });
    }

    const retentionDays = 14;
    const result = await accessLogService.deleteOlderThanRetention(retentionDays);
    return res.json({
      success: true,
      deleted: result.deleted,
      message: `${result.deleted}건의 2주 초과 로그가 삭제되었습니다.`,
    });
  } catch (error) {
    logger.error('접속 로그 삭제 오류:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '2주 초과 로그 삭제 중 오류가 발생했습니다.',
    });
  }
}
