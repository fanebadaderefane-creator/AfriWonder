import prisma from '../config/database.js';

interface SecurityEventData {
  userId: string;
  action: string;
  status: 'success' | 'failed' | 'suspicious';
  ipAddress: string;
  userAgent?: string;
  deviceInfo?: any;
  metadata?: any;
}

interface SuspiciousActivityData {
  userId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: any;
}

class SecurityService {
  // ==========================================
  // SECURITY LOGGING
  // ==========================================

  /**
   * Logger un événement de sécurité
   */
  async logSecurityEvent(data: SecurityEventData) {
    const riskScore = this.calculateRiskScore(data);

    const log = await prisma.securityLog.create({
      data: {
        user_id: data.userId,
        action: data.action,
        status: data.status,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        device_info: data.deviceInfo,
        metadata: data.metadata,
        risk_score: riskScore,
      },
    });

    // Analyser pour activités suspectes
    await this.analyzeForSuspiciousActivity(data.userId, data);

    return log;
  }

  /**
   * Calculer le score de risque
   */
  private calculateRiskScore(data: SecurityEventData): number {
    let score = 0;

    // Échecs de connexion
    if (data.action === 'login_failed') {
      score += 20;
    }

    // Actions sensibles
    if (['withdrawal', 'password_change', 'email_change', 'account_deletion'].includes(data.action)) {
      score += 10;
    }

    // Statut suspect
    if (data.status === 'suspicious') {
      score += 30;
    }

    return Math.min(score, 100);
  }

  // ==========================================
  // SUSPICIOUS ACTIVITY DETECTION
  // ==========================================

  /**
   * Analyser pour détecter des activités suspectes
   */
  async analyzeForSuspiciousActivity(userId: string, event: SecurityEventData) {
    // 1. Détection de tentatives de connexion multiples échouées
    if (event.action === 'login_failed') {
      await this.checkMultipleFailedLogins(userId, event.ipAddress);
    }

    // 2. Détection de nouvelle localisation/pays
    if (event.action === 'login' && event.status === 'success') {
      await this.checkNewLocation(userId, event.ipAddress);
    }

    // 3. Détection de retraits inhabituels
    if (event.action === 'withdrawal') {
      await this.checkUnusualWithdrawal(userId, event.metadata);
    }

    // 4. Détection de transactions rapides
    if (event.action === 'transaction') {
      await this.checkRapidTransactions(userId);
    }
  }

  /**
   * Vérifier les tentatives de connexion échouées multiples
   */
  private async checkMultipleFailedLogins(userId: string, ipAddress: string) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const failedAttempts = await prisma.securityLog.count({
      where: {
        user_id: userId,
        action: 'login_failed',
        created_at: { gte: fifteenMinutesAgo },
      },
    });

