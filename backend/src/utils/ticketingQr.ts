/**
 * QR signé cryptographiquement — anti-fraude scan
 * Payload: ticketId|eventId, signature = HMAC-SHA256(secret, payload)
 */
import crypto from 'crypto';

const ALG = 'sha256';
const TTL_MS = 2 * 60 * 1000; // 2 min lock

function getSecret(): string {
  const s = process.env.JWT_SECRET || process.env.TICKET_QR_SECRET || 'ticket-qr-fallback';
  return s.slice(0, 64);
}

export function signQr(ticketId: string, eventId: string): string {
  const payload = `${ticketId}|${eventId}`;
  return crypto.createHmac(ALG, getSecret()).update(payload).digest('hex');
}

export function verifyQr(qrSignature: string | null, ticketId: string, eventId: string): boolean {
  if (!qrSignature) return true; // backward compat
  const expected = signQr(ticketId, eventId);
  if (qrSignature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(qrSignature, 'hex'), Buffer.from(expected, 'hex'));
}

export function getLockExpiry(): Date {
  return new Date(Date.now() + TTL_MS);
}
