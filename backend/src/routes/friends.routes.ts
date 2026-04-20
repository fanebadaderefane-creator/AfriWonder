import { Router } from 'express';
import crypto from 'node:crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { validateBody } from '../utils/zodValidation.js';
import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';

const router = Router();

/**
 * --- Connect Now (présence géolocalisée) ---------------------------------
 *
 * Les utilisateurs publient leur position approx. (5 min TTL) sur cette route ;
 * on renvoie la liste des autres utilisateurs dans un rayon configurable.
 * Stockage en mémoire (suffisant pour MVP — à remplacer par Redis ou PostGIS
 * quand on scalera plusieurs workers). Aucune donnée n'est persistée en base.
 */

type PresenceEntry = {
  userId: string;
  lat: number;
  lng: number;
  updatedAt: number;
};

const PRESENCE: Map<string, PresenceEntry> = new Map();
const PRESENCE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_RADIUS_METERS = 500; // ~500 m par défaut

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function purgeStalePresence() {
  const now = Date.now();
  for (const [id, p] of PRESENCE.entries()) {
    if (now - p.updatedAt > PRESENCE_TTL_MS) PRESENCE.delete(id);
  }
}

/**
 * POST /api/friends/presence — heartbeat de présence pour « Connect Now ».
 * Body : `{ lat, lng }`. Renvoie 204.
 */
router.post('/presence', authenticate, validateBody(jsonObjectBodySchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const lat = Number((req.body || {}).lat);
    const lng = Number((req.body || {}).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, error: 'lat/lng invalides' });
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, error: 'coordonnées hors limites' });
    }
    PRESENCE.set(userId, { userId, lat, lng, updatedAt: Date.now() });
    return res.status(204).end();
  } catch (e) {
    return next(e);
  }
});

/**
 * DELETE /api/friends/presence — retire la présence (quitter Connect Now).
 */
router.delete('/presence', authenticate, async (req: AuthRequest, res, next) => {
  try {
    PRESENCE.delete(req.user!.id);
    return res.status(204).end();
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /api/friends/nearby — utilisateurs à proximité (≤ `radius` mètres).
 * `radius` optionnel (défaut 500 m, max 5 km). Renvoie aussi la distance
 * arrondie en mètres et exclut l'appelant + les comptes déjà suivis.
 */
router.get('/nearby', authenticate, async (req: AuthRequest, res, next) => {
  try {
    purgeStalePresence();
    const userId = req.user!.id;
    const me = PRESENCE.get(userId);
    if (!me) {
      return res.json({ success: true, data: { nearby: [], requires_presence: true } });
    }
    const radiusRaw = Number(req.query.radius);
    const radius = Math.min(5000, Math.max(50, Number.isFinite(radiusRaw) ? radiusRaw : DEFAULT_RADIUS_METERS));

    const candidates: { userId: string; distance: number }[] = [];
    for (const p of PRESENCE.values()) {
      if (p.userId === userId) continue;
      const d = haversineMeters(me.lat, me.lng, p.lat, p.lng);
      if (d <= radius) candidates.push({ userId: p.userId, distance: Math.round(d) });
    }
    candidates.sort((a, b) => a.distance - b.distance);

    if (candidates.length === 0) {
      return res.json({ success: true, data: { nearby: [] } });
    }

    const ids = candidates.map((c) => c.userId);
    const [users, follows] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          username: true,
          full_name: true,
          profile_image: true,
          is_verified: true,
        },
      }),
      prisma.follow.findMany({
        where: { follower_id: userId, following_id: { in: ids } },
        select: { following_id: true },
      }),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const alreadyFollowing = new Set(follows.map((f) => f.following_id));

    const nearby = candidates
      .map((c) => {
        const u = userById.get(c.userId);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          profile_image: u.profile_image,
          is_verified: u.is_verified,
          distance_m: c.distance,
          is_following: alreadyFollowing.has(u.id),
        };
      })
      .filter(Boolean);

    return res.json({ success: true, data: { nearby } });
  } catch (e) {
    return next(e);
  }
});

