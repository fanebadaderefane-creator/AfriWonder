import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import securityService from '../services/security.service.js';

/**
 * Middleware pour logger les actions de sécurité
 */
export const logSecurityAction = (action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Logger l'action après la réponse
    res.on('finish', async () => {
      try {
        const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failed';

        await securityService.logSecurityEvent({
          userId,
          action,
          status,
          ipAddress,
          userAgent,
          metadata: {
            method: req.method,
            path: req.path,
            status_code: res.statusCode,
          },
        });
      } catch (error) {
        console.error('Error logging security action:', error);
      }
    });

    next();
  };
};

/**
 * Middleware pour protéger contre le brute force
 */
export const bruteForceProtection = async (req: Request, res: Response, next: NextFunction) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    const isBlocked = await securityService.isIpBlocked(ipAddress);

    if (isBlocked) {
      return res.status(429).json({
        success: false,
        error: 'Trop de tentatives échouées. Veuillez réessayer dans 15 minutes.',
      });
    }

    const remainingAttempts = await securityService.getRemainingLoginAttempts(ipAddress);

    // Ajouter les informations au header de la réponse
    res.setHeader('X-RateLimit-Remaining', remainingAttempts.toString());

    next();
  } catch (error) {
    console.error('Error in brute force protection:', error);
    next(); // Ne pas bloquer en cas d'erreur
  }
};

/**
 * Middleware pour vérifier les activités suspectes
 */
export const checkSuspiciousActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    return next();
  }

  try {
    // Vérifier s'il y a des alertes critiques non résolues
    const alerts = await securityService['getSuspiciousActivities'](userId);
    const criticalAlerts = alerts.filter((a: any) => 
      a.severity === 'critical' && a.status === 'pending'
    );

    if (criticalAlerts.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte a été temporairement restreint en raison d\'activités suspectes. Veuillez contacter le support.',
        alerts: criticalAlerts.map((a: any) => ({
          type: a.alert_type,
          description: a.description,
        })),
      });
    }

    next();
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    next(); // Ne pas bloquer en cas d'erreur
  }
};

/**
 * Middleware pour logger les actions admin
 */
export const logAdminAction = (action: string, entityType?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const adminId = req.user?.id;

    if (!adminId) {
      return next();
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Logger l'action après la réponse
    res.on('finish', async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const entityId = req.params.id || (req.body && req.body.id);

          await securityService.logAdminAction({
            adminId,
            action,
            entityType,
            entityId,
            changes: req.method === 'PUT' || req.method === 'PATCH' ? req.body : undefined,
            ipAddress,
            userAgent,
          });
        }
      } catch (error) {
        console.error('Error logging admin action:', error);
      }
    });

    next();
  };
};

/**
 * Middleware pour détecter les changements d'IP suspects
 */
export const detectIpChange = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    return next();
  }

  const currentIp = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    // Obtenir la dernière IP de connexion
    const lastLog = await securityService['getLastSecurityLog'](userId, 'login');

    if (lastLog && lastLog.ip_address !== currentIp) {
      // IP différente détectée
      const timeDiff = Date.now() - new Date(lastLog.created_at).getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      // Si changement d'IP en moins de 30 minutes, c'est suspect
      if (minutesDiff < 30) {
        await securityService.createSuspiciousActivityAlert({
          userId,
          alertType: 'rapid_ip_change',
          severity: 'high',
          description: 'Changement d\'adresse IP rapide détecté',
          metadata: {
            previous_ip: lastLog.ip_address,
            current_ip: currentIp,
            time_diff_minutes: Math.round(minutesDiff),
          },
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error detecting IP change:', error);
    next(); // Ne pas bloquer en cas d'erreur
  }
};

export default {
  logSecurityAction,
  bruteForceProtection,
  checkSuspiciousActivity,
  logAdminAction,
  detectIpChange,
};
