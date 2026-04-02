import { z } from 'zod';

// --- Privacy (RGPD / cookies / 2FA) ---

export const privacyCookieConsentSchema = z.object({
  essential: z.boolean().optional(),
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  functional: z.boolean().optional(),
  social_media: z.boolean().optional(),
});

export const privacyGuestCookieSchema = z.object({
  session_id: z.string().min(1).max(256),
  essential: z.boolean().optional(),
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  functional: z.boolean().optional(),
  social_media: z.boolean().optional(),
});

export const privacyExportDataSchema = z.object({
  format: z
    .string()
    .max(16)
    .optional()
    .transform((f) => {
      const x = (f || 'json').toLowerCase();
      return x === 'csv' ? 'csv' : 'json';
    }),
});

export const privacyDeleteAccountSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const privacy2faEnableSchema = z.object({
  method: z.string().min(1).max(32),
  phone_number: z.string().max(32).optional(),
});

export const privacy2faVerifySchema = z.object({
  code: z.string().min(4).max(16),
});

export const privacy2faDisableSchema = z.object({
  password: z.string().min(1).max(256),
});

// --- Messages (DM + groupes) ---

export const messagesSendSchema = z.object({
  recipientId: z.string().min(1).max(64),
  content: z.string().max(50000).optional().default(''),
  type: z.string().max(32).optional(),
  media_url: z.string().max(2048).optional(),
  thumbnail_url: z.string().max(2048).optional(),
  reply_to_message_id: z.string().max(64).optional(),
  is_ephemeral: z.boolean().optional(),
  expires_at: z.union([z.string().max(80), z.number()]).optional(),
  scheduled_at: z.union([z.string().max(80), z.number()]).optional(),
  location_lat: z.coerce.number().optional(),
  location_lng: z.coerce.number().optional(),
  location_label: z.string().max(500).optional(),
  contact_user_id: z.string().max(64).optional(),
  contact_name: z.string().max(200).optional(),
  sticker_url: z.string().max(2048).optional(),
  poll_options: z.array(z.string().max(500)).max(30).optional(),
  event_id: z.string().max(64).optional(),
  e2ee_envelope: z.record(z.string(), z.unknown()).optional(),
});

export const messagesConversationArchiveSchema = z.object({
  archived: z.boolean(),
});

export const messagesConversationDraftSchema = z.object({
  content: z.union([z.string().max(50000), z.null()]).optional(),
});

export const messagesConversationNotificationsSchema = z.object({
  muted: z.boolean(),
});

export const messagesPollVoteSchema = z.object({
  option_index: z.coerce.number().int().min(0),
});

export const messagesMetaSchema = z.object({
  is_pinned: z.boolean().optional(),
  is_important: z.boolean().optional(),
});

export const messagesEditContentSchema = z.object({
  content: z.string().max(50000),
});

export const messagesReactionSchema = z.object({
  emoji: z.string().min(1).max(64),
});

export const messagesGroupCreateSchema = z.object({
  name: z.string().max(120).optional(),
  memberIds: z.array(z.string().min(1).max(64)).max(500).optional().default([]),
});

export const messagesGroupInviteJoinSchema = z.object({
  token: z.string().min(8).max(512),
});

export const messagesGroupPatchSchema = z.object({
  name: z.string().max(120).nullable().optional(),
  avatar_url: z.string().max(2048).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const messagesGroupNotificationsSchema = z.object({
  muted: z.boolean(),
});

export const messagesGroupDisplayTagSchema = z.object({
  group_display_tag: z.union([z.string().max(64), z.null()]).optional(),
});

export const messagesGroupSendSchema = z.object({
  content: z.string().max(50000).optional().default(''),
  type: z.string().max(32).optional(),
  media_url: z.string().max(2048).optional(),
  thumbnail_url: z.string().max(2048).optional(),
  reply_to_id: z.string().max(64).optional(),
  poll_options: z.array(z.string().max(500)).max(30).optional(),
  event_id: z.string().max(64).optional(),
  scheduled_at: z.union([z.string().max(80), z.number()]).optional(),
  forward_from_message_id: z.string().max(64).optional(),
  e2ee_envelope: z.record(z.string(), z.unknown()).optional(),
  e2ee_envelopes: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
});

export const messagesGroupMembersSchema = z.object({
  userIds: z
    .union([z.array(z.string().min(1).max(64)).max(200), z.string().min(1).max(64)])
    .transform((v) => (Array.isArray(v) ? v : [v])),
});

export const messagesGroupMessageEditSchema = z.object({
  content: z.string().max(50000),
});

// --- Live ---

export const liveWalletRechargeSchema = z.object({
  amount: z.coerce.number().positive().max(1e9),
  phone: z.union([z.string().min(8).max(24), z.null()]).optional(),
});

export const liveCreatorSubscribeSchema = z.object({
  amount: z.coerce.number().positive().max(1e9).optional(),
});

export const liveStartSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  category: z.string().max(64).optional(),
  streamUrl: z.string().max(2048).optional(),
  thumbnail_url: z.string().max(2048).optional(),
  stream_key: z.string().max(256).optional(),
  rtmp_url: z.string().max(2048).optional(),
  playback_url: z.string().max(2048).optional(),
  region: z.string().max(32).optional(),
  language: z.string().max(32).optional(),
  status: z.enum(['scheduled', 'live']).optional(),
  scheduled_at: z.union([z.string().max(80), z.number(), z.null()]).optional(),
  tags: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null) return undefined;
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
        return [];
      },
      z.array(z.string().max(64)).max(50).optional()
    ),
  age_restriction: z.string().max(32).optional(),
  donations_enabled: z.boolean().optional(),
  private_mode: z.boolean().optional(),
  goal_target: z.coerce.number().nonnegative().max(1e12).optional(),
  delay_seconds: z.coerce.number().int().min(0).max(86400).optional(),
  max_quality: z.string().max(32).optional(),
});

export const liveSessionBodySchema = z.object({
  sessionId: z.union([z.string().max(256), z.number()]).optional(),
  country: z.string().max(16).optional(),
});

export const liveEndSchema = z.object({
  replay_url: z.string().max(2048).optional(),
});

export const liveChatSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const liveTipSchema = z.object({
  amount: z.coerce.number().positive().max(1e9),
  message: z.string().max(500).optional(),
  is_anonymous: z.boolean().optional(),
});

export const liveGiftSchema = z.object({
  giftId: z.union([z.string().max(64), z.number()]).transform((v) => String(v)),
  giftName: z.string().max(200).optional(),
  giftIcon: z.string().max(2048).optional(),
  amount: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().positive().max(999).optional().default(1),
  message: z.string().max(500).optional(),
});

export const liveReactionSchema = z.object({
  type: z.enum(['like', 'heart', 'fire', 'thumbs']).optional().default('like'),
});

export const liveChapterSchema = z.object({
  title: z.string().min(1).max(200),
  start_seconds: z.coerce.number().nonnegative(),
  end_seconds: z.coerce.number().nonnegative(),
});

export const liveModerationPatchSchema = z.object({
  slow_mode_seconds: z.coerce.number().int().min(0).max(3600).optional(),
  comments_enabled: z.boolean().optional(),
  followers_only: z.boolean().optional(),
  banned_words: z.array(z.string().max(80)).max(300).optional(),
});