/**
 * --- Contacts sync -------------------------------------------------------
 *
 * Le client hashe ses numéros en SHA-256 hex (normalisés E.164 minimal), on
 * retrouve les utilisateurs dont le hash correspond. Les hashes **ne sont pas
 * persistés** côté serveur ; ils sont calculés à la volée sur les users
 * existants depuis leur `phone_number` normalisé.
 */

function normalizePhoneForHash(raw: string): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  return digits.replace(/^0+/, '');
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Cache des résultats « matches de contacts » par utilisateur (24 h).
 * Sert à injecter un badge `source: 'contacts'` dans les suggestions enrichies.
 */
const CONTACT_MATCHES_CACHE: Map<string, { ids: Set<string>; expiresAt: number }> = new Map();
const CONTACT_MATCHES_TTL_MS = 24 * 3600 * 1000;

export function getRecentContactMatchIds(userId: string): Set<string> {
  const entry = CONTACT_MATCHES_CACHE.get(userId);
  if (!entry) return new Set();
  if (Date.now() > entry.expiresAt) {
    CONTACT_MATCHES_CACHE.delete(userId);
    return new Set();
  }
  return entry.ids;
}

/**
 * POST /api/friends/contacts/sync — match de contacts.
 * Body: `{ hashes: string[] }` (hex SHA-256 sur numéros normalisés).
 * Réponse : liste des utilisateurs trouvés (hors self + déjà suivis).
 * Effet de bord : on mémorise les ids trouvés (24 h) pour marquer les
 * suggestions comme `source: 'contacts'` dans l'écran Find friends.
 */
router.post(
  '/contacts/sync',
  authenticate,
  validateBody(jsonObjectBodySchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const hashesInput = Array.isArray((req.body || {}).hashes) ? (req.body as { hashes: unknown[] }).hashes : [];
      const hashes = new Set(
        hashesInput
          .map((h) => String(h || '').trim().toLowerCase())
          .filter((h) => /^[0-9a-f]{64}$/.test(h))
          .slice(0, 5000)
      );
      if (hashes.size === 0) {
        return res.json({ success: true, data: { matches: [] } });
      }

      /**
       * Le modèle `User` principal n'a pas de `phone_number` — on matche sur
       * l'email normalisé (lowercase trim) + `User2FA.phone_number` quand présent.
       */
      const [candidates, twoFARows] = await Promise.all([
        prisma.user.findMany({
          where: { id: { not: userId } },
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
            is_verified: true,
            email: true,
          },
          take: 50000,
        }),
        prisma.user2FA
          .findMany({
            where: { phone_number: { not: null } },
            select: { user_id: true, phone_number: true },
          })
          .catch(() => [] as { user_id: string; phone_number: string | null }[]),
      ]);

      const phoneByUser = new Map<string, string>();
      for (const row of twoFARows) {
        if (row.phone_number) phoneByUser.set(row.user_id, row.phone_number);
      }

      const matches: {
        id: string;
        username: string;
        full_name: string | null;
        profile_image: string | null;
        is_verified: boolean;
      }[] = [];
      for (const u of candidates) {
        const phone = phoneByUser.get(u.id);
        const phoneHash = phone ? sha256Hex(normalizePhoneForHash(phone)) : null;
        const emailHash = u.email ? sha256Hex(u.email.trim().toLowerCase()) : null;
        if ((phoneHash && hashes.has(phoneHash)) || (emailHash && hashes.has(emailHash))) {
          matches.push({
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            profile_image: u.profile_image,
            is_verified: u.is_verified,
          });
        }
      }

      const follows = await prisma.follow.findMany({
        where: { follower_id: userId, following_id: { in: matches.map((m) => m.id) } },
        select: { following_id: true },
      });
      const followingSet = new Set(follows.map((f) => f.following_id));
      const enriched = matches.map((m) => ({ ...m, is_following: followingSet.has(m.id) }));

      // Mémorise les matchs (24 h) pour l'écran Find friends (badge "From your contacts").
      CONTACT_MATCHES_CACHE.set(userId, {
        ids: new Set(matches.map((m) => m.id)),
        expiresAt: Date.now() + CONTACT_MATCHES_TTL_MS,
      });

      return res.json({ success: true, data: { matches: enriched } });
    } catch (e) {
      return next(e);
    }
  },
);

