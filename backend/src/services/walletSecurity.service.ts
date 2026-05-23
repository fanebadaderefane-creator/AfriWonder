/**
 * Sécurité wallet : PIN, limite retrait quotidienne, blocage.
 * Production ready.
 */
import prisma from '../config/database.js';
import { createHash, timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger.js';

const PIN_SALT = process.env.WALLET_PIN_SALT || 'afriwonder-wallet-pin-v1';
const DEFAULT_DAILY_LIMIT = 500_000; // 500k XOF par défaut

function hashPin(pin: string): string {
  return createHash('sha256').update(PIN_SALT + pin).digest('hex');
}

function verifyPin(pinHash: string | null, pin: string): boolean {
  if (!pinHash) return true;
  const h = hashPin(pin);
  try {
    return timingSafeEqual(Buffer.from(pinHash, 'hex'), Buffer.from(h, 'hex'));
  } catch {
    return false;
  }
}

class WalletSecurityService {
  async getOrCreate(userId: string) {
    let sec = await prisma.walletSecurity.findUnique({
      where: { user_id: userId },
    });
    if (!sec) {
      sec = await prisma.walletSecurity.create({
        data: {
          user_id: userId,
          withdrawal_daily_limit: DEFAULT_DAILY_LIMIT,
        },
      });
    }
    return sec;
  }

  async setPin(userId: string, pin: string) {
    if (!pin || pin.length < 4 || pin.length > 8) {
      throw new Error('PIN doit faire 4 à 8 chiffres');
    }
    const sec = await this.getOrCreate(userId);
    await prisma.walletSecurity.update({
      where: { id: sec.id },
      data: { pin_hash: hashPin(pin), updated_at: new Date() },
    });
    return { success: true };
  }

  async validatePin(userId: string, pin: string): Promise<boolean> {
    const sec = await this.getOrCreate(userId);
    return verifyPin(sec.pin_hash, pin);
  }

  /**
   * Vérifie si l'utilisateur peut effectuer un retrait (blocage, limite quotidienne, PIN si requis).
   */
  async checkCanWithdraw(
    userId: string,
    amount: number,
    options?: { pin?: string; requirePin?: boolean }
  ): Promise<{ allowed: boolean; reason?: string }> {
    const sec = await this.getOrCreate(userId);
    if (sec.is_blocked) {
      return { allowed: false, reason: sec.blocked_reason || 'Wallet bloqué. Contactez le support.' };
    }
    const limit = sec.withdrawal_daily_limit ?? DEFAULT_DAILY_LIMIT;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let countToday = sec.withdrawal_count_today ?? 0;
    if (sec.last_withdrawal_at && sec.last_withdrawal_at < startOfDay) {
      countToday = 0;
    }
    if (limit > 0 && countToday + amount > limit) {
      return {
        allowed: false,
        reason: `Limite quotidienne dépassée (${limit.toLocaleString()} XOF). Restant: ${Math.max(0, limit - countToday).toLocaleString()} XOF.`,
      };
    }
    if (sec.two_fa_required_for_withdrawal && sec.pin_hash) {
      const pinOk = options?.pin ? verifyPin(sec.pin_hash, options.pin) : false;
      if (!pinOk) {
        return { allowed: false, reason: 'PIN wallet requis pour ce retrait.' };
      }
    }
    return { allowed: true };
  }

  /**
   * Enregistre un retrait (incrémente le compteur quotidien).
   */
  async recordWithdrawal(userId: string, amount: number) {
    const sec = await this.getOrCreate(userId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let countToday = sec.withdrawal_count_today ?? 0;
    if (sec.last_withdrawal_at && sec.last_withdrawal_at < startOfDay) {
      countToday = 0;
    }
    await prisma.walletSecurity.update({
      where: { id: sec.id },
      data: {
        withdrawal_count_today: countToday + amount,
        last_withdrawal_at: now,
        updated_at: now,
      },
    });
  }

  async blockUser(userId: string, reason: string) {
    const sec = await this.getOrCreate(userId);
    await prisma.walletSecurity.update({
      where: { id: sec.id },
      data: { is_blocked: true, blocked_reason: reason, updated_at: new Date() },
    });
    logger.warn('Wallet bloqué', { userId, reason });
  }

  async unblockUser(userId: string) {
    const sec = await this.getOrCreate(userId);
    await prisma.walletSecurity.update({
      where: { id: sec.id },
      data: { is_blocked: false, blocked_reason: null, updated_at: new Date() },
    });
  }

  async setDailyLimit(userId: string, limit: number | null) {
    const sec = await this.getOrCreate(userId);
    await prisma.walletSecurity.update({
      where: { id: sec.id },
      data: { withdrawal_daily_limit: limit, updated_at: new Date() },
    });
  }
}

export const walletSecurityService = new WalletSecurityService();
export default walletSecurityService;
