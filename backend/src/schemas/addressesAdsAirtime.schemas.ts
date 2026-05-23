import { z } from 'zod';

const AD_DURATION_DAYS = [1, 3, 7, 14, 30, 60, 90] as const;

const adDurationDaysSchema = z.number().int().refine((n) => (AD_DURATION_DAYS as readonly number[]).includes(n), {
  message: `duration_days invalide (${AD_DURATION_DAYS.join(', ')})`,
});

// --- Addresses ---

export const addressCreateBodySchema = z.object({
  street: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(200),
  country: z.string().trim().min(1).max(100).optional(),
  postal_code: z.string().trim().max(32).optional(),
  phone: z.string().trim().max(40).optional(),
  type: z.string().trim().max(32).optional(),
  is_default: z.boolean().optional(),
});

export const addressUpdateBodySchema = z.object({
  street: z.string().trim().min(1).max(500).optional(),
  city: z.string().trim().min(1).max(200).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  postal_code: z.string().trim().max(32).optional(),
  phone: z.string().trim().max(40).optional(),
  type: z.string().trim().max(32).optional(),
  is_default: z.boolean().optional(),
});

// --- Airtime ---

export const airtimeRechargeBodySchema = z.object({
  phone_number: z.string().min(5).max(32),
  operator: z.string().trim().min(1).max(64),
  amount: z.coerce.number().positive().finite().max(1_000_000),
  payment_method: z.enum(['wallet', 'mobile_money', 'card']).optional(),
  recipient_name: z.string().trim().max(200).optional(),
  is_self_recharge: z.boolean().optional(),
});

// --- Ads (events + campagnes + créatifs) ---

export const adsImpressionClickBodySchema = z.object({
  creative_id: z.string().min(1).max(64),
  campaign_id: z.string().min(1).max(64),
  device_id: z.string().min(1).max(128).optional(),
});

export const adsReportBodySchema = z.object({
  campaign_id: z.string().min(1).max(64),
  reason: z.string().trim().min(1).max(4000),
});

export const adsCampaignCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  ad_type: z.string().trim().max(64).optional(),
  duration_days: adDurationDaysSchema,
  target_countries: z.array(z.string().trim().min(1).max(8)).max(200).optional(),
  target_cities: z.array(z.string().trim().min(1).max(128)).max(500).optional(),
  target_age_min: z.number().int().min(0).max(120).optional(),
  target_age_max: z.number().int().min(0).max(120).optional(),
  target_gender: z.string().trim().max(32).optional(),
  target_interests: z.array(z.string().trim().max(128)).max(200).optional(),
});

export const adsCampaignUpdateBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  duration_days: adDurationDaysSchema.optional(),
});

export const adsCreativeBodySchema = z.object({
  media_type: z.enum(['video', 'image']),
  media_url: z.string().trim().min(1).max(2048),
  thumbnail_url: z.string().trim().min(1).max(2048).optional(),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  cta_type: z.enum(['buy', 'visit', 'install', 'whatsapp', 'contact']).optional(),
  cta_url: z.string().trim().min(1).max(2048).optional(),
  cta_label: z.string().trim().max(120).optional(),
});

export const adsCampaignRejectBodySchema = z.preprocess(
  (raw) => (raw != null && typeof raw === 'object' ? raw : {}),
  z.object({
    reason: z.string().trim().max(4000).optional(),
  })
);
