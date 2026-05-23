import { Router } from 'express';
import prisma from '../config/database.js';
import {
  AUDIT_ROADMAP_2026,
  AUDIT_ROADMAP_DISCLAIMER_FR,
  AUDIT_BACKEND_HOSTING,
  AUDIT_DATABASE_ENV_VAR,
} from '../config/auditRoadmap.js';
import { AUDIT_REPO_COMPLETION } from '../config/auditCompletion.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAnyAdmin } from '../middleware/adminRbac.js';
import platformRevenueService from '../services/platformRevenue.service.js';
import featureFlagService from '../services/featureFlag.service.js';

/** Clés de feature flags pour modules Phase 2 (cachés au lancement, réactivables en 1 clic) */
const LAUNCH_FEATURE_KEYS = [
  'FEATURE_TRANSPORT', 'FEATURE_FOOD', 'FEATURE_TELEMEDECINE', 'FEATURE_REALESTATE',
  'FEATURE_INSURANCE', 'FEATURE_UTILITIES', 'FEATURE_TICKETING', 'FEATURE_SERVICES',
  'FEATURE_EDUCATION', 'FEATURE_JOBS', 'FEATURE_CIVIC', 'FEATURE_CROWDFUNDING',
  'FEATURE_MICROCREDIT', 'FEATURE_NEWS', 'FEATURE_OFFLINE', 'FEATURE_QRCODE',
];

const router = Router();

// Configuration publique de base de la plateforme
// GET /api/platform/config
router.get('/config', (_req, res) => {
  const betaCap = Number(process.env.EARLY_ACCESS_MAX_USERS || process.env.BETA_MAX_USERS);
  const creatorTarget = Number(process.env.CREATOR_PARTNERS_TARGET || '100');
  const pilots = String(process.env.PILOT_COUNTRIES || 'SN,CI,ML')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  res.json({
    success: true,
    data: {
      name: 'AfriWonder',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      /** Alignement audit roadmap (affichage produit / apps) */
      roadmap: {
        /** Toujours Render pour ce dépôt (audit) — ne pas utiliser d’autre nom d’hébergeur ici. */
        backend_deployment: AUDIT_BACKEND_HOSTING,
        pwa_domain: 'https://afri-wonder.app',
        beta_max_users: Number.isFinite(betaCap) && betaCap > 0 ? betaCap : 500,
        creator_partners_target: Number.isFinite(creatorTarget) && creatorTarget > 0 ? creatorTarget : 100,
        pilot_countries: pilots.length ? pilots : ['SN', 'CI', 'ML'],
        seed_round_target_usd: { min: 500_000, max: 2_000_000 },
      },
      /** Phases 1–4 (texte officiel audit) — même contenu que docs/VISION_ET_ARCHITECTURE_CIBLE.md §10 */
      audit_roadmap: AUDIT_ROADMAP_2026,
      /** Évite d’interpréter la roadmap comme un certificat de complétion ; rappelle Render + DATABASE_URL */
      audit_roadmap_meta: {
        disclaimer_fr: AUDIT_ROADMAP_DISCLAIMER_FR,
        backend_hosting: AUDIT_BACKEND_HOSTING,
        database_env_var: AUDIT_DATABASE_ENV_VAR,
      },
      /** Booléens : ce qui est dans le dépôt vs actions manuelles — voir aussi `npm run verify:audit` */
      audit_repo_completion: AUDIT_REPO_COMPLETION,
    },
  });
});

// GET /api/platform/stats — Public, statistiques réelles pour Landing/About (sans auth)
router.get('/stats', async (_req, res, next) => {
  try {
    const [totalUsers, totalVideos, totalCreators] = await Promise.all([
      prisma.user.count({ where: { account_suspended: false } }),
      prisma.video.count(),
      prisma.user.count({ where: { account_suspended: false, videos: { some: {} } } }),
    ]);
    res.json({
      success: true,
      data: { totalUsers, totalVideos, totalCreators },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform/feature-flags — Public (ne jamais renvoyer 500 si DB indisponible)
router.get('/feature-flags', async (_req, res) => {
  try {
    const flags: Record<string, boolean> = {};
    for (const key of LAUNCH_FEATURE_KEYS) {
      flags[key] = await featureFlagService.isEnabled(key);
    }
    return res.json({ success: true, data: flags });
  } catch (error: unknown) {
    const fallback: Record<string, boolean> = {};
    for (const key of LAUNCH_FEATURE_KEYS) fallback[key] = false;
    return res.json({ success: true, data: fallback });
  }
});

// Toutes les routes sensibles ci-dessous nécessitent une authentification admin.

// GET /api/platform/revenue - Statistiques de revenus de la plateforme
router.get('/revenue', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await platformRevenueService.getRevenueStats(start, end);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform/revenue/:type - Revenus par type
router.get('/revenue/:type', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const revenue = await platformRevenueService.getRevenueByType(
      type as 'video_tips' | 'live_gifts' | 'marketplace' | 'subscriptions' | 'ads' | 'gifts_tips',
      start,
      end
    );

    res.json({
      success: true,
      data: revenue,
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/platform/wallet - Wallet de la plateforme
router.get('/wallet', authenticate, requireAnyAdmin, async (req: AuthRequest, res, next) => {
  try {
    const wallet = await platformRevenueService.getPlatformWallet();

    res.json({
      success: true,
      data: wallet,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;



