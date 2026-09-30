import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export function validateBody(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
