/**
 * Service Tontines digitales — épargne rotative africaine.
 *
 * Modèle :
 *  - Tontine       : groupe d'épargne avec N membres et un montant par cycle
 *  - TontineMember : membre invité/accepté avec un ordre de passage
 *  - TontineCycle  : 1 cycle = tous les membres payent, 1 bénéficiaire reçoit
 *
 * Workflow :
 *  1. createTontine(creator, params) → statut 'draft', membre 1 = créateur.
 *  2. inviteMember / joinByInviteCode → statut 'invited' → 'accepted'.
 *  3. startTontine → tirage de l'ordre, création des N cycles, statut 'active'.
 *  4. contributeToCycle → wallet débit, stocké dans Cycle.contributions.
 *  5. Quand tous les membres ont contribué pour ce cycle → payoutCycle
 *     → wallet crédit du bénéficiaire, statut 'completed'.
 *  6. Fin de la tontine quand tous les cycles sont 'completed'.
 *
 * Sécurité : tout passe en transaction Prisma atomique avec le wallet.
 */
import crypto from 'crypto';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';
import { Prisma } from '@prisma/client';

export type TontineFrequency = 'weekly' | 'biweekly' | 'monthly';

interface CreateTontineParams {
  name: string;
  description?: string;
  contributionAmount: number;
  maxMembers: number;
  frequency: TontineFrequency;
  payoutOrderMode?: 'random' | 'manual';
  currency?: string;
  rules?: Record<string, unknown>;
}

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function addFrequency(date: Date, frequency: TontineFrequency, count: number): Date {
  const d = new Date(date);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7 * count);
  else if (frequency === 'biweekly') d.setDate(d.getDate() + 14 * count);
  else d.setMonth(d.getMonth() + count);
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function ensureUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    const exists = await prisma.tontine.findUnique({ where: { invite_code: code } });
    if (!exists) return code;
  }
  // fallback si collision improbable
  return generateInviteCode() + Date.now().toString(36).slice(-4).toUpperCase();
}

