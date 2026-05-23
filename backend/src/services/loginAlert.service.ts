import type { Request } from 'express';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendViaResend } from '../utils/transactionalEmail.js';

const UA_MAX = 512;
const DEVICE_ID_MAX = 128;
/** Pas d’e-mail « nouvelle connexion » juste après création du compte (évite doublon avec mail de bienvenue). */
const NEW_ACCOUNT_QUIET_MS = 5 * 60 * 1000;

export type AuthRequestMeta = {
  userAgent: string;
  clientIp: string;
  deviceId: string | null;
};

export function extractAuthRequestMeta(req: Pick<Request, 'get' | 'ip' | 'socket'>): AuthRequestMeta {
  const userAgent = String(req.get('user-agent') || '').trim().slice(0, UA_MAX);
  const xff = req.get('x-forwarded-for');
  const firstIp = (xff?.split(',')[0] || '').trim() || String(req.ip || '').trim() || '';
  const socketIp = req.socket?.remoteAddress ? String(req.socket.remoteAddress).trim() : '';
  const clientIp = firstIp || socketIp || 'inconnue';
  const rawDevice =
    req.get('x-afw-device-id')?.trim() ||
    req.get('x-device-id')?.trim() ||
    req.get('expo-device-id')?.trim() ||
    '';
  const deviceId = rawDevice ? rawDevice.slice(0, DEVICE_ID_MAX) : null;
  return { userAgent, clientIp, deviceId };
}

/**
 * Après une authentification réussie : enregistre / met à jour `UserSession`,
 * envoie un e-mail si la préférence est activée et que l’empreinte est nouvelle.
 * Ne bloque pas la réponse HTTP (appel depuis les routes avec `void`).
 */
export async function postAuthLoginAlertFromRequest(userId: string, req: Pick<Request, 'get' | 'ip' | 'socket'>): Promise<void> {
  try {
    const meta = extractAuthRequestMeta(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        login_alerts_enabled: true,
        created_at: true,
      },
    });
    if (!user) return;

    const ua = meta.userAgent || '—';
    const deviceId = meta.deviceId;

    const whereKnown: { user_id: string; OR?: Array<{ device_id?: string; user_agent?: string }> } = {
      user_id: userId,
    };
    if (deviceId) {
      whereKnown.OR = [{ device_id: deviceId }, { user_agent: ua }];
    } else {
      whereKnown.OR = [{ user_agent: ua }];
    }

    const existing = await prisma.userSession.findFirst({
      where: whereKnown,
      orderBy: { last_seen: 'desc' },
    });

    let isNewFingerprint = true;
    if (existing) {
      isNewFingerprint = false;
      await prisma.userSession.update({
        where: { id: existing.id },
        data: {
          last_seen: new Date(),
          user_agent: ua,
          ...(deviceId ? { device_id: deviceId } : {}),
        },
      });
    } else {
      await prisma.userSession.create({
        data: {
          user_id: userId,
          user_agent: ua,
          device_id: deviceId,
        },
      });
    }

    const accountVeryNew = Date.now() - user.created_at.getTime() < NEW_ACCOUNT_QUIET_MS;
    if (!user.login_alerts_enabled || !isNewFingerprint || accountVeryNew) {
      return;
    }

    const when = new Date().toLocaleString('fr-FR', { timeZone: 'UTC' }) + ' UTC';
    const subject = 'Nouvelle connexion à votre compte AfriWonder';
    const text =
      `Bonjour${user.full_name ? ` ${user.full_name}` : ''},\n\n` +
      `Une connexion vient d'être enregistrée sur votre compte AfriWonder depuis un navigateur ou un appareil que nous n'avions pas vu récemment pour ce compte.\n\n` +
      `Aperçu navigateur / appareil : ${ua.slice(0, 200)}\n` +
      `Adresse IP : ${meta.clientIp}\n` +
      `Date / heure : ${when}\n\n` +
      `Si c'est bien vous, vous pouvez ignorer ce message.\n` +
      `Si ce n'est pas vous, changez immédiatement votre mot de passe et activez la validation en deux étapes (Paramètres → Sécurité).\n\n` +
      `— AfriWonder\n`;

    const html =
      `<p>Bonjour${user.full_name ? ` ${escapeHtml(user.full_name)}` : ''},</p>` +
      `<p>Une connexion vient d'être enregistrée sur votre compte <strong>AfriWonder</strong> depuis un navigateur ou un appareil <strong>nouveau pour ce compte</strong>.</p>` +
      `<ul><li><strong>Navigateur / appareil (aperçu) :</strong> ${escapeHtml(ua.slice(0, 300))}</li>` +
      `<li><strong>Adresse IP :</strong> ${escapeHtml(meta.clientIp)}</li>` +
      `<li><strong>Date / heure :</strong> ${escapeHtml(when)}</li></ul>` +
      `<p>Si c'est bien vous, ignorez cet e-mail. Sinon, changez votre mot de passe et activez la validation en deux étapes.</p>`;

    const sent = await sendViaResend({
      to: user.email,
      subject,
      text,
      html,
    });
    if (!sent) {
      logger.warn('login_alert: e-mail non envoyé (provider indisponible ou non configuré)', { userId });
    }
  } catch (e) {
    logger.warn('postAuthLoginAlertFromRequest', { userId, err: e instanceof Error ? e.message : String(e) });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
