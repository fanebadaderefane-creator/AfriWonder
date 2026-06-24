/** URLs média invalides, dev local ou données de test — ne pas exposer dans le fil Moments. */
export function isSkippableMomentMediaUrl(url: unknown): boolean {
  const s = String(url ?? '').trim();
  if (!s || s === 'null' || s === 'undefined') return true;
  const lower = s.toLowerCase();
  if (lower.startsWith('blob:') || lower.startsWith('file:') || lower.startsWith('exp:')) return true;
  if (lower.includes('example.com')) return true;
  if (lower.includes('cdn.afriwonder.test')) return true;
  if (lower.includes('via.placeholder')) return true;
  if (lower.includes('placeholder.com')) return true;
  if (lower.includes('picsum.photos')) return true;
  if (lower.includes('pravatar.cc')) return true;
  if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+/i.test(lower)) return true;
  return false;
}

/** Comptes créés par les tests E2E Playwright (`registerE2eUser`). */
export function isE2eTestAccountUser(user: {
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
}): boolean {
  const email = String(user.email ?? '').trim().toLowerCase();
  if (email.endsWith('@example.com')) return true;
  const username = String(user.username ?? '').trim().toLowerCase();
  if (/^(e2e|img|vid|follower|buyer|seller|stranger)[_.]/i.test(username)) return true;
  const fullName = String(user.full_name ?? '').trim();
  if (/^E2E\b/i.test(fullName)) return true;
  return false;
}

export function collectMomentMediaUrls(row: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const push = (raw: unknown) => {
    if (isSkippableMomentMediaUrl(raw)) return;
    const v = String(raw).trim();
    if (v) urls.push(v);
  };

  push(row.image_url ?? row.imageUrl);

  const images = row.images ?? row.Images ?? row.post_images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === 'string') push(img);
      else if (img && typeof img === 'object') {
        const o = img as Record<string, unknown>;
        push(o.image_url ?? o.imageUrl ?? o.url ?? o.file_url);
      }
    }
  }

  return [...new Set(urls)];
}

/** Garde les posts avec texte, sondage ou au moins une image valide. */
export function momentRowIsDisplayable(row: Record<string, unknown>): boolean {
  const user = (row.user ?? row.creator) as Record<string, unknown> | undefined;
  if (user && isE2eTestAccountUser(user as { email?: string; username?: string; full_name?: string })) {
    return false;
  }
  const text = String(row.text ?? '').trim();
  if (text) return true;
  if (row.poll) return true;
  return collectMomentMediaUrls(row).length > 0;
}

/** Post orphelin : image déclarée mais aucune URL exploitable (anciens uploads dev). */
export function isBrokenImageOnlyMomentRow(row: Record<string, unknown>): boolean {
  const text = String(row.text ?? '').trim();
  if (text || row.poll) return false;
  const hadImageIntent =
    Boolean(row.image_url ?? row.imageUrl)
    || (Array.isArray(row.images) && row.images.length > 0);
  if (!hadImageIntent) return false;
  return collectMomentMediaUrls(row).length === 0;
}
