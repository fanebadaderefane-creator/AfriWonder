import prisma from '../config/database.js';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';
import securityService from './security.service.js';
import { logger } from '../utils/logger.js';

/** Express/JSON ne sérialise pas les BigInt (ex. DataExportRequest.file_size) — conversion récursive. */
function serializeForJsonResponse<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}

class PrivacyService {
  // ==========================================
  // COOKIES & CONSENT
  // ==========================================

  /**
   * Enregistrer les préférences de cookies d'un utilisateur
   */
  async saveCookiePreferences(data: {
    userId: string;
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
    socialMedia: boolean;
    ipAddress: string;
    userAgent: string;
  }) {
    const preferences = await prisma.userCookiePreference.upsert({
      where: { user_id: data.userId },
      update: {
        analytics: data.analytics,
        marketing: data.marketing,
        functional: data.functional,
        social_media: data.socialMedia,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
      create: {
        user_id: data.userId,
        essential: data.essential,
        analytics: data.analytics,
        marketing: data.marketing,
        functional: data.functional,
        social_media: data.socialMedia,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
    });

    // Log le consentement
    await prisma.consentLog.create({
      data: {
        user_id: data.userId,
        consent_type: 'cookies',
        consent_given: true,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
    });

    return preferences;
  }

  /**
   * Obtenir les préférences de cookies d'un utilisateur
   */
  async getCookiePreferences(userId: string) {
    let preferences = await prisma.userCookiePreference.findUnique({
      where: { user_id: userId },
    });

    // Si pas de préférences, créer des valeurs par défaut
    if (!preferences) {
      preferences = await prisma.userCookiePreference.create({
        data: {
          user_id: userId,
          essential: true,
          analytics: false,
          marketing: false,
          functional: false,
          social_media: false,
        },
      });
    }

    return preferences;
  }

  /**
   * Enregistrer le consentement cookies pour un invité
   */
  async saveGuestCookieConsent(data: {
    sessionId: string;
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
    socialMedia: boolean;
    ipAddress: string;
  }) {
    // Expiration dans 1 an
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const consent = await prisma.guestCookieConsent.create({
      data: {
        session_id: data.sessionId,
        essential: data.essential,
        analytics: data.analytics,
        marketing: data.marketing,
        functional: data.functional,
        social_media: data.socialMedia,
        ip_address: data.ipAddress,
        expires_at: expiresAt,
      },
    });

    // Log le consentement
    await prisma.consentLog.create({
      data: {
        consent_type: 'cookies_guest',
        consent_given: true,
        ip_address: data.ipAddress,
      },
    });

    return consent;
  }

  // ==========================================
  // DATA EXPORT (RGPD Article 20)
  // ==========================================

  /**
   * Créer une demande d'export de données
   */
  async createExportRequest(data: {
    userId: string;
    format: string;
    ipAddress: string;
  }) {
    // Vérifier qu'il n'y a pas déjà une demande en cours
    const pendingRequest = await prisma.dataExportRequest.findFirst({
      where: {
        user_id: data.userId,
        status: {
          in: ['pending', 'processing'],
        },
      },
    });

    if (pendingRequest) {
      throw new Error('Vous avez déjà une demande d\'export en cours');
    }

    // Créer la demande
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        user_id: data.userId,
        format: data.format,
        status: 'pending',
        ip_address: data.ipAddress,
        expires_at: expiresAt,
      },
    });

    // TODO: Déclencher le job d'export asynchrone
    // await this.processExportRequest(exportRequest.id);

    return exportRequest;
  }

  /**
   * Obtenir les demandes d'export d'un utilisateur
   */
  async getExportRequests(userId: string) {
    const requests = await prisma.dataExportRequest.findMany({
      where: { user_id: userId },
      orderBy: { requested_at: 'desc' },
      take: 10,
    });

    return requests;
  }

  /**
   * Obtenir l'URL de téléchargement d'un export
   */
  async getExportDownloadUrl(userId: string, requestId: string) {
    const request = await prisma.dataExportRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.user_id !== userId) {
      throw new Error('Export request not found');
    }

    if (request.status !== 'completed') {
      throw new Error('Export is not ready yet');
    }

    if (!request.download_url) {
      throw new Error('Download URL not available');
    }

    // Vérifier l'expiration
    if (request.expires_at && new Date() > request.expires_at) {
      throw new Error('Download link has expired');
    }

