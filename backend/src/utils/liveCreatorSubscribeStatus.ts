/** Logique pure statut abonnement live créateur (tests sans Prisma). */
export function getCreatorSubscribeStatusPure(row: {
  status: string;
  amount_fcfa: number | null;
  next_billing_at: Date | null;
} | null) {
  const active = row?.status === 'active';
  return {
    subscribed: active,
    amount_fcfa: active ? row?.amount_fcfa ?? null : null,
    next_billing_at: active ? row?.next_billing_at ?? null : null,
  };
}
