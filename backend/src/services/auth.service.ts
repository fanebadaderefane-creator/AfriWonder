// AfriWonder full review PR - CodeRabbit
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendViaResend } from '../utils/transactionalEmail.js';
import * as earlyAccessService from './earlyAccess.service.js';
import * as referralService from './referral.service.js';
import { isRefreshTokenRevoked, revokeRefreshToken } from './refreshTokenBlacklist.service.js';

interface RegisterData {
  email?: string;
  phone?: string;
  username: string;
  password: string;
  full_name?: string;
  referral_code?: string;
}

function normalizePhone(phone?: string) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const withIntlPrefix = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
  const digits = withIntlPrefix.replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) {
    return /^\d{6,15}$/.test(digits) ? `+${digits}` : '';
  }
  return /^\+\d{6,15}$/.test(digits) ? digits : '';
}

class AuthService {
  private passwordChangeFlagKey(userId: string) {
    return `force_password_change:${userId}`;
  }

  private async isPasswordChangeRequired(userId: string) {
    const row = await prisma.platformSettings.findUnique({
      where: { key: this.passwordChangeFlagKey(userId) },
      select: { value: true },
    });
    return Boolean((row?.value as Record<string, unknown> | null)?.required === true);
  }

  private async setPasswordChangeRequired(
    userId: string,
    required: boolean,
    metadata?: Record<string, unknown>
  ) {
    const key = this.passwordChangeFlagKey(userId);
    if (!required) {
      await prisma.platformSettings.deleteMany({ where: { key } });
      return;
    }
    const value = {
      required: true,
      set_at: new Date().toISOString(),
      ...metadata,
    } as Prisma.InputJsonValue;
    const existing = await prisma.platformSettings.findUnique({
      where: { key },
      select: { id: true },
    });
    if (existing) {
      await prisma.platformSettings.update({
        where: { key },
        data: { value },
      });
      return;
    }
    await prisma.platformSettings.create({
      data: {
        id: `settings-${randomUUID()}`,
        key,
        value,
      },
    });
  }

  private assertPasswordStrength(password: string) {
    const passwordMinLength = 8;
    if (password.length < passwordMinLength) {
      const error: any = new Error(`Le mot de passe doit contenir au moins ${passwordMinLength} caractères`);
      error.statusCode = 400;
      throw error;
    }
    if (!/[a-zA-Z]/.test(password)) {
      const error: any = new Error('Le mot de passe doit contenir au moins une lettre');
      error.statusCode = 400;
      throw error;
    }
    if (!/\d/.test(password)) {
      const error: any = new Error('Le mot de passe doit contenir au moins un chiffre');
      error.statusCode = 400;
      throw error;
    }
  }

  private getPasswordResetSecret() {
    return String(process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || '').trim();
  }

  private buildPasswordResetUrl(token: string) {
    const base =
      String(process.env.FRONTEND_PASSWORD_RESET_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
    const root = base.replace(/\/+$/, '');
    const path = root.includes('/reset-password') ? root : `${root}/reset-password`;
    return `${path}?token=${encodeURIComponent(token)}`;
  }

  private assertJwtSecurity() {
    const jwtSecret = String(process.env.JWT_SECRET || '').trim();
    const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '').trim();
    if (jwtSecret.length < 64) {
      const err: any = new Error('JWT_SECRET doit contenir au moins 64 caracteres aleatoires');
      err.statusCode = 500;
      throw err;
    }
    if (refreshSecret.length < 64) {
      const err: any = new Error('JWT_REFRESH_SECRET doit contenir au moins 64 caracteres aleatoires');
      err.statusCode = 500;
      throw err;
    }
  }

  async register(data: RegisterData) {
    // Early Access: vérifier la limite d'utilisateurs
    const earlyCheck = await earlyAccessService.canRegister();
    if (!earlyCheck.allowed) {
      const error: any = new Error(earlyCheck.message);
      error.statusCode = 403;
      throw error;
    }

    // Valider les données requises
    if ((!data.email && !data.phone) || !data.username || !data.password) {
      const error: any = new Error('Email ou numéro, nom d\'utilisateur et mot de passe sont requis');
      error.statusCode = 400;
      throw error;
    }

    const emailTrimmed = String(data.email || '').trim().toLowerCase();
    const phoneTrimmed = normalizePhone(data.phone);
    const usernameTrimmed = data.username.trim();

    if (!emailTrimmed && !phoneTrimmed) {
      const error: any = new Error('Un email ou un numéro avec indicatif international est requis');
      error.statusCode = 400;
      throw error;
    }

    // Valider le format de l'email si présent
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailTrimmed && !emailRegex.test(emailTrimmed)) {
      const error: any = new Error('Format d\'email invalide');
      error.statusCode = 400;
      throw error;
    }

