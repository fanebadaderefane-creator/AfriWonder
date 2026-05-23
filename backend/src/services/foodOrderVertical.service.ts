/**
 * Verticale « Restauration » — logique isolée (commandes, statuts, commission, notifications, temps réel).
 * Ne modifie pas les autres verticals ; s’appuie sur User/Wallet/Notification/Socket existants.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import ledgerService from './ledger.service.js';
import { computeFoodOrderSplit, roundMoney } from './foodOrderVertical.compute.js';

export { computeFoodOrderSplit, roundMoney } from './foodOrderVertical.compute.js';

export const FOOD_ORDER_STATUS = {
  pending: 'pending',
  accepted: 'accepted',
  preparing: 'preparing',
  courier_assigned: 'courier_assigned',
  delivering: 'delivering',
  delivered: 'delivered',
  cancelled: 'cancelled',
  rejected: 'rejected',
} as const;

export type FoodOrderStatus = (typeof FOOD_ORDER_STATUS)[keyof typeof FOOD_ORDER_STATUS];

const ADMIN_ROLES = new Set(['super_admin', 'admin', 'moderation_admin']);

export type MenuLineInput = { menu_item_id: string; quantity: number };

export async function sumMenuLinesVerified(restaurantId: string, lines: MenuLineInput[]): Promise<number> {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Panier vide');
  let subtotal = 0;
  for (const line of lines) {
    const q = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const mi = await prisma.menuItem.findFirst({
      where: { id: line.menu_item_id, restaurant_id: restaurantId, is_available: true },
    });
    if (!mi) throw new Error('Article indisponible ou inconnu');
    subtotal += mi.price * q;
  }
  return roundMoney(subtotal);
}

function getIO(): { to: (room: string) => { emit: (ev: string, data: unknown) => void } } | null {
  try {
    const { io } = require('../index.js');
    return io;
  } catch {
    return null;
  }
}

export function broadcastFoodOrderUpdate(payload: {
  customerId: string;
  restaurantOwnerId: string;
  deliveryPersonId?: string | null;
  orderId: string;
  status: string;
  restaurantId: string;
}): void {
  try {
    const io = getIO();
    if (!io || typeof io.to !== 'function') return;
    const body = {
      type: 'food_order:update',
      orderId: payload.orderId,
      status: payload.status,
      restaurantId: payload.restaurantId,
    };
    io.to(`user:${payload.customerId}`).emit('food_order:update', body);
    io.to(`user:${payload.restaurantOwnerId}`).emit('food_order:update', body);
    if (payload.deliveryPersonId) {
      io.to(`user:${payload.deliveryPersonId}`).emit('food_order:update', body);
    }
  } catch (e) {
    logger.warn('food_order socket broadcast skipped', { err: (e as Error).message });
  }
}

async function safeNotify(
  userId: string,
  type: string,
  title: string,
  message: string,
  referenceId: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        reference_id: referenceId,
        reference_type: 'food_order',
      },
    });
  } catch (e) {
    logger.warn('food_order notify', { err: (e as Error).message });
  }
}

const CUSTOMER_MSG: Partial<Record<FoodOrderStatus, { title: string; message: string }>> = {
  accepted: { title: 'Commande acceptée', message: 'Le restaurant prépare votre commande.' },
  rejected: { title: 'Commande refusée', message: 'Le restaurant n’a pas pu accepter cette commande.' },
  preparing: { title: 'En préparation', message: 'Votre commande est en cours de préparation.' },
  courier_assigned: { title: 'Livreur assigné', message: 'Un livreur a été assigné.' },
  delivering: { title: 'En livraison', message: 'Votre commande est en route.' },
  delivered: { title: 'Livrée', message: 'Commande livrée. Bon appétit !' },
  cancelled: { title: 'Commande annulée', message: 'La commande a été annulée.' },
};

export async function afterFoodOrderStatusChange(order: {
  id: string;
  status: string;
  customer_id: string;
  restaurant_id: string;
  delivery_person_id?: string | null;
  restaurant: { owner_id: string; name?: string | null };
}): Promise<void> {
  const st = order.status as FoodOrderStatus;
  const pack = CUSTOMER_MSG[st];
  if (pack) {
    await safeNotify(order.customer_id, `food_order_${st}`, pack.title, pack.message, order.id);
  }
  if (st === 'pending') {
    await safeNotify(
      order.restaurant.owner_id,
      'food_order_new',
      'Nouvelle commande repas',
      `Commande à traiter pour ${order.restaurant.name ?? 'votre restaurant'}.`,
      order.id,
    );
  }
  broadcastFoodOrderUpdate({
    customerId: order.customer_id,
    restaurantOwnerId: order.restaurant.owner_id,
    deliveryPersonId: order.delivery_person_id,
    orderId: order.id,
    status: order.status,
    restaurantId: order.restaurant_id,
  });
}

function assertRestaurantCanTrade(r: { account_status: string; is_verified: boolean; accepts_orders: boolean }) {
  if (r.account_status === 'suspended') throw new Error('Établissement suspendu');
  if (!r.is_verified) throw new Error('Restaurant non vérifié');
  if (!r.accepts_orders) throw new Error('Commandes indisponibles pour cet établissement');
}

/**
 * Applique les virements ledger (client → restaurant / livreur / trésorerie plateforme) une fois livré.
 * Opt-in via `FOOD_ORDER_APPLY_WALLET_SPLIT_ON_DELIVERED=true`. Idempotent (`split_applied_at`).
 */
