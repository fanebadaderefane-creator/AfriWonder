import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';

const TTL_HOURS = 24;
/** Réservation en cours — pas une réponse JSON client. */
export const IDEMPOTENCY_PROCESSING_BODY = '__afw_idempotency_processing__';
const WAIT_POLL_MS = 400;
const WAIT_MAX_MS = 90_000;

function getExpiry(): Date {
  const d = new Date();
  d.setHours(d.getHours() + TTL_HOURS);
  return d;
}

function isUniqueConstraintError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === 'P2002');
}

function parseStoredResponseBody(raw: string | null | undefined): object | null {
  if (!raw || raw === IDEMPOTENCY_PROCESSING_BODY) return null;
  try {
    return JSON.parse(raw) as object;
  } catch {
    return null;
  }
}

async function waitForCompletedIdempotency(
  key: string,
): Promise<{ status: number; body: object } | null> {
  const started = Date.now();
  while (Date.now() - started < WAIT_MAX_MS) {
    const row = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (!row || row.expires_at < new Date()) return null;
    const body = parseStoredResponseBody(row.response_body);
    if (body) {
      return { status: row.response_status ?? 200, body };
    }
    await new Promise((r) => setTimeout(r, WAIT_POLL_MS));
  }
  return null;
}

export type IdempotencyClaimResult =
  | { action: 'proceed' }
  | { action: 'replay'; status: number; body: object }
  | { action: 'conflict' };

/**
 * Réserve la clé avant traitement pour éviter deux POST parallèles (race mobile / flush).
 */
export async function claimIdempotencyKey(headerKey: string): Promise<IdempotencyClaimResult> {
  const trimmed = (headerKey || '').trim().slice(0, 256);
  if (trimmed.length < 8) return { action: 'proceed' };

  const now = new Date();
  const existing = await prisma.idempotencyKey.findUnique({ where: { key: trimmed } });
  if (existing && existing.expires_at >= now) {
    const body = parseStoredResponseBody(existing.response_body);
    if (body) {
      return { action: 'replay', status: existing.response_status ?? 200, body };
    }
    const waited = await waitForCompletedIdempotency(trimmed);
    if (waited) return { action: 'replay', ...waited };
    return { action: 'conflict' };
  }
  if (existing) {
    await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
  }

  try {
    await prisma.idempotencyKey.create({
      data: {
        key: trimmed,
        response_status: 0,
        response_body: IDEMPOTENCY_PROCESSING_BODY,
        expires_at: getExpiry(),
      },
    });
    return { action: 'proceed' };
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
    const waited = await waitForCompletedIdempotency(trimmed);
    if (waited) return { action: 'replay', ...waited };
    return { action: 'conflict' };
  }
}

async function handleIdempotencyHeader(
  key: string,
  res: Response,
  next: NextFunction,
  required: boolean,
): Promise<void> {
  if (!key || typeof key !== 'string' || key.length < 8) {
    if (required) {
      res.status(400).json({ success: false, message: 'Idempotency-Key header required' });
      return;
    }
    next();
    return;
  }

  const claim = await claimIdempotencyKey(key);
  if (claim.action === 'replay') {
    res.status(claim.status).json(claim.body);
    return;
  }
  if (claim.action === 'conflict') {
    res.status(409).json({
      success: false,
      message: 'Publication déjà en cours. Réessayez dans quelques secondes.',
    });
    return;
  }
  next();
}

/** Middleware strict : retourne 400 si Idempotency-Key absent. Pour paiements sensibles. */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;
  handleIdempotencyHeader(key, res, next, true).catch(next);
}

/** Optionnel : si Idempotency-Key présent, évite double soumission ; sinon next. */
export function optionalIdempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;
  if (!key || typeof key !== 'string' || key.length < 8) return next();
  handleIdempotencyHeader(key, res, next, false).catch(next);
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
