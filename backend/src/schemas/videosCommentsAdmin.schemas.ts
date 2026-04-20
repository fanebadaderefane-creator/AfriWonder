import { z } from 'zod';

// --- Comments (module /api/comments + patch sous /api/videos) ---

export const commentContentPatchSchema = z
  .object({
    content: z.string().min(1).max(10000).optional(),
    is_pinned: z.boolean().optional(),
  })
  .refine((d) => d.content !== undefined || d.is_pinned !== undefined, {
    message: 'content ou is_pinned requis',
  });

// --- Videos ---

export const videoRecordViewSchema = z.object({
  watchSeconds: z.coerce.number().min(0).max(86400).optional(),
  watchPercent: z.coerce.number().min(0).max(100).optional(),
  deviceId: z.string().max(128).optional(),
  scrollSlow: z.boolean().optional(),
  interactionDetected: z.boolean().optional(),
});

export const videoCreateBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  video_url: z.string().min(1).max(2048),
  thumbnail_url: z.string().max(2048).optional(),
  visibility: z.string().max(32).optional(),
  category: z.string().max(64).optional(),
  hashtags: z.array(z.string().max(100)).max(50).optional(),
  music_title: z.string().max(200).optional(),
  /** JSON stringifié : métadonnées éditeur (filtres, overlays, découpe, vitesse, etc.). */
  editor_metadata: z.string().max(16000).optional(),
  media_type: z.enum(['video', 'image']).optional(),
  remix_of_id: z.string().max(64).optional(),
  remix_kind: z.enum(['duet', 'stitch']).optional(),
  challenge_id: z.string().max(64).optional().nullable(),
  poll_options: z.array(z.string().min(1).max(200)).min(2).max(4).optional(),
  comment_subscribers_first: z.boolean().optional(),
  subtitle_url: z.string().max(2048).optional(),
  download_allowed: z.boolean().optional(),
  is_premium: z.boolean().optional(),
  comments_disabled: z.boolean().optional(),
  comment_visibility: z.string().max(32).optional(),
  hide_likes: z.boolean().optional(),
  scheduled_at: z.union([z.string().max(80), z.number(), z.null()]).optional(),
  /** ISO 639-1 (`fr`, `en`, `bm`, `wo`, `ar`, …) — passé tel quel au champ Video.editor_metadata si non stocké directement. */
  language: z.string().max(8).optional(),
});

export const videoUpdateBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(10000).optional(),
    visibility: z.string().max(32).optional(),
    category: z.string().max(64).optional(),
    is_featured: z.boolean().optional(),
    hashtags: z.array(z.string().max(100)).max(50).optional(),
    music_title: z.string().max(200).optional(),
    thumbnail_url: z.string().max(2048).optional(),
    comments_disabled: z.boolean().optional(),
    comment_visibility: z.string().max(32).optional(),
    comment_subscribers_first: z.boolean().optional(),
    hide_likes: z.boolean().optional(),
    scheduled_at: z.union([z.string().max(80), z.number(), z.null()]).optional(),
    remix_kind: z.enum(['duet', 'stitch']).optional().nullable(),
    challenge_id: z.string().max(64).optional().nullable(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Au moins un champ de mise à jour est requis',
  });

export const videoTrimBodySchema = z.object({
  trim_start_sec: z.coerce.number().nonnegative().optional(),
  trim_end_sec: z.coerce.number().nonnegative().optional(),
});

export const videoReactionTypeBodySchema = z.object({
  type: z.string().max(32).optional().default('like'),
});

export const videoPollCreateBodySchema = z.object({
  options: z.array(z.string().min(1).max(200)).min(2).max(4),
});

export const videoPollVoteBodySchema = z.object({
  option_index: z.coerce.number().int().min(0).max(3),
});

export const commentReactionBodySchema = z.object({
  type: z.string().max(32).optional().default('like'),
});

const audioUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((s) => /^https?:\/\//i.test(s), { message: 'audio_url doit être une URL http(s)' })
  .optional()
  .nullable();

/** Texte et/ou vocal : au moins l’un des deux est requis. */
export const videoAddCommentBodySchema = z
  .object({
    content: z.string().max(10000).optional().default(''),
    audio_url: audioUrlSchema,
    parent_id: z.string().max(64).optional().nullable(),
  })
  .refine((d) => Boolean(String(d.content || '').trim()) || Boolean(d.audio_url?.trim()), {
    message: 'Contenu texte ou audio_url requis',
  });

export const videoTipBodySchema = z.object({
  amount: z.coerce.number().min(50).max(1e9),
  phone: z.string().min(8).max(24),
  message: z.string().max(500).optional(),
});

export const videoTipWalletBodySchema = z.object({
  amount: z.coerce.number().min(50).max(1e9),
  message: z.string().max(500).optional(),
});

export const videoChapterBodySchema = z.object({
  title: z.string().min(1).max(200),
  start_time_sec: z.coerce.number().nonnegative(),
  end_time_sec: z.coerce.number().nonnegative().optional().nullable(),
});

export const videoSubtitlesGenerateBodySchema = z.object({
  source: z.enum(['auto', 'manual']).optional().default('auto'),
});

export const videoSubtitlesPatchBodySchema = z.object({
  subtitle_url: z.union([z.string().max(2048), z.null()]).optional(),
});

// --- Admin ---

export const adminUserRoleBodySchema = z.object({
  role: z.string().min(1).max(64),
});

export const adminBanUserBodySchema = z.object({
  banType: z.string().min(1).max(64),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
});

export const adminSellerStatusBodySchema = z.object({
  status: z.string().min(1).max(64),
});

export const adminSellerVerifyBodySchema = z.object({
  is_verified: z.boolean(),
});

export const adminVerificationPatchBodySchema = z
  .object({
    status: z.enum(['approved', 'rejected']).optional(),
    approved: z.boolean().optional(),
    set_seller_verified: z.boolean().optional(),
  })
  .refine((d) => d.status !== undefined || d.approved !== undefined, {
    message: 'status ou approved requis',
  });

export const adminProductStatusBodySchema = z.object({
  status: z.string().min(1).max(64),
});

export const adminLogisticsRateCreateBodySchema = z.object({
  provider: z.string().min(1).max(120),
  destination_country: z.string().min(2).max(8),
  base_cost: z.coerce.number().nonnegative(),
  cost_per_kg: z.coerce.number().nonnegative(),
  estimated_delivery_days: z.coerce.number().int().positive().max(365),
  is_active: z.boolean().optional(),
});

export const adminLogisticsRateUpdateBodySchema = z
  .object({
    provider: z.string().min(1).max(120).optional(),
    destination_country: z.string().min(2).max(8).optional(),
    base_cost: z.coerce.number().nonnegative().optional(),
    cost_per_kg: z.coerce.number().nonnegative().optional(),
    estimated_delivery_days: z.coerce.number().int().positive().max(365).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Au moins un champ de mise à jour est requis',
  });

export const adminPickupPointCreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(120),
  country: z.string().min(2).max(8),
  is_active: z.boolean().optional(),
});

export const adminPickupPointUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().min(1).max(500).optional(),
    city: z.string().min(1).max(120).optional(),
    country: z.string().min(2).max(8).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Au moins un champ de mise à jour est requis',
  });

export const adminBackupTriggerBodySchema = z.object({
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
});

export const adminKillSwitchBodySchema = z.object({
  marketplace_enabled: z.boolean().optional(),
  payments_enabled: z.boolean().optional(),
  videos_enabled: z.boolean().optional(),
  ride_enabled: z.boolean().optional(),
  food_enabled: z.boolean().optional(),
  health_enabled: z.boolean().optional(),
  insurance_enabled: z.boolean().optional(),
  events_enabled: z.boolean().optional(),
  maintenance_mode: z.boolean().optional(),
  emergency_mode: z.boolean().optional(),
});

export const adminCrowdfundingSuspendBodySchema = z.object({
  reason: z.string().max(2000).optional(),
  fraudFlag: z.boolean().optional(),
});

export const adminUserSuspendBodySchema = z.object({
  suspended: z.boolean(),
  reason: z.string().max(2000).optional().nullable(),
});

export const adminBlacklistBodySchema = z.object({
  type: z.enum(['user', 'device', 'ip']),
  value: z.string().min(1).max(512),
  reason: z.string().max(1000).optional(),
  expires_at: z.union([z.string().max(80), z.number()]).optional(),
});

export const adminFeatureFlagBodySchema = z.object({
  enabled: z.boolean(),
});

export const adminCommissionConfigBodySchema = z.object({
  overrides: z.record(z.string(), z.unknown()),
  merge: z.boolean().optional(),
});

export const adminMonetizationRejectBodySchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const adminBannedWordBodySchema = z.object({
  word: z.string().min(2).max(200),
});

export const adminBannedWordPatchBodySchema = z.object({
  is_active: z.boolean(),
});

const experimentVariantSchema = z.object({
  variant_key: z.string().min(1).max(64),
  traffic_pct: z.coerce.number().min(0).max(100),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const adminExperimentCreateBodySchema = z.object({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  variants: z.array(experimentVariantSchema).max(20).optional().default([]),
});