export async function maybeApplyWalletSplitOnDelivered(orderId: string): Promise<void> {
  if (process.env.FOOD_ORDER_APPLY_WALLET_SPLIT_ON_DELIVERED !== 'true') return;

  const order = await prisma.foodOrder.findUnique({
    where: { id: orderId },
    include: { restaurant: { select: { owner_id: true } } },
  });
  if (!order || order.status !== FOOD_ORDER_STATUS.delivered) return;
  if (order.payment_method !== 'wallet') return;
  if (order.split_applied_at) return;

  const platformUserId = process.env.PLATFORM_TREASURY_USER_ID?.trim();
  const customerWallet = await ledgerService.getOrCreateUserWallet(order.customer_id, order.currency || 'XOF');
  const restaurantWallet = await ledgerService.getOrCreateUserWallet(order.restaurant.owner_id, order.currency || 'XOF');

  const total = roundMoney(Number(order.total_amount));
  const restPayout = roundMoney(Number(order.restaurant_payout_amount ?? 0));
  const courPayout = roundMoney(Number(order.courier_payout_amount ?? 0));
  const platFee = roundMoney(Number(order.platform_fee_amount ?? 0));

  if (restPayout + courPayout + platFee - total > 0.02) {
    logger.warn('food_order split mismatch', { orderId, total, restPayout, courPayout, platFee });
  }

  await ledgerService.debit(customerWallet.id, total, {
    referenceId: order.id,
    referenceType: 'order',
    description: `Paiement commande repas ${order.id}`,
  });

  if (restPayout > 0) {
    await ledgerService.credit(restaurantWallet.id, restPayout, {
      referenceId: order.id,
      referenceType: 'payout',
      description: `Revenus restaurant — commande ${order.id}`,
      updateTotals: { earnings: true },
    });
  }

  if (courPayout > 0 && order.delivery_person_id) {
    const cw = await ledgerService.getOrCreateUserWallet(order.delivery_person_id, order.currency || 'XOF');
    await ledgerService.credit(cw.id, courPayout, {
      referenceId: order.id,
      referenceType: 'payout',
      description: `Course livraison repas ${order.id}`,
      updateTotals: { earnings: true },
    });
  }

  if (platFee > 0 && platformUserId) {
    const pw = await ledgerService.getOrCreateUserWallet(platformUserId, order.currency || 'XOF');
    await ledgerService.credit(pw.id, platFee, {
      referenceId: order.id,
      referenceType: 'fee',
      description: `Commission plateforme repas ${order.id}`,
    });
  }

  await prisma.foodOrder.update({
    where: { id: orderId },
    data: { split_applied_at: new Date() },
  });
}

