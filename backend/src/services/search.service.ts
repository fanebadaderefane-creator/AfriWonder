/**
 * Service de recherche globale — CDC Super-App AfriWonder.
 * Unifie la recherche vidéos, utilisateurs, produits (et optionnelement hashtags)
 * en un seul point d'entrée pour l'API et le frontend.
 */

import { videoService } from './video.service.js';
import userService from './user.service.js';
import productService from './product.service.js';
import { logger } from '../utils/logger.js';
import prisma from '../config/database.js';

export type GlobalSearchType = 'all' | 'videos' | 'users' | 'products' | 'sounds';

export interface GlobalSearchOptions {
  q: string;
  type?: GlobalSearchType;
  page?: number;
  limitPerType?: number;
  category?: string;
  hashtag?: string;
  userId?: string;
  /** Filtre durée vidéo: short (<1min), medium (1-10min), long (>10min) */
  duration?: 'all' | 'short' | 'medium' | 'long';
}

/** Sons / musiques utilisés sur des vidéos (`music_title`), agrégés pour la recherche globale. */
export interface SoundSearchHit {
  title: string;
  video_count: number;
  sample_video_id: string | null;
}

export interface GlobalSearchResult {
  videos: any[];
  users: any[];
  products: any[];
  sounds: SoundSearchHit[];
  meta: {
    query: string;
    type: GlobalSearchType;
    total: number;
    counts: { videos: number; users: number; products: number; sounds: number };
  };
}

export interface SuggestResult {
  users: any[];
  videos: any[];
}

const DEFAULT_LIMIT_PER_TYPE = 20;
const DEFAULT_SUGGEST_LIMIT = 8;

function normalizeSearchText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function textIncludesTerm(text: unknown, term: string): boolean {
  return normalizeSearchText(text).includes(term);
}

