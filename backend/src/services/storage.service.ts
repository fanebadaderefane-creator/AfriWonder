/**
 * Abstraction stockage médias / CDN — prêt sans clés (sélection par `STORAGE_PROVIDER`).
 *
 * Variables :
 * - `STORAGE_PROVIDER` : `r2` | `s3` | `local` (auto si absent : R2 si complet, sinon local si `LOCAL_MEDIA_ROOT`)
 * - `CDN_BASE_URL` : URL publique des médias (override de `R2_PUBLIC_URL` pour CDN custom)
 * - R2 : `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`, `R2_BUCKET_NAME`
 * - S3 : `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (+ endpoint optionnel)
 * - Local : `LOCAL_MEDIA_ROOT` (répertoire persistant côté serveur) + `LOCAL_MEDIA_PUBLIC_BASE` pour URLs servies
 */
import { existsSync } from 'node:fs';
import { isR2Configured, R2_PUBLIC_URL } from '../config/cloudflare-r2.js';

export type StorageProviderName = 'r2' | 's3' | 'local' | 'none';

function sanitize(s: string | undefined): string {
  return (s ?? '').trim();
}

export function isS3CompatibleConfigured(): boolean {
  return Boolean(
    sanitize(process.env.AWS_S3_BUCKET)
      && sanitize(process.env.AWS_REGION)
      && sanitize(process.env.AWS_ACCESS_KEY_ID)
      && sanitize(process.env.AWS_SECRET_ACCESS_KEY),
  );
}

export function isLocalMediaRootConfigured(): boolean {
  const root = sanitize(process.env.LOCAL_MEDIA_ROOT);
  if (!root) return false;
  try {
    return existsSync(root);
  } catch {
    return false;
  }
}

/** Résout le fournisseur effectif (sans muter l’environnement). */
export function resolveStorageProviderFromEnv(): StorageProviderName {
  const raw = sanitize(process.env.STORAGE_PROVIDER).toLowerCase();
  if (raw === 'local' || raw === 'filesystem' || raw === 'disk') return 'local';
  if (raw === 's3' || raw === 'aws') return 's3';
  if (raw === 'r2' || raw === 'cloudflare') return 'r2';

  if (isR2Configured()) return 'r2';
  if (isS3CompatibleConfigured()) return 's3';
  if (isLocalMediaRootConfigured()) return 'local';
  return 'none';
}

/** Base publique CDN / médias (sans slash final). */
export function getCdnBaseUrl(): string {
  const explicit = sanitize(process.env.CDN_BASE_URL);
  if (explicit) return explicit.replace(/\/$/, '');
  const r2 = sanitize(R2_PUBLIC_URL);
  if (r2) return r2.replace(/\/$/, '');
  const localBase = sanitize(process.env.LOCAL_MEDIA_PUBLIC_BASE);
  return localBase.replace(/\/$/, '');
}

/** Au moins un backend peut servir / accepter des uploads médias. */
export function isMediaStorageOperational(): boolean {
  const p = resolveStorageProviderFromEnv();
  if (p === 'r2') return isR2Configured();
  if (p === 's3') return isS3CompatibleConfigured();
  if (p === 'local') return isLocalMediaRootConfigured();
  return false;
}

export function describeStorageReadiness(): string {
  const p = resolveStorageProviderFromEnv();
  const cdn = getCdnBaseUrl();
  if (p === 'r2' && isR2Configured()) {
    return `R2 actif; CDN_BASE_URL=${cdn ? 'défini' : 'via R2_PUBLIC_URL'}`;
  }
  if (p === 's3' && isS3CompatibleConfigured()) {
    return `S3 actif; CDN_BASE_URL=${cdn ? 'défini' : 'à renseigner pour URLs publiques'}`;
  }
  if (p === 'local' && isLocalMediaRootConfigured()) {
    return `Stockage local (${sanitize(process.env.LOCAL_MEDIA_ROOT)}); public=${cdn || 'LOCAL_MEDIA_PUBLIC_BASE ?'}`;
  }
  if (p === 'none') {
    return 'Aucun stockage prêt : définir R2, ou S3 (AWS_*), ou LOCAL_MEDIA_ROOT + STORAGE_PROVIDER=local';
  }
  return `Fournisseur ${p} incomplet — voir STORAGE_PROVIDER / CDN_BASE_URL`;
}