    if (failedAttempts >= 5) {
      await this.createSuspiciousActivityAlert({
        userId,
        alertType: 'multiple_failed_logins',
        severity: 'high',
        description: `${failedAttempts} tentatives de connexion échouées en 15 minutes`,
        metadata: {
          failed_attempts: failedAttempts,
          ip_address: ipAddress,
          time_window: '15 minutes',
        },
      });
    }
  }

  /**
   * Vérifier une nouvelle localisation
   */
  private async checkNewLocation(userId: string, ipAddress: string) {
    // Obtenir les IPs précédentes
    const previousLogs = await prisma.securityLog.findMany({
      where: {
        user_id: userId,
        action: 'login',
        status: 'success',
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { ip_address: true },
    });

    const previousIps = previousLogs.map(log => log.ip_address);
    const isNewIp = !previousIps.includes(ipAddress);

    if (isNewIp && previousLogs.length > 0) {
      // TODO: Utiliser un service de géolocalisation IP pour détecter un nouveau pays
      await this.createSuspiciousActivityAlert({
        userId,
        alertType: 'new_location',
        severity: 'medium',
        description: 'Connexion depuis une nouvelle adresse IP',
        metadata: {
          new_ip: ipAddress,
          previous_ips: previousIps.slice(0, 3),
        },
      });
    }
  }

  /**
   * Vérifier un retrait inhabituel
   */
  private async checkUnusualWithdrawal(userId: string, metadata: any) {
    // Obtenir les retraits précédents
    const previousWithdrawals = await prisma.securityLog.findMany({
      where: {
        user_id: userId,
        action: 'withdrawal',
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    // Si montant très supérieur à la moyenne
    if (metadata?.amount && previousWithdrawals.length > 0) {
      const amounts = previousWithdrawals
        .map(log => (log.metadata as any)?.amount)
        .filter(Boolean);

      if (amounts.length > 0) {
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        
        if (metadata.amount > avgAmount * 5) {
          await this.createSuspiciousActivityAlert({
            userId,
            alertType: 'unusual_withdrawal',
            severity: 'high',
            description: 'Montant de retrait inhabituel détecté',
            metadata: {
              amount: metadata.amount,
              average_amount: avgAmount,
            },
          });
        }
      }
    }
  }

  /**
   * Vérifier les transactions rapides
   */
  private async checkRapidTransactions(userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentTransactions = await prisma.securityLog.count({
      where: {
        user_id: userId,
        action: 'transaction',
        created_at: { gte: fiveMinutesAgo },
      },
    });

    if (recentTransactions >= 10) {
      await this.createSuspiciousActivityAlert({
        userId,
        alertType: 'rapid_transactions',
        severity: 'medium',
        description: `${recentTransactions} transactions en 5 minutes`,
        metadata: {
          transaction_count: recentTransactions,
          time_window: '5 minutes',
        },
      });
    }
  }

  /**
   * Créer une alerte d'activité suspecte
   */
  async createSuspiciousActivityAlert(data: SuspiciousActivityData) {
    // Vérifier s'il n'existe pas déjà une alerte similaire récente
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const existingAlert = await prisma.suspiciousActivityAlert.findFirst({
      where: {
        user_id: data.userId,
        alert_type: data.alertType,
        created_at: { gte: oneHourAgo },
        status: { in: ['pending', 'reviewed'] },
      },
    });

    if (existingAlert) {
      return existingAlert; // Ne pas créer de doublon
    }

    const alert = await prisma.suspiciousActivityAlert.create({
      data: {
        user_id: data.userId,
        alert_type: data.alertType,
        severity: data.severity,
        description: data.description,
        metadata: data.metadata,
        status: 'pending',
      },
    });

    // TODO: Notifier l'utilisateur si sévérité élevée
    if (data.severity === 'high' || data.severity === 'critical') {
      await this.notifyUserOfSuspiciousActivity(data.userId, alert);
    }

    return alert;
  }

  /**
   * Notifier l'utilisateur d'une activité suspecte
   */
  private async notifyUserOfSuspiciousActivity(userId: string, alert: any) {
    // Créer une notification
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: 'security_alert',
        title: 'Activité suspecte détectée',
        message: alert.description,
        reference_id: alert.id,
        reference_type: 'security_alert',
      },
    });

    // TODO: Envoyer un email
    // TODO: Envoyer une notification push
  }

  // ==========================================
  // ADMIN AUDIT LOGGING
  // ==========================================

  /**
   * Logger une action admin
   */
  async logAdminAction(data: {
    adminId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const log = await prisma.adminAuditLog.create({
      data: {
        admin_id: data.adminId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        changes: data.changes,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
    });

    return log;
  }

  /**
   * Obtenir les logs d'audit admin
   */
  async getAdminAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.adminAuditLog.count(),
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

  // ==========================================
  // BRUTE FORCE PROTECTION
  // ==========================================

  /**
   * Vérifier si une IP est bloquée pour brute force
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const failedAttempts = await prisma.securityLog.count({
      where: {
        ip_address: ipAddress,
        action: 'login_failed',
        created_at: { gte: fifteenMinutesAgo },
      },
    });

    return failedAttempts >= 10; // Bloquer après 10 tentatives
  }

  /**
   * Obtenir le nombre de tentatives restantes
   */
  async getRemainingLoginAttempts(ipAddress: string): Promise<number> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const failedAttempts = await prisma.securityLog.count({
      where: {
        ip_address: ipAddress,
        action: 'login_failed',
        created_at: { gte: fifteenMinutesAgo },
      },
    });

    return Math.max(10 - failedAttempts, 0);
  }
}

export default new SecurityService();

