import { Request, Response, NextFunction } from 'express';

/**
 * async 함수를 Express 라우터 핸들러로 사용할 때 에러를 자동으로 처리하는 래퍼
 * async 함수에서 발생한 에러를 catch하여 next()로 전달
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

