import { Request, NextFunction } from 'express';
import { AccessLogService } from '../services/accessLogService.js';
import { logger } from '../utils/logger.js';
import { parseDeviceModel } from '../utils/userAgent.js';

const accessLogService = new AccessLogService();

const MOBILE_UA = /mobile|android|iphone|ipad|webos|blackberry|iemobile/i;

function getDevice(userAgent: string | undefined): 'PC' | 'Mobile' {
  if (!userAgent) return 'PC';
  return MOBILE_UA.test(userAgent) ? 'Mobile' : 'PC';
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    return first?.trim() ?? null;
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

/**
 * 로그인된 사용자의 API 접속을 access_logs에 기록한다.
 * 비동기로 기록하며 응답을 블로킹하지 않는다.
 */
export function accessLogMiddleware(req: Request, _res: unknown, next: NextFunction) {
  const user = (req as any).user;
  if (!user?.id) {
    return next();
  }
  const ip = getClientIp(req);
  const url = req.originalUrl ?? req.url ?? '';
  const ua = req.headers['user-agent'];
  const device = getDevice(ua);
  const device_model = parseDeviceModel(ua);
  const dto = {
    user_id: user.id,
    accessed_at: new Date(),
    ip,
    url,
    device,
    device_model,
  };
  void accessLogService.create(dto).catch((err) => {
    logger.error('접속 로그 기록 실패:', err);
  });
  next();
}
