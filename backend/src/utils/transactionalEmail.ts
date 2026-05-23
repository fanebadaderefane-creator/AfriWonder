/**
 * E-mails transactionnels : Resend si RESEND_API_KEY, sinon appelant SMTP (nodemailer) ailleurs.
 */
import { logger } from './logger.js';

export type TransactionalEmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Pièces jointes (PDF, etc.) — Resend attend filename + content Buffer */
  attachments?: Array<{ filename: string; content: Buffer }>;
};

export async function sendViaResend(payload: TransactionalEmailPayload): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return false;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const from =
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      'AfriWonder <no-reply@afriwonder.app>';

    const attachments =
      payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })) ?? undefined;

    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? `<p>${escapeHtml(payload.text)}</p>`,
      ...(attachments?.length ? { attachments } : {}),
    });

    if (error) {
      logger.warn('Resend send failed', { message: error.message });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Resend send exception', { err });
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
