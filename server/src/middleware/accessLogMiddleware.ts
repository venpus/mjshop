import { Request, NextFunction } from 'express';
import { AccessLogService } from '../services/accessLogService.js';
import { logger } from '../utils/logger.js';
import { getClientIp, getDevice } from '../utils/accessLogRequest.js';
import { parseDeviceModel } from '../utils/userAgent.js';

const accessLogService = new AccessLogService();

/**
 * 로그인된 사용자의 API 접속을 access_logs에 기록한다. (event_type: access)
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
  const device = getDevice(req);
  const device_model = parseDeviceModel(ua);
  const dto = {
    user_id: user.id,
    accessed_at: new Date(),
    ip,
    url,
    device,
    device_model,
    event_type: 'access' as const,
  };
  void accessLogService.create(dto).catch((err) => {
    logger.error('접속 로그 기록 실패:', err);
  });
  next();
}