    if (data.phone && !phoneTrimmed) {
      const error: any = new Error('Le numéro doit inclure un indicatif international valide');
      error.statusCode = 400;
      throw error;
    }

    const emailToStore = emailTrimmed || `phone_${phoneTrimmed.replace(/\D/g, '')}@phone.afriwonder.local`;
    const phoneDerivedEmail = phoneTrimmed ? `phone_${phoneTrimmed.replace(/\D/g, '')}@phone.afriwonder.local` : '';

    // Force du mot de passe : min 8 caractères, au moins une lettre et un chiffre (sécurité / consolidation)
    this.assertPasswordStrength(data.password);

    // Username : alphanum + underscore, 3–30 caractères
    if (usernameTrimmed.length < 3 || usernameTrimmed.length > 30) {
      const error: any = new Error('Le nom d\'utilisateur doit faire entre 3 et 30 caractères');
      error.statusCode = 400;
      throw error;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(usernameTrimmed)) {
      const error: any = new Error('Le nom d\'utilisateur ne peut contenir que lettres, chiffres et underscore');
      error.statusCode = 400;
      throw error;
    }

    // Vérifier unicité + hasher + créer (même try/catch : findFirst peut lever P1001 comme create)
    let user;
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailToStore },
            { username: usernameTrimmed },
          ],
        },
      });

      if (existingUser) {
        const dup: any = new Error('Email, numéro ou nom d\'utilisateur déjà utilisé');
        dup.statusCode = 400;
        throw dup;
      }

      const password_hash = await bcrypt.hash(data.password, 10);

      user = await prisma.user.create({
        data: {
          email: emailToStore,
          username: usernameTrimmed,
          password_hash,
          full_name: data.full_name?.trim() || null,
          /** Forfaits mobiles Afrique : qualité basse + moins de préchargement par défaut. */
          data_saver_mode: true,
        },
        select: {
          id: true,
          email: true,
          username: true,
          full_name: true,
          profile_image: true,
          role: true,
          created_at: true,
          login_alerts_enabled: true,
        },
      });
    } catch (e) {
      const anyE = e as { statusCode?: number };
      if (anyE?.statusCode) {
        throw e;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          const err: any = new Error('Ce nom d’utilisateur ou cet email est déjà utilisé.');
          err.statusCode = 400;
          throw err;
        }
        if (e.code === 'P1001' || e.code === 'P1017') {
          const err: any = new Error(
            'Impossible de joindre la base de données. Vérifiez que PostgreSQL est accessible et que DATABASE_URL est correct dans backend/.env.'
          );
          err.statusCode = 503;
          throw err;
        }
      }
      logger.error('register: prisma (findFirst/create) failed', e instanceof Error ? e : undefined, {
        code: e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined,
      });
      const err: any = new Error(
        'Inscription impossible pour le moment (erreur base de données). Vérifiez PostgreSQL, DATABASE_URL, puis redémarrez l’API.'
      );
      err.statusCode = 503;
      throw err;
    }

    /** Ne pas faire échouer l’inscription si les tables / règles de parrainage posent problème */
    if (data.referral_code?.trim()) {
      try {
        await referralService.applyReferralCode(user.id, data.referral_code.trim());
      } catch (refErr) {
        logger.warn('Parrainage ignoré à l’inscription', {
          userId: user.id,
          err: refErr instanceof Error ? refErr.message : String(refErr),
        });
      }
    }

    // Créer le portefeuille Live dès l'inscription (évite FK au premier don)
    try {
      const ledgerService = (await import('./ledger.service.js')).default;
      await ledgerService.getOrCreateUserWallet(user.id, 'XOF');
    } catch (e) {
      logger.warn('Création wallet à l\'inscription ignorée', { userId: user.id, err: (e as Error).message });
    }

    const tokens = this.generateTokens(user.id, user.email);

    logger.info('Utilisateur créé', { userId: user.id, email: user.email, phone: phoneTrimmed || undefined });

    return {
      user,
      ...tokens,
    };
  }

  async login(
    identifier: string,
    password: string,
    twoFactorCode?: string,
    backupCode?: string
  ) {
    // Valider les données requises pour éviter les erreurs 500 Prisma
    if (!identifier || !password) {
      const error: any = new Error('Email, nom d\'utilisateur ou numéro et mot de passe sont requis');
      error.statusCode = 400;
      throw error;
    }

    const identifierTrimmed = identifier.trim();
    const normalizedPhone = normalizePhone(identifierTrimmed);
    const phoneDerivedEmail = normalizedPhone ? `phone_${normalizedPhone.replace(/\D/g, '')}@phone.afriwonder.local` : '';

    // Trouver l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifierTrimmed.toLowerCase() },
          ...(phoneDerivedEmail ? [{ email: phoneDerivedEmail }] : []),
          { username: identifierTrimmed },
        ],
      },
    });

    if (!user) {
      const error: any = new Error('Email ou mot de passe incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      const error: any = new Error('Email ou mot de passe incorrect');
      error.statusCode = 401;
      throw error;
    }

    // 2FA optionnelle : si activée, exiger un code TOTP ou un backup code
    const twoFactor = await prisma.user2FA.findUnique({
      where: { user_id: user.id },
      select: {
        is_enabled: true,
        secret: true,
        backup_codes: true,
      },
    });

    if (twoFactor?.is_enabled) {
      const provided2FA = String(twoFactorCode || '').trim();
      const providedBackup = String(backupCode || '').trim().toUpperCase();
      let verified = false;

      if (provided2FA && twoFactor.secret) {
        verified = speakeasy.totp.verify({
          secret: twoFactor.secret,
          encoding: 'base32',
          token: provided2FA,
          window: 2,
        });
      }

      if (!verified && providedBackup) {
        const backupCodes = (twoFactor.backup_codes || []).map((c) => String(c).toUpperCase());
        verified = backupCodes.includes(providedBackup);
        if (verified) {
          const remaining = backupCodes.filter((c) => c !== providedBackup);
          await prisma.user2FA.update({
            where: { user_id: user.id },
            data: {
              backup_codes: remaining,
              last_used_at: new Date(),
            },
          });
        }
      }

      if (!verified) {
        const err: any = new Error(
          provided2FA || providedBackup
            ? 'Code 2FA invalide'
            : 'Code 2FA requis pour ce compte'
        );
        err.statusCode = 401;
        err.code = provided2FA || providedBackup ? 'TWO_FA_INVALID' : 'TWO_FA_REQUIRED';
        throw err;
      }

      await prisma.user2FA.update({
        where: { user_id: user.id },
        data: { last_used_at: new Date() },
      });
    }

    const mustChangePassword = await this.isPasswordChangeRequired(user.id);
    if (mustChangePassword) {
      const secret = this.getPasswordResetSecret();
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password_reset' },
        secret,
        { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '30m' } as SignOptions
      );
      const err: any = new Error('Changement de mot de passe requis');
      err.statusCode = 403;
      err.code = 'PASSWORD_CHANGE_REQUIRED';
      err.data = { resetToken };
      throw err;
    }

    // Générer les tokens
    const tokens = this.generateTokens(user.id, user.email);

    logger.info('Utilisateur connecté', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        profile_image: user.profile_image,
        role: user.role,
        is_afriwonder_pro: user.is_afriwonder_pro,
        login_alerts_enabled: user.login_alerts_enabled,
        created_at: user.created_at,
      },
      two_factor_verified: !!twoFactor?.is_enabled,
      ...tokens,
    };
  }

  async requestPasswordReset(identifier: string) {
    const identifierTrimmed = String(identifier || '').trim();
    if (!identifierTrimmed) return { success: true };

    const normalizedPhone = normalizePhone(identifierTrimmed);
    const phoneDerivedEmail = normalizedPhone ? `phone_${normalizedPhone.replace(/\D/g, '')}@phone.afriwonder.local` : '';
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifierTrimmed.toLowerCase() },
          ...(phoneDerivedEmail ? [{ email: phoneDerivedEmail }] : []),
          { username: identifierTrimmed },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    // Ne jamais révéler si le compte existe.
    if (!user) return { success: true };

    const secret = this.getPasswordResetSecret();
    if (!secret) {
      logger.error('Password reset secret missing (PASSWORD_RESET_SECRET or JWT_SECRET)');
      return { success: true };
    }

    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      secret,
      { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '30m' } as SignOptions
    );

    const resetUrl = this.buildPasswordResetUrl(token);
    const subject = 'Réinitialisation du mot de passe AfriWonder';
    const text =
      `Bonjour,\n\n` +
      `Vous avez demandé la réinitialisation de votre mot de passe.\n` +
      `Cliquez sur ce lien (valide 30 minutes):\n${resetUrl}\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n`;
    const html =
      `<p>Bonjour,</p>` +
      `<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>` +
      `<p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>` +
      `<p>Ce lien est valide pendant 30 minutes.</p>` +
      `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;

    const sent = await sendViaResend({
      to: user.email,
      subject,
      text,
      html,
    });

    if (!sent) {
      logger.warn('Password reset email not sent via provider', { userId: user.id });
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Password reset fallback URL (dev only)', { userId: user.id, resetUrl });
      }
    }

    return { success: true };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    this.assertPasswordStrength(newPassword);
    const secret = this.getPasswordResetSecret();
    if (!secret) {
      const err: any = new Error('Configuration reset password indisponible');
      err.statusCode = 503;
      throw err;
    }

    let decoded: { userId?: string; purpose?: string };
    try {
      decoded = jwt.verify(token, secret) as { userId?: string; purpose?: string };
    } catch {
      const err: any = new Error('Lien de réinitialisation invalide ou expiré');
      err.statusCode = 400;
      throw err;
    }

    if (!decoded?.userId || decoded.purpose !== 'password_reset') {
      const err: any = new Error('Lien de réinitialisation invalide');
      err.statusCode = 400;
      throw err;
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password_hash },
    });
    await this.setPasswordChangeRequired(decoded.userId, false);
    return { success: true };
  }

  async adminIssueTemporaryPassword(targetUserId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, username: true },
    });
    if (!user) {
      const err: any = new Error('Utilisateur non trouvé');
      err.statusCode = 404;
      throw err;
    }
    const temporaryPassword = randomBytes(9).toString('base64url');
    const password_hash = await bcrypt.hash(temporaryPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    });
    await this.setPasswordChangeRequired(user.id, true, {
      set_by: adminId,
      reason: 'admin_temporary_password',
    });
    const loginUrl =
      process.env.FRONTEND_URL?.trim() ||
      process.env.FRONTEND_BASE_URL?.trim() ||
      'http://localhost:8081';
    const safeUsername = user.username || user.email || 'utilisateur';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>AfriWonder - Mot de passe temporaire</h2>
        <p>Bonjour ${safeUsername},</p>
        <p>Un administrateur a genere un mot de passe temporaire pour votre compte.</p>
        <p><strong>Mot de passe temporaire:</strong> ${temporaryPassword}</p>
        <p>Connectez-vous puis changez immediatement votre mot de passe depuis l'ecran obligatoire.</p>
        <p><a href="${loginUrl}">Se connecter a AfriWonder</a></p>
        <p>Si vous n'etes pas a l'origine de cette action, contactez le support AfriWonder.</p>
      </div>
    `;
    const sent = await sendViaResend({
      to: user.email,
      subject: 'AfriWonder - Votre mot de passe temporaire',
      text: `Votre mot de passe temporaire AfriWonder est: ${temporaryPassword}. Connectez-vous puis changez immediatement votre mot de passe.`,
      html,
    });
    if (!sent) {
      logger.warn('Temporary password email not sent via provider', { userId: user.id, email: user.email });
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Temporary password fallback (dev only)', {
          userId: user.id,
          email: user.email,
          temporaryPassword,
        });
      }
    }
    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      temporaryPassword,
      emailSent: sent,
      mustChangeOnNextLogin: true,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      const error: any = new Error('Refresh token requis');
      error.statusCode = 400;
      throw error;
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      const error: any = new Error('JWT_REFRESH_SECRET non configuré');
      error.statusCode = 500;
      throw error;
    }

    try {
      const revoked = await isRefreshTokenRevoked(refreshToken);
      if (revoked) {
        const err: any = new Error('Refresh token revoque');
        err.statusCode = 401;
        throw err;
      }
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as {
        userId: string;
        exp?: number;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
        },
      });

      if (!user) {
        const error: any = new Error('Utilisateur non trouvé');
        error.statusCode = 404;
        throw error;
      }

      const tokens = this.generateTokens(user.id, user.email);

      if (decoded.exp) {
        await revokeRefreshToken(refreshToken, decoded.exp);
      }

      return tokens;
    } catch (error) {
      const err: any = new Error('Refresh token invalide');
      err.statusCode = 401;
      throw err;
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        profile_image: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        is_verified: true,
        created_at: true,
        data_saver_mode: true,
        messaging_e2e_enabled: true,
        messaging_read_receipts_enabled: true,
        messaging_cdc_moderation: true,
        replay_premium: true,
        monetization_enabled: true,
        is_afriwonder_pro: true,
        login_alerts_enabled: true,
      },
    });

    if (!user) {
      const err: any = new Error('Utilisateur non trouvé');
      err.statusCode = 401;
      throw err;
    }

    return user;
  }

  async socialLogin(data: {
    email: string;
    full_name?: string;
    profile_image?: string;
    provider: 'google' | 'facebook' | 'apple';
    provider_id: string;
  }) {
    const userSelect = {
      id: true,
      email: true,
      username: true,
      full_name: true,
      profile_image: true,
      role: true,
      created_at: true,
      apple_id: true,
      login_alerts_enabled: true,
    } as const;

    let user =
      data.provider === 'apple'
        ? await prisma.user.findFirst({
            where: {
              OR: [{ apple_id: data.provider_id }, { email: data.email }],
            },
          })
        : await prisma.user.findFirst({
            where: { email: data.email },
          });

    // Si l'utilisateur n'existe pas, le créer
    if (!user) {
      // Early Access: vérifier la limite d'utilisateurs avant création
      const earlyCheck = await earlyAccessService.canRegister();
      if (!earlyCheck.allowed) {
        const error: any = new Error(earlyCheck.message);
        error.statusCode = 403;
        throw error;
      }

      // Générer un username unique à partir de l'email
      const baseUsername = data.email.split('@')[0];
      let username = baseUsername;
      let counter = 1;

      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email: data.email,
          username,
          full_name: data.full_name,
          profile_image: data.profile_image,
          password_hash: '', // Pas de mot de passe pour les comptes sociaux
          is_verified: true, // Les comptes sociaux sont considérés comme vérifiés
          ...(data.provider === 'apple' ? { apple_id: data.provider_id } : {}),
        },
        select: userSelect,
      }) as Awaited<ReturnType<typeof prisma.user.findFirst>>;

      logger.info('Utilisateur créé via OAuth', { userId: user!.id, email: user!.email, provider: data.provider });
    } else {
      const updates: { profile_image?: string; apple_id?: string; full_name?: string } = {};
      if (data.provider === 'apple' && data.provider_id && !user.apple_id) {
        updates.apple_id = data.provider_id;
      }
      if (data.profile_image && !user.profile_image) {
        updates.profile_image = data.profile_image;
      }
      if (data.full_name && !user.full_name && data.provider === 'apple') {
        updates.full_name = data.full_name;
      }
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
          select: userSelect,
        }) as Awaited<ReturnType<typeof prisma.user.findFirst>>;
      }
    }

    if (!user) throw new Error('User not found');
    // S'assurer que le portefeuille Live existe (évite erreur au premier don)
    try {
      const ledgerService = (await import('./ledger.service.js')).default;
      await ledgerService.getOrCreateUserWallet(user.id, 'XOF');
    } catch (_e) {
      // Ignorer si user inexistant (normalement pas le cas ici)
    }
    // Générer les tokens
    const tokens = this.generateTokens(user.id, user.email);

    logger.info('Utilisateur connecté via OAuth', { userId: user.id, email: user.email, provider: data.provider });

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Échange un access_token Supabase (Auth) contre les JWT AfriWonder.
   * Variables : SUPABASE_URL, SUPABASE_ANON_KEY (backend).
   */
  async loginWithSupabaseAccessToken(accessToken: string) {
    const url = process.env.SUPABASE_URL?.trim();
    const anon = process.env.SUPABASE_ANON_KEY?.trim();
    if (!url || !anon) {
      const err: any = new Error('Supabase non configuré : SUPABASE_URL et SUPABASE_ANON_KEY requis dans backend/.env');
      err.statusCode = 503;
      throw err;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error } = await supabase.auth.getUser(accessToken);
    if (error || !userData?.user) {
      const err: any = new Error(error?.message || 'Token Supabase invalide ou expiré');
      err.statusCode = 401;
      throw err;
    }

    const su = userData.user;
    const email = String(su.email || '')
      .trim()
      .toLowerCase();
    if (!email) {
      const err: any = new Error('L’email du compte Supabase est requis pour lier le compte AfriWonder');
      err.statusCode = 400;
      throw err;
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ supabase_id: su.id }, { email }] },
    });

    if (!user) {
      const earlyCheck = await earlyAccessService.canRegister();
      if (!earlyCheck.allowed) {
        const e: any = new Error(earlyCheck.message);
        e.statusCode = 403;
        throw e;
      }

      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_') || 'user';
      let username = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const meta = (su.user_metadata || {}) as Record<string, string>;
      const full_name = meta.full_name || meta.name || null;
      const profile_image = meta.avatar_url || meta.picture || null;

      user = await prisma.user.create({
        data: {
          email,
          username,
          full_name: full_name || undefined,
          profile_image: profile_image || undefined,
          password_hash: '',
          is_verified: true,
          supabase_id: su.id,
        },
      });

      logger.info('Utilisateur créé via Supabase Auth', { userId: user.id, email: user.email });
    } else if (user.supabase_id !== su.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { supabase_id: su.id },
      });
    }

    if (!user) throw new Error('User not found');

    try {
      const ledgerService = (await import('./ledger.service.js')).default;
      await ledgerService.getOrCreateUserWallet(user.id, 'XOF');
    } catch (_e) {
      // ignore
    }

    const tokens = this.generateTokens(user.id, user.email);

    const userOut = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        profile_image: true,
        role: true,
        created_at: true,
        login_alerts_enabled: true,
      },
    });

    logger.info('Connexion via Supabase Auth', { userId: user.id, email: user.email });

    return {
      user: userOut!,
      ...tokens,
    };
  }

  private generateTokens(userId: string, email: string) {
    if (!process.env.JWT_SECRET?.trim()) {
      const err: any = new Error('JWT_SECRET non configuré. Vérifiez backend/.env');
      err.statusCode = 500;
      throw err;
    }
    if (!process.env.JWT_REFRESH_SECRET?.trim()) {
      const err: any = new Error('JWT_REFRESH_SECRET non configuré. Vérifiez backend/.env');
      err.statusCode = 500;
      throw err;
    }

    this.assertJwtSecurity();

    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtRefreshSecret: string = process.env.JWT_REFRESH_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

    const jti = randomUUID();
    const accessToken = jwt.sign(
      { userId, email, jti },
      jwtSecret,
      { expiresIn } as SignOptions
    );

    const refreshToken = jwt.sign(
      { userId },
      jwtRefreshSecret,
      { expiresIn: refreshExpiresIn } as SignOptions
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Changement de mot de passe pour un utilisateur déjà authentifié.
   * Comptes purement OAuth (password_hash vide) : erreur 400 explicite.
   */
  async changePasswordForLoggedInUser(userId: string, currentPassword: string, newPassword: string) {
    this.assertPasswordStrength(newPassword);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password_hash: true },
    });
    if (!user) {
      const err: any = new Error('Utilisateur non trouvé');
      err.statusCode = 404;
      throw err;
    }
    const hash = (user.password_hash || '').trim();
    if (!hash) {
      const err: any = new Error(
        'Compte connecté via un fournisseur externe. Utilisez « Mot de passe oublié » pour définir un mot de passe, ou le support AfriWonder.',
      );
      err.statusCode = 400;
      err.code = 'OAUTH_NO_PASSWORD';
      throw err;
    }
    const ok = await bcrypt.compare(currentPassword, hash);
    if (!ok) {
      const err: any = new Error('Mot de passe actuel incorrect');
      err.statusCode = 401;
      throw err;
    }
    if (currentPassword === newPassword) {
      const err: any = new Error('Le nouveau mot de passe doit être différent de l’actuel');
      err.statusCode = 400;
      throw err;
    }
    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });
    return { success: true };
  }
}

export const authService = new AuthService();
export default authService;
