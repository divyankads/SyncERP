import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/** Validates req.body against a Zod schema. Sends 400 on failure. */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ success: false, errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Global error handler — catches async errors forwarded by routes */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ERROR]', err.message);
  const status = (err as any).status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

/** Wraps async route handlers to forward errors to errorHandler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