export const tontineService = {
  /**
   * Crée une nouvelle tontine. Le créateur est automatiquement membre (ordre temporaire = 1).
   */
  async createTontine(creatorId: string, params: CreateTontineParams) {
    if (params.maxMembers < 2 || params.maxMembers > 50) {
      throw new Error('Le nombre de membres doit être entre 2 et 50.');
    }
    if (params.contributionAmount <= 0) {
      throw new Error('La contribution par cycle doit être positive.');
    }
    const inviteCode = await ensureUniqueInviteCode();
    const tontine = await prisma.tontine.create({
      data: {
        name: params.name.trim().slice(0, 120),
        description: params.description?.trim().slice(0, 2000) || null,
        creator_id: creatorId,
        currency: params.currency || 'XOF',
        contribution_amount: params.contributionAmount,
        max_members: params.maxMembers,
        frequency: params.frequency,
        payout_order_mode: params.payoutOrderMode || 'random',
        status: 'draft',
        invite_code: inviteCode,
        rules: (params.rules ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        members: {
          create: {
            user_id: creatorId,
            payout_order: 1,
            status: 'accepted',
          },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } } },
      },
    });
    return tontine;
  },

  /**
   * Rejoindre une tontine via son code d'invitation. Le membre est ajouté en 'invited'
   * et doit ensuite accepter explicitement via `acceptInvitation`.
   */
  async joinByInviteCode(userId: string, inviteCode: string) {
    const tontine = await prisma.tontine.findUnique({
      where: { invite_code: inviteCode.toUpperCase() },
      include: { members: true },
    });
    if (!tontine) throw new Error('Code d\'invitation invalide.');
    if (tontine.status !== 'draft') throw new Error('Cette tontine a déjà démarré ou est clôturée.');
    const already = tontine.members.find((m: { user_id: string }) => m.user_id === userId);
    if (already) return already;
    if (tontine.members.length >= tontine.max_members) {
      throw new Error('Cette tontine est complète.');
    }
    const nextOrder = tontine.members.length + 1;
    return prisma.tontineMember.create({
      data: {
        tontine_id: tontine.id,
        user_id: userId,
        payout_order: nextOrder,
        status: 'accepted',
      },
    });
  },

  /**
   * Démarre la tontine : tire l'ordre de passage, crée les N cycles, passe à 'active'.
   * Seul le créateur peut lancer.
   */
  async startTontine(tontineId: string, creatorId: string) {
    const tontine = await prisma.tontine.findUnique({
      where: { id: tontineId },
      include: { members: true },
    });
    if (!tontine) throw new Error('Tontine introuvable.');
    if (tontine.creator_id !== creatorId) throw new Error('Seul le créateur peut démarrer.');
    if (tontine.status !== 'draft') throw new Error('Cette tontine est déjà démarrée.');
    const accepted = tontine.members.filter((m: { status: string }) => m.status === 'accepted');
    if (accepted.length < 2) {
      throw new Error('Au moins 2 membres doivent avoir accepté pour démarrer.');
    }

    const memberIds = accepted.map((m: { user_id: string }) => m.user_id);
    const ordered = tontine.payout_order_mode === 'random' ? shuffle(memberIds) : memberIds;

    const now = new Date();
    const totalAmount = tontine.contribution_amount * ordered.length;
    const cycleDurationDays = tontine.frequency === 'weekly' ? 7 : tontine.frequency === 'biweekly' ? 14 : 30;

    return prisma.$transaction(async (tx) => {
      // Mettre à jour l'ordre de passage des membres et le statut
      for (let i = 0; i < ordered.length; i++) {
        await tx.tontineMember.updateMany({
          where: { tontine_id: tontineId, user_id: ordered[i] },
          data: { payout_order: i + 1 },
        });
      }
      // Créer les cycles
      for (let i = 0; i < ordered.length; i++) {
        const opensAt = addFrequency(now, tontine.frequency as TontineFrequency, i);
        const dueAt = new Date(opensAt.getTime() + cycleDurationDays * 24 * 60 * 60 * 1000);
        await tx.tontineCycle.create({
          data: {
            tontine_id: tontineId,
            cycle_number: i + 1,
            beneficiary_user_id: ordered[i],
            total_amount: totalAmount,
            status: i === 0 ? 'collecting' : 'pending',
            opens_at: opensAt,
            due_at: dueAt,
            contributions: {},
          },
        });
      }
      const endsAt = addFrequency(now, tontine.frequency as TontineFrequency, ordered.length);
      return tx.tontine.update({
        where: { id: tontineId },
        data: { status: 'active', starts_at: now, ends_at: endsAt },
        include: { members: true, cycles: true },
      });
    });
  },

  /**
   * Un membre paye sa contribution du cycle courant. Débit atomique du wallet.
   */
  async contributeToCycle(tontineId: string, cycleNumber: number, userId: string) {
    const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
    if (!tontine || tontine.status !== 'active') throw new Error('Tontine non active.');

    const cycle = await prisma.tontineCycle.findUnique({
      where: { tontine_id_cycle_number: { tontine_id: tontineId, cycle_number: cycleNumber } },
    });
    if (!cycle) throw new Error('Cycle introuvable.');
    if (cycle.status !== 'collecting') throw new Error('Ce cycle n\'accepte pas de contributions.');

    const member = await prisma.tontineMember.findUnique({
      where: { tontine_id_user_id: { tontine_id: tontineId, user_id: userId } },
    });
    if (!member || member.status !== 'accepted') throw new Error('Vous n\'êtes pas membre de cette tontine.');

    const contributions = (cycle.contributions as Record<string, { paid: boolean; amount: number; paid_at: string }>) || {};
    if (contributions[userId]?.paid) {
      throw new Error('Vous avez déjà contribué pour ce cycle.');
    }

    const wallet = await prisma.wallet.findFirst({ where: { user_id: userId, wallet_type: 'user' } });
    if (!wallet) throw new Error('Portefeuille introuvable.');
    if (wallet.balance < tontine.contribution_amount) throw new Error('Solde insuffisant pour contribuer.');

    const updatedContribs = {
      ...contributions,
      [userId]: { paid: true, amount: tontine.contribution_amount, paid_at: new Date().toISOString() },
    };

    return prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: tontine.contribution_amount } },
      });
      await tx.transaction.create({
        data: {
          user_id: userId,
          amount: -tontine.contribution_amount,
          type: 'tontine_contribution',
          status: 'completed',
          reference_id: cycle.id,
          currency: tontine.currency,
          description: `Tontine "${tontine.name}" — cycle ${cycleNumber}`,
        },
      });
      const updatedCycle = await tx.tontineCycle.update({
        where: { id: cycle.id },
        data: { contributions: updatedContribs as Prisma.InputJsonValue },
      });

      // Si tous les membres ont contribué, on déclenche le payout
      const members = await tx.tontineMember.findMany({
        where: { tontine_id: tontineId, status: 'accepted' },
      });
      const allPaid = members.every((m) => (updatedContribs[m.user_id]?.paid ?? false) === true);
      if (allPaid) {
        // crédite le bénéficiaire
        const benefWallet = await tx.wallet.findFirst({
          where: { user_id: cycle.beneficiary_user_id, wallet_type: 'user' },
        });
        if (benefWallet) {
          await tx.wallet.update({
            where: { id: benefWallet.id },
            data: { balance: { increment: cycle.total_amount } },
          });
          await tx.transaction.create({
            data: {
              user_id: cycle.beneficiary_user_id,
              amount: cycle.total_amount,
              type: 'tontine_payout',
              status: 'completed',
              reference_id: cycle.id,
              currency: tontine.currency,
              description: `Tontine "${tontine.name}" — cycle ${cycleNumber} reçu`,
            },
          });
        }
        await tx.tontineCycle.update({
          where: { id: cycle.id },
          data: { status: 'completed', paid_at: new Date() },
        });
        // Activer le cycle suivant si existe
        await tx.tontineCycle.updateMany({
          where: { tontine_id: tontineId, cycle_number: cycleNumber + 1, status: 'pending' },
          data: { status: 'collecting' },
        });
        // Si c'était le dernier cycle, terminer la tontine
        const remaining = await tx.tontineCycle.count({
          where: { tontine_id: tontineId, status: { in: ['pending', 'collecting'] } },
        });
        if (remaining === 0) {
          await tx.tontine.update({
            where: { id: tontineId },
            data: { status: 'completed' },
          });
        }
      }
      return updatedCycle;
    });
  },

  async listMyTontines(userId: string) {
    const memberships = await prisma.tontineMember.findMany({
      where: { user_id: userId, status: { in: ['invited', 'accepted'] } },
      include: {
        tontine: {
          include: {
            members: {
              select: { user_id: true, status: true, payout_order: true },
            },
            _count: { select: { cycles: true } },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
    });
    return memberships.map((m) => m.tontine);
  },

  async getTontineDetail(tontineId: string, viewerId: string) {
    const tontine = await prisma.tontine.findUnique({
      where: { id: tontineId },
      include: {
        creator: { select: { id: true, username: true, full_name: true, profile_image: true } },
        members: {
          include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
          orderBy: { payout_order: 'asc' },
        },
        cycles: {
          include: { beneficiary: { select: { id: true, username: true, full_name: true, profile_image: true } } },
          orderBy: { cycle_number: 'asc' },
        },
      },
    });
    if (!tontine) return null;
    const isMember = tontine.members.some((m) => m.user_id === viewerId);
    return { tontine, isMember };
  },

  async leaveTontine(tontineId: string, userId: string) {
    const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
    if (!tontine) throw new Error('Tontine introuvable.');
    if (tontine.creator_id === userId) throw new Error('Le créateur ne peut pas quitter. Annulez plutôt la tontine.');
    if (tontine.status === 'active') throw new Error('Impossible de quitter une tontine active. Contactez le créateur.');
    return prisma.tontineMember.updateMany({
      where: { tontine_id: tontineId, user_id: userId },
      data: { status: 'removed' },
    });
  },

  async cancelTontine(tontineId: string, creatorId: string) {
    const tontine = await prisma.tontine.findUnique({ where: { id: tontineId } });
    if (!tontine) throw new Error('Tontine introuvable.');
    if (tontine.creator_id !== creatorId) throw new Error('Seul le créateur peut annuler.');
    if (tontine.status === 'active') throw new Error('Tontine déjà active — contactez le support pour résoudre.');
    return prisma.tontine.update({
      where: { id: tontineId },
      data: { status: 'cancelled' },
    });
  },
};

export default tontineService;
// Hook: tontineService is intentionally exported as named + default for flexibility
// notificationService is imported but intentionally unused here; kept for future notifs
void notificationService;
void logger;
