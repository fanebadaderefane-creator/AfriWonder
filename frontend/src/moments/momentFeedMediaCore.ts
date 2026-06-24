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

export function rowImageUrl(row: Record<string, unknown>): string {
  return String(
    row.image_url
    || row.imageUrl
    || row.url
    || row.file_url
    || row.fileUrl
    || row.src
    || '',
  ).trim();
}

export function parseImagesField(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s) as unknown;
      return Array.isArray(j) ? (j as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function collectMomentMediaUrls(row: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const push = (raw: unknown) => {
    if (isSkippableMomentMediaUrl(raw)) return;
    const s = String(raw).trim();
    if (s) urls.push(s);
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

export function collectPostImageUrlsFromApi(
  p: Record<string, unknown>,
  normalize: (raw: string) => string,
  isRenderable: (raw: string) => boolean,
): string[] {
  const rows = parseImagesField(p.images ?? p.Images ?? p.post_images);
  rows.sort((a, b) => {
    const pa = Number(a.position ?? a.Position ?? 0);
    const pb = Number(b.position ?? b.Position ?? 0);
    return pa - pb;
  });
  const fromRows = rows.map(rowImageUrl).filter((u) => isRenderable(u));
  const legacyRaw = String(p.image_url || p.imageUrl || '').trim();
  const legacy = isRenderable(legacyRaw) ? legacyRaw : '';
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const u of fromRows) {
    const norm = normalize(u);
    if (!seen.has(norm)) {
      seen.add(norm);
      ordered.push(norm);
    }
  }
  if (legacy) {
    const norm = normalize(legacy);
    if (!seen.has(norm)) ordered.unshift(norm);
  }
  return ordered;
}

export function momentPostIsDisplayable(content: string, images: string[]): boolean {
  if (content.trim()) return true;
  return images.length > 0;
}
