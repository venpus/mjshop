import { Request, Response, NextFunction } from 'express';

/**
 * 인증 미들웨어 - 요청 헤더에서 사용자 ID를 읽어서 req.user에 설정
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  // 헤더에서 사용자 ID 읽기
  const userId = req.headers['x-user-id'] as string | undefined;
  
  if (userId) {
    (req as any).user = { id: userId };
  }
  
  next();
}

