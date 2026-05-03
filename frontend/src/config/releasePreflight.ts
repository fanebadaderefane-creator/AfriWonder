import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  getBackendOrigin,
  MISSING_BACKEND_URL_SENTINEL,
} from './backendBase';
import { applyAfriDeviceTrustToFetchInit } from '../utils/afwDeviceRequestId';

export type PreflightCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

function readExtra(name: string): string {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return String(extra?.[name] ?? process.env[name] ?? '').trim();
}

function resolveSocketUrlForDisplay(): string {
  const raw = readExtra('EXPO_PUBLIC_SOCKET_URL');
  if (raw) return raw.replace(/\/+$/, '');
  return getBackendOrigin() || '(web: même origine que la page)';
}

export async function runReleasePreflight(): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];

  const backend = getBackendOrigin();
  const backendConfigured = Boolean(backend && backend !== MISSING_BACKEND_URL_SENTINEL);
  checks.push({
    id: 'backend_origin',
    label: 'Origine API (EXPO_PUBLIC_BACKEND_URL)',
    ok: backendConfigured,
    detail: backendConfigured ? backend : 'Manquant ou sentinelle — configurez EAS / .env',
  });

  const socketUrl = resolveSocketUrlForDisplay();
  const socketSecure =
    socketUrl.startsWith('wss://') ||
    socketUrl.startsWith('https://') ||
    Platform.OS === 'web';
  checks.push({
    id: 'socket_url',
    label: 'Socket temps réel',
    ok: backendConfigured && (socketSecure || socketUrl.includes('localhost')),
    detail: readExtra('EXPO_PUBLIC_SOCKET_URL')
      ? `EXPO_PUBLIC_SOCKET_URL=${socketUrl}`
      : `Dérivé du backend : ${socketUrl}`,
  });

  let healthOk = false;
  let healthDetail = 'Non testé';
  if (backendConfigured) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      const res = await fetch(
        `${backend.replace(/\/+$/, '')}/health`,
        applyAfriDeviceTrustToFetchInit({ method: 'GET', signal: ac.signal }),
      );
      clearTimeout(t);
      healthOk = res.ok;
      healthDetail = `${res.status} ${res.statusText}`.trim();
    } catch (e) {
      healthDetail = e instanceof Error ? e.message : String(e);
    }
  }
  checks.push({
    id: 'health',
    label: 'GET /health (API joignable)',
    ok: healthOk,
    detail: healthDetail,
  });

  if (backendConfigured && healthOk) {
    let mobileDetail = 'Non testé';
    let mobileOk = false;
    let caps: Record<string, boolean> | null = null;
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      const res = await fetch(
        `${backend.replace(/\/+$/, '')}/api/mobile/health`,
        applyAfriDeviceTrustToFetchInit({ method: 'GET', signal: ac.signal }),
      );
      clearTimeout(t);
      mobileOk = res.ok;
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as {
          data?: { capabilities?: Record<string, boolean> };
        } | null;
        caps = body?.data?.capabilities ?? null;
        mobileDetail = caps
          ? `agora=${caps.agora_rtc ? 'OK' : 'non'} · turn=${caps.turn ? 'OK' : 'non'} · expo_push=${caps.push_expo ? 'OK' : '—'}`
          : 'Réponse sans capabilities';
      } else {
        mobileDetail = `HTTP ${res.status}`;
      }
    } catch (e) {
      mobileDetail = e instanceof Error ? e.message : String(e);
    }
    checks.push({
      id: 'mobile_health',
      label: 'GET /api/mobile/health (Agora / TURN / push)',
      ok: mobileOk,
      detail: mobileDetail,
    });
    if (caps) {
      checks.push({
        id: 'cap_live',
        label: 'Live RTC (Agora + TURN recommandé)',
        ok: Boolean(caps.agora_rtc && caps.turn),
        detail: caps.agora_rtc
          ? caps.turn
            ? 'Agora et TURN configurés côté serveur'
            : 'Agora OK — ajoutez TURN pour réseaux mobiles / NAT'
          : 'Configurer AGORA_APP_ID + AGORA_APP_CERTIFICATE sur le backend',
      });
    }
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const pid = typeof projectId === 'string' ? projectId.trim() : '';
  const pushReady =
    Platform.OS === 'web' ||
    (pid.length > 0 && pid !== '00000000-0000-4000-8000-000000000000');
  checks.push({
    id: 'eas_project',
    label: 'Expo Push (extra.eas.projectId)',
    ok: pushReady,
    detail:
      Platform.OS === 'web'
        ? 'Web : push distant optionnel'
        : pushReady
          ? `projectId=${pid.slice(0, 8)}…`
          : 'Définir EXPO_PUBLIC_EAS_PROJECT_ID ou extra.eas.projectId pour FCM via Expo',
  });
  checks.push({
    id: 'sentry_dsn',
    label: 'Sentry mobile (EXPO_PUBLIC_SENTRY_DSN) — directive post-lancement',
    ok: Boolean(readExtra('EXPO_PUBLIC_SENTRY_DSN')),
    detail: readExtra('EXPO_PUBLIC_SENTRY_DSN')
      ? 'DSN configuré (crash JS natifs remontés en prod si build release)'
      : 'Recommandé avant store : définir EXPO_PUBLIC_SENTRY_DSN + alerts équipe',
  });

  return checks;
}
