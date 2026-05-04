export type RemixKind = 'duet' | 'stitch' | 'remix';

export interface RemixSeed {
  remixOfId: string;
  kind: RemixKind;
  /** Nom du créateur source affiché dans la bannière (sans @). */
  sourceCreatorUsername?: string | null;
  sourceTitle?: string | null;
}

const VALID_KINDS = new Set<RemixKind>(['duet', 'stitch', 'remix']);

export function isValidRemixKind(value: unknown): value is RemixKind {
  return typeof value === 'string' && VALID_KINDS.has(value as RemixKind);
}

export function safeRemixKind(value: unknown, fallback: RemixKind = 'remix'): RemixKind {
  return isValidRemixKind(value) ? value : fallback;
}

export function normalizeRemixSeed(input: {
  remixOfId?: unknown;
  kind?: unknown;
  sourceCreatorUsername?: unknown;
  sourceTitle?: unknown;
}): RemixSeed | null {
  const rawId = String(input.remixOfId ?? '').trim();
  if (!rawId) return null;
  if (rawId.length > 64) return null;
  return {
    remixOfId: rawId,
    kind: safeRemixKind(input.kind),
    sourceCreatorUsername:
      typeof input.sourceCreatorUsername === 'string'
        ? input.sourceCreatorUsername.replace(/^@+/, '').slice(0, 30)
        : null,
    sourceTitle:
      typeof input.sourceTitle === 'string' ? input.sourceTitle.slice(0, 120) : null,
  };
}

/**
 * Affiche un texte d'invite par type de remix (utilisé dans la bannière "Vous réagissez à @user").
 */
export function remixActionLabel(kind: RemixKind): string {
  if (kind === 'duet') return 'Duo';
  if (kind === 'stitch') return 'Collage';
  return 'Remix';
}

export function remixActionHint(kind: RemixKind): string {
  if (kind === 'duet') return 'Filmez à côté de la vidéo originale (côté à côté).';
  if (kind === 'stitch') return 'Reprenez un extrait avant de réagir avec la vôtre.';
  return 'Réutilisez la vidéo originale comme base de votre nouvelle création.';
}

export interface RemixApiPayload {
  remix_of_id: string;
  remix_kind: RemixKind;
}

export function buildRemixApiPayload(seed: RemixSeed | null | undefined): RemixApiPayload | null {
  if (!seed) return null;
  return { remix_of_id: seed.remixOfId, remix_kind: seed.kind };
}

/**
 * Construit les query params pour ouvrir l'écran "+" en mode remix.
 * Exemple: { remix_of_id: 'v_123', remix_kind: 'duet' } → '?remix_of=v_123&remix_kind=duet'
 */
export function buildRemixDeepLinkParams(seed: RemixSeed): Record<string, string> {
  const out: Record<string, string> = {
    remix_of: seed.remixOfId,
    remix_kind: seed.kind,
  };
  if (seed.sourceCreatorUsername) out.remix_username = seed.sourceCreatorUsername;
  if (seed.sourceTitle) out.remix_title = seed.sourceTitle;
  return out;
}

export function readRemixSeedFromParams(params: Record<string, unknown>): RemixSeed | null {
  const remixOfId = params.remix_of ?? params.remix_of_id ?? params.remixOfId;
  if (!remixOfId) return null;
  return normalizeRemixSeed({
    remixOfId,
    kind: params.remix_kind ?? params.remixKind,
    sourceCreatorUsername: params.remix_username ?? params.remixUsername,
    sourceTitle: params.remix_title ?? params.remixTitle,
  });
}