async function searchSoundOrigins(term: string, limit: number): Promise<SoundSearchHit[]> {
  const t = term.trim();
  if (t.length < 1) return [];
  try {
    const rows = await prisma.video.findMany({
      where: {
        visibility: 'public',
        music_title: { not: null, contains: t, mode: 'insensitive' },
      },
      select: { id: true, music_title: true },
      take: 400,
    });
    const agg = new Map<string, { title: string; count: number; sampleId: string | null }>();
    for (const r of rows) {
      const title = String(r.music_title || '').trim();
      if (!title) continue;
      const key = title.toLowerCase();
      const cur = agg.get(key) || { title, count: 0, sampleId: r.id };
      cur.count += 1;
      if (!cur.sampleId) cur.sampleId = r.id;
      agg.set(key, cur);
    }
    return Array.from(agg.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((x) => ({
        title: x.title,
        video_count: x.count,
        sample_video_id: x.sampleId,
      }));
  } catch (err) {
    logger.warn('search.service searchSoundOrigins failed', { err: (err as Error)?.message });
    return [];
  }
}

/**
 * Recherche globale : interroge en parallèle vidéos, utilisateurs, produits
 * et retourne un objet unifié. Respecte le filtre type (all | videos | users | products | sounds).
 */
export async function globalSearch(options: GlobalSearchOptions): Promise<GlobalSearchResult> {
  const {
    q,
    type = 'all',
    page = 1,
    limitPerType = DEFAULT_LIMIT_PER_TYPE,
    category,
    hashtag,
    userId,
    duration,
  } = options;

  const term = (q || '').trim();
  const searchTermForUsers = term.replace(/^@+/, '');
  const isHashtag = /^#?\w+$/.test(term);
  const hashtagForApi = isHashtag ? term.replace(/^#/, '').toLowerCase() : '';

  const limit = Math.min(Math.max(1, limitPerType), 50);

  const shouldSearchVideos = type === 'all' || type === 'videos';
  const shouldSearchUsers = type === 'all' || type === 'users';
  const shouldSearchProducts = type === 'all' || type === 'products';
  const shouldSearchSounds = type === 'all' || type === 'sounds';

  const [videosResult, usersResult, productsResult, soundsResult] = await Promise.all([
    shouldSearchVideos && term.length >= 1
      ? videoService
          .list({
            page: 1,
            limit,
            visibility: 'public',
            userId,
            search: hashtagForApi ? undefined : term,
            hashtag: hashtagForApi || hashtag,
            category: category || undefined,
          })
          .then((r) => (Array.isArray(r) ? r : r?.videos || []))
          .catch((err) => {
            logger.warn('search.service globalSearch videos failed', { err: (err as Error)?.message });
            return [];
          })
      : Promise.resolve([]),
    shouldSearchUsers && searchTermForUsers.length >= 2
      ? userService
          .list(page, limit, searchTermForUsers)
          .then((r) => r?.users || [])
          .catch((err) => {
            logger.warn('search.service globalSearch users failed', { err: (err as Error)?.message });
            return [];
          })
      : Promise.resolve([]),
    shouldSearchProducts && term.length >= 1
      ? productService
          .list({
            page: 1,
            limit,
            search: term,
            category: category || undefined,
          })
          .then((r) => (Array.isArray(r) ? r : r?.products || []))
          .catch((err) => {
            logger.warn('search.service globalSearch products failed', { err: (err as Error)?.message });
            return [];
          })
      : Promise.resolve([]),
    shouldSearchSounds && term.length >= 1 ? searchSoundOrigins(term, limit) : Promise.resolve([] as SoundSearchHit[]),
  ]);

  let videos = Array.isArray(videosResult) ? videosResult : [];
  let users = Array.isArray(usersResult) ? usersResult : [];
  let products = Array.isArray(productsResult) ? productsResult : [];
  let sounds = Array.isArray(soundsResult) ? soundsResult : [];

  const normalizedTerm = normalizeSearchText(term.replace(/^#/, ''));

  // Fallback accent-insensitive si la recherche SQL/Prisma ne matche pas (ex: "Drole" vs "Drôle")
  if (normalizedTerm && normalizedTerm.length >= 2) {
    if (shouldSearchVideos && videos.length === 0) {
      const broadVideos = await videoService
        .list({
          page: 1,
          limit: 120,
          visibility: 'public',
          userId,
          category: category || undefined,
          hashtag: hashtagForApi || hashtag,
        })
        .then((r) => (Array.isArray(r) ? r : r?.videos || []))
        .catch(() => []);

      videos = broadVideos.filter((v: any) =>
        textIncludesTerm(v?.title, normalizedTerm) ||
        textIncludesTerm(v?.description, normalizedTerm) ||
        textIncludesTerm(v?.music_title, normalizedTerm) ||
        (Array.isArray(v?.video_hashtags) && v.video_hashtags.some((h: any) => textIncludesTerm(h?.tag_name, normalizedTerm)))
      );
    }

    if (shouldSearchUsers && users.length === 0) {
      const broadUsers = await userService
        .list(page, 120, '')
        .then((r) => r?.users || [])
        .catch(() => []);

      users = broadUsers.filter((u: any) =>
        textIncludesTerm(u?.username, normalizedTerm) ||
        textIncludesTerm(u?.full_name, normalizedTerm) ||
        textIncludesTerm(u?.email, normalizedTerm)
      );
    }

    if (shouldSearchProducts && products.length === 0) {
      const broadProducts = await productService
        .list({
          page: 1,
          limit: 120,
          category: category || undefined,
        })
        .then((r) => (Array.isArray(r) ? r : r?.products || []))
        .catch(() => []);

      products = broadProducts.filter((p: any) =>
        textIncludesTerm(p?.name, normalizedTerm) ||
        textIncludesTerm(p?.title, normalizedTerm) ||
        textIncludesTerm(p?.description, normalizedTerm)
      );
    }
  }

  if (duration && duration !== 'all' && videos.length > 0) {
    videos = videos.filter((v) => {
      const d = v.duration ?? 0;
      if (duration === 'short') return d < 60;
      if (duration === 'medium') return d >= 60 && d <= 600;
      if (duration === 'long') return d > 600;
      return true;
    });
  }

  if (type === 'sounds') {
    videos = [];
    users = [];
    products = [];
  }

  const total = videos.length + users.length + products.length + sounds.length;

  return {
    videos,
    users,
    products,
    sounds,
    meta: {
      query: term,
      type,
      total,
      counts: {
        videos: videos.length,
        users: users.length,
        products: products.length,
        sounds: sounds.length,
      },
    },
  };
}

/**
 * Suggestions pour autocomplete : utilisateurs et vidéos (limite réduite).
 */
export async function suggest(options: { q: string; limit?: number }): Promise<SuggestResult> {
  const { q, limit = DEFAULT_SUGGEST_LIMIT } = options;
  const term = (q || '').trim().replace(/^@+/, '');
  const take = Math.min(Math.max(1, limit), 20);

  if (term.length < 2) {
    return { users: [], videos: [] };
  }

  const [usersResult, videosResult] = await Promise.all([
    userService
      .list(1, take, term)
      .then((r) => r?.users || [])
      .catch(() => []),
    videoService
      .list({
        page: 1,
        limit: take,
        visibility: 'public',
        search: term,
      })
      .then((r) => (Array.isArray(r) ? r : r?.videos || []))
      .catch(() => []),
  ]);

  return {
    users: Array.isArray(usersResult) ? usersResult.slice(0, take) : [],
    videos: Array.isArray(videosResult) ? videosResult.slice(0, take) : [],
  };
}
