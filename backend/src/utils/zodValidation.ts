import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';

const formatZodErrors = (issues: z.ZodIssue[]) =>
  issues.map((issue) => ({
    path: issue.path.join('.') || 'body',
    message: issue.message,
    code: issue.code,
  }));

const badRequest = (res: Response, issues: z.ZodIssue[]) =>
  res.status(400).json({
    success: false,
    error: {
      message: 'Validation des donnees echouee',
      details: formatZodErrors(issues),
    },
  });

export const validateBody =
  <T extends ZodTypeAny>(schema: T): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, parsed.error.issues);
    }
    req.body = parsed.data;
    return next();
  };

export const validateQuery =
  <T extends ZodTypeAny>(schema: T): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return badRequest(res, parsed.error.issues);
    }
    req.query = parsed.data as Request['query'];
    return next();
  };
