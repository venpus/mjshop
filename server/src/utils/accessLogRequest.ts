import type { Request } from 'express';

const MOBILE_UA = /mobile|android|iphone|ipad|webos|blackberry|iemobile/i;

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    return first?.trim() ?? null;
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

export function getDevice(req: Request): 'PC' | 'Mobile' {
  const ua = req.headers['user-agent'];
  if (!ua) return 'PC';
  return MOBILE_UA.test(ua) ? 'Mobile' : 'PC';
}