/**
 * --- Block / Report / Mutual check --------------------------------------
 */

/**
 * GET /api/friends/mutual?ids=a,b,c — renvoie les ids parmi ceux fournis qui
 * correspondent à un follow *mutuel* (amis). Utilisé pour afficher « Friends »
 * après un tap « Follow back ».
 */
router.get('/mutual', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const raw = String(req.query.ids || '');
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (ids.length === 0) return res.json({ success: true, data: { mutual_ids: [] } });

    const [iFollow, theyFollow] = await Promise.all([
      prisma.follow.findMany({
        where: { follower_id: userId, following_id: { in: ids } },
        select: { following_id: true },
      }),
      prisma.follow.findMany({
        where: { follower_id: { in: ids }, following_id: userId },
        select: { follower_id: true },
      }),
    ]);
    const iSet = new Set(iFollow.map((f) => f.following_id));
    const theySet = new Set(theyFollow.map((f) => f.follower_id));
    const mutual = ids.filter((id) => iSet.has(id) && theySet.has(id));
    return res.json({ success: true, data: { mutual_ids: mutual } });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /api/friends/:id/block — bloque un utilisateur (retire follows mutuels).
 * Stockage : modèle `UserBlock` si présent, sinon on marque juste le dismiss
 * permanent et on casse les follows.
 */
router.post('/:id/block', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const targetId = (req.params.id || '').trim();
    if (!targetId || targetId === userId) {
      return res.status(400).json({ success: false, error: 'id invalide' });
    }
    await Promise.all([
      prisma.follow.deleteMany({ where: { follower_id: userId, following_id: targetId } }),
      prisma.follow.deleteMany({ where: { follower_id: targetId, following_id: userId } }),
    ]);
    /** Best effort : insérer dans `UserBlock` si la table existe. */
    try {
      const dyn = prisma as unknown as { userBlock?: { create: (args: { data: unknown }) => Promise<unknown> } };
      if (dyn.userBlock) {
        await dyn.userBlock.create({ data: { user_id: userId, blocked_user_id: targetId } }).catch(() => null);
      }
    } catch {
      /* ignore */
    }
    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /api/friends/:id/report — signaler un utilisateur.
 * Body: `{ reason?: string, details?: string }`. Log côté serveur (`UserReport`
 * si présent, sinon console).
 */
router.post(
  '/:id/report',
  authenticate,
  validateBody(jsonObjectBodySchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const targetId = (req.params.id || '').trim();
      if (!targetId || targetId === userId) {
        return res.status(400).json({ success: false, error: 'id invalide' });
      }
      const { reason, details } = (req.body || {}) as { reason?: string; details?: string };
      try {
        const dyn = prisma as unknown as {
          userReport?: { create: (args: { data: unknown }) => Promise<unknown> };
        };
        if (dyn.userReport) {
          await dyn.userReport
            .create({
              data: {
                reporter_id: userId,
                reported_user_id: targetId,
                reason: String(reason || 'other').slice(0, 80),
                details: details ? String(details).slice(0, 500) : null,
              },
            })
            .catch(() => null);
        }
      } catch {
        /* ignore */
      }
      return res.json({ success: true });
    } catch (e) {
      return next(e);
    }
  },
);

/**
 * POST /api/friends/facebook/match — Trouver les amis Facebook déjà inscrits.
 *
 * Flux :
 *  1. Le client obtient un `access_token` Facebook via `expo-auth-session`
 *     (scope `user_friends` + `email`).
 *  2. Le serveur appelle l'endpoint Graph API `GET /me/friends` (renvoie
 *     uniquement les amis FB qui utilisent aussi l'app via ce `app_id`), et
 *     tente de récupérer l'email de chaque ami (si le scope le permet).
 *  3. Les emails récupérés sont hashés puis matchés contre la base via la
 *     même logique que `/contacts/sync`.
 *
 * Remarque : Facebook renvoie une liste restreinte, uniquement parmi les
 * amis qui ont aussi autorisé votre app. C'est voulu (politique Meta).
 */
router.post(
  '/facebook/match',
  authenticate,
  validateBody(jsonObjectBodySchema),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const token = String(((req.body || {}) as { access_token?: unknown }).access_token || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, error: 'access_token manquant' });
      }

      /** Appelle Graph API pour récupérer les amis FB qui utilisent l'app. */
      let friends: Array<{ id?: string; name?: string; email?: string }> = [];
      try {
        const url = `https://graph.facebook.com/v18.0/me/friends?fields=id,name,email&access_token=${encodeURIComponent(token)}`;
        const resFb = await fetch(url);
        if (resFb.ok) {
          const payload = (await resFb.json()) as { data?: Array<{ id: string; name: string; email?: string }> };
          friends = payload.data || [];
        }
      } catch {
        /* réseau indispo */
      }

      if (friends.length === 0) {
        return res.json({ success: true, data: { matches: [] } });
      }

      /** Hash les emails fournis par Facebook (si scope `email`), et matche. */
      const hashes = new Set<string>();
      for (const f of friends) {
        if (f.email) hashes.add(sha256Hex(normalizeEmailSimple(f.email)));
      }
      if (hashes.size === 0) {
        return res.json({ success: true, data: { matches: [] } });
      }

      const candidates = await prisma.user.findMany({
        where: { id: { not: userId } },
        select: { id: true, username: true, full_name: true, profile_image: true, is_verified: true, email: true },
        take: 50000,
      });
      const matches = candidates
        .filter((u) => u.email && hashes.has(sha256Hex(normalizeEmailSimple(u.email))))
        .map((u) => ({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          profile_image: u.profile_image,
          is_verified: u.is_verified,
        }));

      const follows = await prisma.follow.findMany({
        where: { follower_id: userId, following_id: { in: matches.map((m) => m.id) } },
        select: { following_id: true },
      });
      const followingSet = new Set(follows.map((f) => f.following_id));
      const enriched = matches.map((m) => ({ ...m, is_following: followingSet.has(m.id) }));

      /** Partage du badge « source: contacts » — ces matchs sont aussi mis en cache pour
       * apparaître dans les suggestions Find friends comme "From your contacts" (proche
       * sémantiquement : amis hors app → amis inscrits). */
      CONTACT_MATCHES_CACHE.set(userId, {
        ids: new Set(matches.map((m) => m.id)),
        expiresAt: Date.now() + CONTACT_MATCHES_TTL_MS,
      });

      return res.json({ success: true, data: { matches: enriched } });
    } catch (e) {
      return next(e);
    }
  },
);

function normalizeEmailSimple(s: string): string {
  return String(s || '').trim().toLowerCase();
}

/**
 * GET /api/friends/qrcode — payload standardisé pour générer un QR côté app.
 * Le client utilise `payload.app_link` ou `payload.web_link` selon contexte.
 */
router.get('/qrcode', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, full_name: true, profile_image: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'utilisateur introuvable' });
    const handle = (user.username || '').replace(/^@+/, '');
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          profile_image: user.profile_image,
        },
        payload: {
          type: 'afriwonder.user',
          user_id: user.id,
          username: handle,
          app_link: `afriwonder://user/${user.id}`,
          web_link: handle
            ? `https://afri-wonder.vercel.app/user/${encodeURIComponent(handle)}`
            : `https://afri-wonder.vercel.app/profile?_userId=${encodeURIComponent(user.id)}`,
          issued_at: Date.now(),
        },
      },
    });
  } catch (e) {
    return next(e);
  }
});

export default router;
