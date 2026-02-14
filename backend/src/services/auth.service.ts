import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as earlyAccessService from './earlyAccess.service.js';

interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

class AuthService {
  async register(data: RegisterData) {
    // Early Access: vérifier la limite d'utilisateurs
    const earlyCheck = await earlyAccessService.canRegister();
    if (!earlyCheck.allowed) {
      const error: any = new Error(earlyCheck.message);
      error.statusCode = 403;
      throw error;
    }

    // Valider les données requises
    if (!data.email || !data.username || !data.password) {
      const error: any = new Error('Email, nom d\'utilisateur et mot de passe sont requis');
      error.statusCode = 400;
      throw error;
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      const error: any = new Error('Format d\'email invalide');
      error.statusCode = 400;
      throw error;
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (existingUser) {
      const error: any = new Error('Email ou nom d\'utilisateur déjà utilisé');
      error.statusCode = 400;
      throw error;
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(data.password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password_hash,
        full_name: data.full_name,
      },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        profile_image: true,
        role: true,
        created_at: true,
      },
    });

    // Générer les tokens
    const tokens = this.generateTokens(user.id, user.email);

    logger.info('Utilisateur créé', { userId: user.id, email: user.email });

    return {
      user,
      ...tokens,
    };
  }

  async login(
    email: string,
    password: string,
    twoFactorCode?: string,
    backupCode?: string
  ) {
    // Valider les données requises pour éviter les erreurs 500 Prisma
    if (!email || !password) {
      const error: any = new Error('Email et mot de passe sont requis');
      error.statusCode = 400;
      throw error;
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
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
      },
      two_factor_verified: !!twoFactor?.is_enabled,
      ...tokens,
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
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as {
        userId: string;
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
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user;
  }

  async socialLogin(data: {
    email: string;
    full_name?: string;
    profile_image?: string;
    provider: 'google' | 'facebook';
    provider_id: string;
  }) {
    // Chercher un utilisateur existant par email
    let user = await prisma.user.findFirst({
      where: {
        email: data.email,
      },
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
        },
        select: {
          id: true,
          email: true,
          username: true,
          full_name: true,
          profile_image: true,
          role: true,
          created_at: true,
        },
      }) as Awaited<ReturnType<typeof prisma.user.findFirst>>;

      logger.info('Utilisateur créé via OAuth', { userId: user!.id, email: user!.email, provider: data.provider });
    } else {
      // Mettre à jour les informations si nécessaire
      if (data.profile_image && !user.profile_image) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { profile_image: data.profile_image },
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
            profile_image: true,
            role: true,
            created_at: true,
          },
        }) as Awaited<ReturnType<typeof prisma.user.findFirst>>;
      }
    }

    if (!user) throw new Error('User not found');
    // Générer les tokens
    const tokens = this.generateTokens(user.id, user.email);

    logger.info('Utilisateur connecté via OAuth', { userId: user.id, email: user.email, provider: data.provider });

    return {
      user,
      ...tokens,
    };
  }

  private generateTokens(userId: string, email: string) {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets non configurés');
    }

    const jwtSecret: string = process.env.JWT_SECRET;
    const jwtRefreshSecret: string = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

    const accessToken = jwt.sign(
      { userId, email },
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
}

export const authService = new AuthService();
export default authService;
