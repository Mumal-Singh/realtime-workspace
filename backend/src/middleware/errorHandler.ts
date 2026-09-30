import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// central error handler - nothing else in the app should be formatting error responses
// directly, they either throw AppError or let unexpected errors bubble here.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({ error: 'validation failed', details: err.flatten() });
  }

  // don't leak stack traces or db internals to the client
  console.error(err);
  return res.status(500).json({ error: 'internal server error' });
}
