import { Request, Response, NextFunction } from 'express';

// express doesn't catch rejected promises from async route handlers on its own (pre v5),
// this wrapper forwards any thrown/rejected error to errorHandler instead of hanging the request
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
