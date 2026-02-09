import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';

const TTL_HOURS = 24;

function getExpiry(): Date {
  const d = new Date();
  d.setHours(d.getHours() + TTL_HOURS);
  return d;
}

/** Middleware strict : retourne 400 si Idempotency-Key absent. Pour paiements sensibles. */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;
  if (!key || typeof key !== 'string' || key.length < 8) {
    return res.status(400).json({ success: false, message: 'Idempotency-Key header required' });
  }
  const run = async () => {
    const trimmed = key.trim().slice(0, 256);
    const now = new Date();
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: trimmed } });
    if (existing && existing.expires_at >= now) {
      const status = existing.response_status ?? 200;
      const body = existing.response_body ? JSON.parse(existing.response_body) : { success: true, data: null };
      return res.status(status).json(body);
    }
    if (existing) await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
    next();
  };
  run().catch(next);
}

/** Optionnel : si Idempotency-Key présent, évite double soumission ; sinon next. */
export function optionalIdempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;
  if (!key || typeof key !== 'string' || key.length < 8) return next();
  const run = async () => {
    const trimmed = key.trim().slice(0, 256);
    const now = new Date();
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: trimmed } });
    if (existing && existing.expires_at >= now) {
      const status = existing.response_status ?? 200;
      const body = existing.response_body ? JSON.parse(existing.response_body) : { success: true, data: null };
      return res.status(status).json(body);
    }
    if (existing) await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
    next();
  };
  run().catch(next);
}

export async function saveIdempotencyResponse(key: string, statusCode: number, body: object): Promise<void> {
  const trimmed = (key || '').trim().slice(0, 256);
  if (!trimmed) return;
  await prisma.idempotencyKey.upsert({
    where: { key: trimmed },
    create: { key: trimmed, response_status: statusCode, response_body: JSON.stringify(body), expires_at: getExpiry() },
    update: { response_status: statusCode, response_body: JSON.stringify(body), expires_at: getExpiry() },
  });
}
