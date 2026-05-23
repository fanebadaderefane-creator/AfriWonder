import { z } from 'zod';

// --- Cart ---

export const cartAddBodySchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(1).max(9999),
});

export const cartUpdateBodySchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(0).max(9999),
});

export const cartCouponBodySchema = z.object({
  couponCode: z.string().min(1).max(64),
});

// --- Notifications ---

export const notificationPreferencesBodySchema = z.object({
  email_like: z.boolean().optional(),
  email_comment: z.boolean().optional(),
  email_follow: z.boolean().optional(),
  email_order: z.boolean().optional(),
  email_live: z.boolean().optional(),
  sms_like: z.boolean().optional(),
  sms_comment: z.boolean().optional(),
  sms_order: z.boolean().optional(),
  push_like: z.boolean().optional(),
  push_comment: z.boolean().optional(),
  push_follow: z.boolean().optional(),
  push_order: z.boolean().optional(),
  push_live: z.boolean().optional(),
});

export const pushSubscribeBodySchema = z.object({
  endpoint: z.string().min(1).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().min(1).max(2048),
});

// --- Products (marketplace) ---

export const productQuestionAnswerBodySchema = z.object({
  answer: z.string().min(1).max(8000),
});

export const productGroupBuyCreateBodySchema = z.object({
  min_quantity: z.coerce.number().int().min(2).max(10000).optional(),
});

export const productAuctionCreateBodySchema = z
  .object({
    start_price: z.coerce.number().positive().max(1e12),
    end_at: z.union([z.string().min(4).max(80), z.number()]),
  })
  .refine((d) => !Number.isNaN(new Date(d.end_at as string | number).getTime()), {
    path: ['end_at'],
    message: 'end_at doit être une date valide (ISO ou timestamp)',
  });

export const productAuctionBidBodySchema = z.object({
  amount: z.coerce.number().positive().max(1e12),
});

const productVariantSchema = z.object({
  name: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  price_diff: z.coerce.number().optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

export const productCreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(50000),
  price: z.coerce.number().positive().max(1e12),
  stock: z.coerce.number().int().min(0).optional(),
  category: z.string().max(64).optional(),
  subcategory: z.string().max(64).optional(),
  product_type: z.string().max(64).optional(),
  status: z.string().max(32).optional(),
  currency: z.string().max(8).optional(),
  brand: z.string().max(120).optional(),
  condition: z.string().max(64).optional(),
  images: z.array(z.string().max(2048)).min(5).max(40),
  delivery_options: z.array(z.string().max(64)).max(30).optional(),
  video_url: z.string().max(2048).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  weight_kg: z.coerce.number().nonnegative().optional(),
  negotiable_price: z.boolean().optional(),
  valid_until: z.union([z.string().max(80), z.number()]).optional(),
  is_merchandising: z.boolean().optional(),
  variants: z.array(productVariantSchema).max(50).optional(),
});

export const productUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(50000).optional(),
    price: z.coerce.number().positive().max(1e12).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    category: z.string().max(64).optional(),
    subcategory: z.string().max(64).optional(),
    product_type: z.string().max(64).optional(),
    status: z.string().max(32).optional(),
    currency: z.string().max(8).optional(),
    brand: z.string().max(120).optional(),
    condition: z.string().max(64).optional(),
    images: z.array(z.string().max(2048)).max(40).optional(),
    delivery_options: z.array(z.string().max(64)).max(30).optional(),
    video_url: z.string().max(2048).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    weight_kg: z.coerce.number().nonnegative().optional(),
    negotiable_price: z.boolean().optional(),
    valid_until: z.union([z.string().max(80), z.number(), z.null()]).optional(),
    is_merchandising: z.boolean().optional(),
    is_preorder: z.boolean().optional(),
    preorder_available_at: z.union([z.string().max(80), z.number(), z.null()]).optional(),
    variants: z.array(productVariantSchema).max(50).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Au moins un champ de mise à jour est requis',
  })
  .refine((d) => d.images === undefined || d.images.length >= 5, {
    message: 'Au moins 5 images si le champ images est fourni',
    path: ['images'],
  });

export const productStockPatchBodySchema = z.object({
  quantity: z.coerce.number().int().min(0).max(1e9),
});

export const productAlertBodySchema = z
  .object({
    alert_type: z.enum(['price', 'stock']),
    target_price: z.coerce.number().positive().max(1e12).optional(),
  })
  .refine((d) => d.alert_type !== 'price' || d.target_price != null, {
    message: 'target_price requis pour alert_type price',
    path: ['target_price'],
  });

export const productOfferBodySchema = z.object({
  offered_price: z.coerce.number().positive().max(1e12),
});

export const productPreorderBodySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99).optional().default(1),
});

export const productPromotionBodySchema = z.object({
  discount: z.coerce.number().min(0).max(100),
  startDate: z.union([z.string().max(80), z.number()]),
  endDate: z.union([z.string().max(80), z.number()]),
  phone: z.string().min(8).max(24),
});

export const productFlashSaleBodySchema = z.object({
  discount: z.coerce.number().min(0).max(100),
  startTime: z.union([z.string().max(80), z.number()]),
  endTime: z.union([z.string().max(80), z.number()]),
  stockLimit: z.coerce.number().int().min(1).max(1e9),
  phone: z.string().min(8).max(24),
});

export const productQuestionCreateBodySchema = z.object({
  question: z.string().min(1).max(4000),
});
