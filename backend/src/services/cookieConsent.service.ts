/**
 * Cookie Consent Management Service (CMP)
 * Gère les préférences de cookies des utilisateurs (GDPR compliant)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class CookieConsentService {
  /**
   * Récupérer les préférences cookies d'un utilisateur
   */
  async getUserPreferences(userId: string) {
    try {
      let preferences = await prisma.userCookiePreference.findUnique({
        where: { user_id: userId },
      });

      // Si aucune préférence, créer avec valeurs par défaut
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
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des préférences cookies', { error, userId });
      throw error;
    }
  }

  /**
   * Mettre à jour les préférences cookies d'un utilisateur
   */
  async updateUserPreferences(
    userId: string,
    preferences: {
      analytics?: boolean;
      marketing?: boolean;
      functional?: boolean;
      social_media?: boolean;
    },
    metadata?: {
      ip_address?: string;
      user_agent?: string;
    }
  ) {
    try {
      const updated = await prisma.userCookiePreference.upsert({
        where: { user_id: userId },
        update: {
          ...preferences,
          ip_address: metadata?.ip_address,
          user_agent: metadata?.user_agent,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          essential: true,
          analytics: preferences.analytics ?? false,
          marketing: preferences.marketing ?? false,
          functional: preferences.functional ?? false,
          social_media: preferences.social_media ?? false,
          ip_address: metadata?.ip_address,
          user_agent: metadata?.user_agent,
        },
      });

      // Enregistrer dans le log de consentement
      await this.logConsent(userId, 'cookies', true, metadata);

      logger.info('Préférences cookies mises à jour', { userId, preferences });

      return updated;
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour des préférences cookies', { error, userId });
      throw error;
    }
  }

  /**
   * Accepter tous les cookies
   */
  async acceptAll(userId: string, metadata?: { ip_address?: string; user_agent?: string }) {
    return this.updateUserPreferences(
      userId,
      {
        analytics: true,
        marketing: true,
        functional: true,
        social_media: true,
      },
      metadata
    );
  }

  /**
   * Refuser tous les cookies non essentiels
   */
  async rejectAll(userId: string, metadata?: { ip_address?: string; user_agent?: string }) {
    return this.updateUserPreferences(
      userId,
      {
        analytics: false,
        marketing: false,
        functional: false,
        social_media: false,
      },
      metadata
    );
  }

  /**
   * Gérer le consentement des invités (avant login)
   */
  async saveGuestConsent(
    sessionId: string,
    preferences: {
      analytics: boolean;
      marketing: boolean;
      functional: boolean;
      social_media: boolean;
    },
    ipAddress?: string
  ) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365); // Expire après 1 an

      const consent = await prisma.guestCookieConsent.create({
        data: {
          session_id: sessionId,
          essential: true,
          analytics: preferences.analytics,
          marketing: preferences.marketing,
          functional: preferences.functional,
          social_media: preferences.social_media,
          ip_address: ipAddress,
          expires_at: expiresAt,
        },
      });

      logger.info('Consentement invité enregistré', { sessionId });

      return consent;
    } catch (error: any) {
      logger.error('Erreur lors de l\'enregistrement du consentement invité', { error, sessionId });
      throw error;
    }
  }

  /**
   * Récupérer le consentement d'un invité
   */
  async getGuestConsent(sessionId: string) {
    try {
      const consent = await prisma.guestCookieConsent.findFirst({
        where: {
          session_id: sessionId,
          expires_at: {
            gt: new Date(),
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return consent;
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du consentement invité', { error, sessionId });
      return null;
    }
  }

  /**
   * Nettoyer les consentements invités expirés
   */
  async cleanupExpiredGuestConsents() {
    try {
      const result = await prisma.guestCookieConsent.deleteMany({
        where: {
          expires_at: {
            lt: new Date(),
          },
        },
      });

      logger.info('Consentements invités expirés nettoyés', { count: result.count });

      return result.count;
    } catch (error: any) {
      logger.error('Erreur lors du nettoyage des consentements expirés', { error });
      throw error;
    }
  }

  /**
   * Enregistrer un log de consentement
   */
  private async logConsent(
    userId: string,
    consentType: string,
    consentGiven: boolean,
    metadata?: {
      ip_address?: string;
      user_agent?: string;
      consent_version?: string;
    }
  ) {
    try {
      await prisma.consentLog.create({
        data: {
          user_id: userId,
          consent_type: consentType,
          consent_given: consentGiven,
          consent_version: metadata?.consent_version,
          ip_address: metadata?.ip_address,
          user_agent: metadata?.user_agent,
        },
      });
    } catch (error: any) {
      logger.error('Erreur lors de l\'enregistrement du log de consentement', { error });
    }
  }

  /**
   * Vérifier si un utilisateur a donné un consentement spécifique
   */
  async hasConsent(userId: string, consentType: 'analytics' | 'marketing' | 'functional' | 'social_media'): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences[consentType] === true;
    } catch (error: any) {
      logger.error('Erreur lors de la vérification du consentement', { error, userId, consentType });
      return false;
    }
  }
}

export default new CookieConsentService();
