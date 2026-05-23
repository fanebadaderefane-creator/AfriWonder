import crypto from 'crypto';
import prisma from '../config/database.js';

const QR_TOKEN_BYTES = 24;
const DEFAULT_TTL_SEC = 15 * 60; // 15 min

export async function createPaymentRequest(fromUserId: string, amount: number, currency: string = 'XOF', ttlSec?: number) {
  const expiresAt = new Date(Date.now() + (ttlSec ?? DEFAULT_TTL_SEC) * 1000);
  const qrToken = crypto.randomBytes(QR_TOKEN_BYTES).toString('base64url');
  const request = await prisma.paymentRequest.create({
    data: {
      from_user_id: fromUserId,
      amount,
      currency,
      qr_token: qrToken,
      expires_at: expiresAt,
    },
  });
  return {
    id: request.id,
    amount: request.amount,
    currency: request.currency,
    qr_token: request.qr_token,
    expires_at: request.expires_at,
    status: request.status,
  };
}

export async function payByQr(qrToken: string, payerId: string) {
  const request = await prisma.paymentRequest.findUnique({
    where: { qr_token: qrToken },
  });
  if (!request) return { success: false, error: 'Demande de paiement introuvable' };
  if (request.status !== 'pending') return { success: false, error: 'Demande déjà traitée ou expirée' };
  if (new Date() > request.expires_at) return { success: false, error: 'Demande expirée' };
  if (request.from_user_id === payerId) return { success: false, error: 'Vous ne pouvez pas vous payer vous-même' };

  const walletFrom = await prisma.wallet.findFirst({ where: { user_id: request.from_user_id } });
  const walletPayer = await prisma.wallet.findFirst({ where: { user_id: payerId } });
  if (!walletPayer) return { success: false, error: 'Portefeuille du payeur introuvable' };
  if (!walletFrom) return { success: false, error: 'Portefeuille du bénéficiaire introuvable' };
  if (walletPayer.balance < request.amount) return { success: false, error: 'Solde insuffisant' };

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: walletPayer.id },
      data: { balance: { decrement: request.amount } },
    });
    await tx.wallet.update({
      where: { id: walletFrom.id },
      data: { balance: { increment: request.amount } },
    });
    await tx.transaction.create({
      data: {
        user_id: payerId,
        amount: -request.amount,
        type: 'p2p_out',
        status: 'completed',
        reference_id: request.id,
        currency: request.currency,
        description: 'Paiement QR',
      },
    });
    await tx.transaction.create({
      data: {
        user_id: request.from_user_id,
        amount: request.amount,
        type: 'p2p_in',
        status: 'completed',
        reference_id: request.id,
        currency: request.currency,
        description: 'Reception paiement QR',
      },
    });
    await tx.paymentRequest.update({
      where: { id: request.id },
      data: { status: 'paid', paid_at: new Date(), paid_by_id: payerId },
    });
  });

  return { success: true, amount: request.amount, currency: request.currency };
}

export async function getPaymentRequestByToken(qrToken: string) {
  return prisma.paymentRequest.findFirst({
    where: { qr_token: qrToken },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      expires_at: true,
      from_user: { select: { id: true, username: true, full_name: true, profile_image: true } },
    },
  });
}