export type TransitionActor = {
  userId: string;
  role: string | undefined;
};

export async function transitionFoodOrderStatus(
  orderId: string,
  actor: TransitionActor,
  nextStatus: FoodOrderStatus,
  opts?: { delivery_person_id?: string; reject_reason?: string },
): Promise<{ order: Awaited<ReturnType<typeof prisma.foodOrder.findUnique>> }> {
  const order = await prisma.foodOrder.findUnique({
    where: { id: orderId },
    include: { restaurant: true },
  });
  if (!order) {
    const err = new Error('Commande non trouvée') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const ownerId = order.restaurant.owner_id;
  const isOwner = actor.userId === ownerId;
  const isAdmin = Boolean(actor.role && ADMIN_ROLES.has(actor.role));
  const isCustomer = actor.userId === order.customer_id;
  const isCourier = Boolean(order.delivery_person_id) && actor.userId === order.delivery_person_id;

  const cur = order.status as FoodOrderStatus;

  const allow = (): boolean => {
    if (isAdmin) return true;
    if (nextStatus === FOOD_ORDER_STATUS.cancelled) {
      return isCustomer && (cur === FOOD_ORDER_STATUS.pending || cur === FOOD_ORDER_STATUS.accepted);
    }
    if (nextStatus === FOOD_ORDER_STATUS.rejected) {
      return isOwner && cur === FOOD_ORDER_STATUS.pending;
    }
    if (nextStatus === FOOD_ORDER_STATUS.accepted) {
      return isOwner && cur === FOOD_ORDER_STATUS.pending;
    }
    if (nextStatus === FOOD_ORDER_STATUS.preparing) {
      return isOwner && cur === FOOD_ORDER_STATUS.accepted;
    }
    if (nextStatus === FOOD_ORDER_STATUS.courier_assigned) {
      return (isOwner || isAdmin) && (cur === FOOD_ORDER_STATUS.preparing || cur === FOOD_ORDER_STATUS.accepted);
    }
    if (nextStatus === FOOD_ORDER_STATUS.delivering) {
      return (isOwner || isCourier || isAdmin) && (cur === FOOD_ORDER_STATUS.courier_assigned || cur === FOOD_ORDER_STATUS.preparing);
    }
    if (nextStatus === FOOD_ORDER_STATUS.delivered) {
      return (isCourier || isOwner || isAdmin) && (cur === FOOD_ORDER_STATUS.delivering || cur === FOOD_ORDER_STATUS.courier_assigned);
    }
    return false;
  };

  if (!allow()) {
    const err = new Error('Transition non autorisée') as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }

  if (nextStatus === FOOD_ORDER_STATUS.accepted || nextStatus === FOOD_ORDER_STATUS.preparing) {
    assertRestaurantCanTrade(order.restaurant);
    if (order.restaurant.kyc_status === 'rejected') {
      const err = new Error('Établissement non conforme (KYC)') as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }
  }

  const data: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === FOOD_ORDER_STATUS.courier_assigned && opts?.delivery_person_id) {
    data.delivery_person_id = opts.delivery_person_id;
  }
  if (nextStatus === FOOD_ORDER_STATUS.delivered) {
    data.delivered_at = new Date();
  }
  if (nextStatus === FOOD_ORDER_STATUS.rejected && opts?.reject_reason) {
    data.special_requests = [order.special_requests, `Motif refus: ${opts.reject_reason}`].filter(Boolean).join('\n');
  }

  const updated = await prisma.foodOrder.update({
    where: { id: orderId },
    data: data as any,
    include: { restaurant: { select: { owner_id: true, name: true } } },
  });

  await afterFoodOrderStatusChange({
    id: updated.id,
    status: updated.status,
    customer_id: updated.customer_id,
    restaurant_id: updated.restaurant_id,
    delivery_person_id: updated.delivery_person_id,
    restaurant: updated.restaurant,
  });

  if (nextStatus === FOOD_ORDER_STATUS.delivered) {
    await maybeApplyWalletSplitOnDelivered(orderId);
  }

  return { order: updated };
}