    return {
      url: request.download_url,
      fileName: `afriwonder_export_${userId}_${request.format}`,
    };
  }

  /**
   * Exporter toutes les données d'un utilisateur
   */
  async exportUserData(userId: string): Promise<any> {
    const note =
      'Ceci est un export complet de vos données personnelles conformément au RGPD Article 20.';
    const exportDate = new Date().toISOString();

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          videos: true,
          products: true,
          orders: true,
          transactions: true,
          wallets: true,
          notifications: true,
          follows: true,
          following: true,
          likes: true,
          comments: true,
          reviews: true,
          messages_sent: {
            select: {
              id: true,
              content: true,
              created_at: true,
              conversation_id: true,
            },
          },
          live_streams: true,
          subscriptions: true,
          legal_acceptances: {
            include: {
              document: {
                select: {
                  type: true,
                  version: true,
                  title: true,
                },
              },
            },
          },
          cookie_preferences: true,
          security_logs: true,
          data_export_requests: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const { password_hash, ...userData } = user;
      return serializeForJsonResponse({
        export_date: exportDate,
        user_data: userData,
        note,
      });
    } catch (err) {
      logger.warn('exportUserData: include complet indisponible, repli minimal', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          full_name: true,
          profile_image: true,
          profile_cover_url: true,
          role: true,
          is_verified: true,
          created_at: true,
          updated_at: true,
          country: true,
          bio: true,
          preferred_language: true,
          theme: true,
        },
      });
      if (!user) {
        throw new Error('User not found');
      }
      return serializeForJsonResponse({
        export_date: exportDate,
        user_data: user,
        note: `${note} (extrait partiel — voir logs serveur si l’export complet échoue.)`,
        partial: true,
      });
    }
  }

  // ==========================================
  // ACCOUNT DELETION (RGPD Article 17)
  // ==========================================

  /**
   * Demander la suppression du compte
   */
  async requestAccountDeletion(data: {
    userId: string;
    reason?: string;
    ipAddress: string;
  }) {
    // Vérifier qu'il n'y a pas déjà une demande en cours
    const pendingRequest = await prisma.accountDeletionRequest.findFirst({
      where: {
        user_id: data.userId,
        status: 'pending',
      },
    });

    if (pendingRequest) {
      throw new Error('Vous avez déjà une demande de suppression en cours');
    }

    // Date de suppression programmée (30 jours)
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

    // Générer un token d'annulation
    const cancellationToken = crypto.randomBytes(32).toString('hex');

    const deletionRequest = await prisma.accountDeletionRequest.create({
      data: {
        user_id: data.userId,
        reason: data.reason,
        scheduled_deletion_at: scheduledDeletionAt,
        status: 'pending',
        cancellation_token: cancellationToken,
        ip_address: data.ipAddress,
      },
    });

    // Log de sécurité
    await securityService.logSecurityEvent({
      userId: data.userId,
      action: 'account_deletion_requested',
      status: 'success',
      ipAddress: data.ipAddress,
    });

    // TODO: Envoyer un email avec le lien d'annulation

    return {
      ...deletionRequest,
      cancellation_url: `/api/privacy/cancel-deletion/${cancellationToken}`,
    };
  }

  /**
   * Annuler une demande de suppression
   */
  async cancelAccountDeletion(token: string) {
    const request = await prisma.accountDeletionRequest.findUnique({
      where: { cancellation_token: token },
    });

    if (!request) {
      throw new Error('Invalid cancellation token');
    }

    if (request.status !== 'pending') {
      throw new Error('This deletion request cannot be cancelled');
    }

    const updatedRequest = await prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: 'cancelled',
      },
    });

    // Log de sécurité
    await securityService.logSecurityEvent({
      userId: request.user_id,
      action: 'account_deletion_cancelled',
      status: 'success',
      ipAddress: 'unknown',
    });

    return updatedRequest;
  }

  /**
   * Obtenir le statut de suppression du compte
   */
  async getAccountDeletionStatus(userId: string) {
    const request = await prisma.accountDeletionRequest.findFirst({
      where: {
        user_id: userId,
        status: 'pending',
      },
      orderBy: {
        requested_at: 'desc',
      },
    });

    return {
      has_pending_deletion: !!request,
      deletion_request: request,
    };
  }

  /**
   * Supprimer définitivement un compte
   */
  async permanentlyDeleteAccount(userId: string) {
    // Soft delete de l'utilisateur
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        username: `deleted_${userId}`,
        password_hash: 'DELETED',
        full_name: 'Compte supprimé',
        profile_image: null,
        is_verified: false,
      },
    });

    // Anonymiser les données obligatoires légales
    // (commandes, transactions pour comptabilité)

    // Supprimer les données personnelles
    await Promise.all([
      prisma.userCookiePreference.deleteMany({ where: { user_id: userId } }),
      prisma.notification.deleteMany({ where: { user_id: userId } }),
      // TODO: Supprimer ou anonymiser autres données
    ]);

    // Marquer la demande comme complétée
    await prisma.accountDeletionRequest.updateMany({
      where: {
        user_id: userId,
        status: 'pending',
      },
      data: {
        status: 'completed',
        deleted_at: new Date(),
      },
    });

    return { success: true };
  }

  // ==========================================
  // SECURITY LOGS
  // ==========================================

  /**
   * Obtenir les logs de sécurité d'un utilisateur
   */
  async getSecurityLogs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.securityLog.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.securityLog.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir les alertes d'activités suspectes
   */
  async getSuspiciousActivities(userId: string) {
    const alerts = await prisma.suspiciousActivityAlert.findMany({
      where: {
        user_id: userId,
        status: {
          in: ['pending', 'reviewed'],
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    return alerts;
  }

  // ==========================================
  // 2FA MANAGEMENT
  // ==========================================

  /**
   * Activer la 2FA
   */
  async enable2FA(data: { userId: string; method: string; phoneNumber?: string }) {
    const existing = await prisma.user2FA.findUnique({
      where: { user_id: data.userId },
    });

    if (existing && existing.is_enabled) {
      throw new Error('2FA is already enabled');
    }

    let secret: string | undefined;
    let backupCodes: string[] = [];

    if (data.method === 'authenticator') {
      // Générer un secret pour Google Authenticator
      const secretObj = speakeasy.generateSecret({
        name: 'AfriWonder',
        length: 32,
      });
      secret = secretObj.base32;

      // Générer des codes de backup
      backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
    }

    const twoFactorAuth = await prisma.user2FA.upsert({
      where: { user_id: data.userId },
      update: {
        method: data.method,
        secret,
        backup_codes: backupCodes,
        phone_number: data.phoneNumber,
        is_enabled: false, // Sera activé après vérification
      },
      create: {
        user_id: data.userId,
        method: data.method,
        secret,
        backup_codes: backupCodes,
        phone_number: data.phoneNumber,
        is_enabled: false,
      },
    });

    return {
      secret,
      backup_codes: backupCodes,
      qr_code_url: secret
        ? `otpauth://totp/AfriWonder?secret=${secret}&issuer=AfriWonder`
        : undefined,
    };
  }

  /**
   * Vérifier et activer la 2FA
   */
  async verify2FA(userId: string, code: string) {
    const twoFactor = await prisma.user2FA.findUnique({
      where: { user_id: userId },
    });

    if (!twoFactor || !twoFactor.secret) {
      throw new Error('2FA not initialized');
    }

    // Vérifier le code
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    // Activer la 2FA
    await prisma.user2FA.update({
      where: { user_id: userId },
      data: {
        is_enabled: true,
        enabled_at: new Date(),
      },
    });

    // Log de sécurité
    await securityService.logSecurityEvent({
      userId,
      action: '2fa_enabled',
      status: 'success',
      ipAddress: 'unknown',
    });

    return { success: true, message: '2FA enabled successfully' };
  }

  /**
   * Désactiver la 2FA
   */
  async disable2FA(userId: string, password: string) {
    // Vérifier le mot de passe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new Error('Invalid password');
    }

    // Désactiver la 2FA
    await prisma.user2FA.update({
      where: { user_id: userId },
      data: {
        is_enabled: false,
      },
    });

    // Log de sécurité
    await securityService.logSecurityEvent({
      userId,
      action: '2fa_disabled',
      status: 'success',
      ipAddress: 'unknown',
    });
  }

  /**
   * Obtenir le statut 2FA
   */
  async get2FAStatus(userId: string) {
    const twoFactor = await prisma.user2FA.findUnique({
      where: { user_id: userId },
      select: {
        is_enabled: true,
        method: true,
        enabled_at: true,
        last_used_at: true,
      },
    });

    return twoFactor || { is_enabled: false };
  }
}

export default new PrivacyService();
