import prisma from '../config/database.js';
import e2eeService from '../services/e2ee.service.js';
import notificationService from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 min
const RECOVERY_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24h

function getAdminRoleWhereClause() {
  return {
    OR: [
      { role: 'admin' },
      { role: 'super_admin' },
      { role: 'data_admin' },
      { role: 'finance_admin' },
      { role: { contains: 'admin' } },
    ],
  };
}

function normalizeAlertSignature(alerts: string[]) {
  return alerts
    .map((a) => String(a || '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|')
    .slice(0, 180);
}

export async function processE2eeMonitoringAlerts() {
  const snapshot = await e2eeService.getHealthSnapshot();
  const admins = await prisma.user.findMany({
    where: getAdminRoleWhereClause(),
    select: { id: true },
  });
  if (admins.length === 0) {
    return { success: true, alertedAdmins: 0, recoveredAdmins: 0, reason: 'no_admins' };
  }

  if (!Array.isArray(snapshot.alerts) || snapshot.alerts.length === 0) {
    let recoveredAdmins = 0;
    const lookbackSince = new Date(Date.now() - RECOVERY_LOOKBACK_MS);

    for (const admin of admins) {
      const lastAlert = await prisma.notification.findFirst({
        where: {
          user_id: admin.id,
          type: 'e2ee_monitoring_alert',
          reference_type: 'e2ee_monitoring',
          created_at: { gte: lookbackSince },
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, reference_id: true, created_at: true },
      });
      if (!lastAlert?.reference_id) continue;

      const alreadyRecovered = await prisma.notification.count({
        where: {
          user_id: admin.id,
          type: 'e2ee_monitoring_recovered',
          reference_type: 'e2ee_monitoring',
          reference_id: String(lastAlert.reference_id),
          created_at: { gte: new Date(lastAlert.created_at) },
        },
      });
      if (alreadyRecovered > 0) continue;

      await notificationService.create(admin.id, {
        type: 'e2ee_monitoring_recovered',
        title: 'E2EE retabli',
        message: 'Le systeme E2EE est revenu a un etat sain.',
        reference_type: 'e2ee_monitoring',
        reference_id: String(lastAlert.reference_id),
        data: {
          source: 'e2ee_monitoring_job',
          recovered_at: snapshot.timestamp,
        },
      });
      recoveredAdmins += 1;
    }

    return {
      success: true,
      alertedAdmins: 0,
      recoveredAdmins,
      reason: recoveredAdmins > 0 ? 'recovered_sent' : 'healthy',
    };
  }

  const signature = normalizeAlertSignature(snapshot.alerts);
  if (!signature) {
    return { success: true, alertedAdmins: 0, reason: 'no_signature' };
  }

  const since = new Date(Date.now() - ALERT_COOLDOWN_MS);
  let alertedAdmins = 0;
  for (const admin of admins) {
    const alreadySent = await prisma.notification.count({
      where: {
        user_id: admin.id,
        type: 'e2ee_monitoring_alert',
        reference_type: 'e2ee_monitoring',
        reference_id: signature,
        created_at: { gte: since },
      },
    });
    if (alreadySent > 0) continue;

    await notificationService.create(admin.id, {
      type: 'e2ee_monitoring_alert',
      title: 'Alerte E2EE',
      message: `Anomalie E2EE detectee: ${snapshot.alerts.join(', ')}`,
      reference_type: 'e2ee_monitoring',
      reference_id: signature,
      data: {
        source: 'e2ee_monitoring_job',
        alerts: snapshot.alerts,
        prekeys_available: snapshot.prekeys_available,
        devices_registered: snapshot.devices_registered,
        envelopes_last_hour: snapshot.envelopes_last_hour,
        timestamp: snapshot.timestamp,
      },
    });
    alertedAdmins += 1;
  }

  if (alertedAdmins > 0) {
    logger.warn('E2EE monitoring alert notifications sent', {
      signature,
      alertedAdmins,
      alerts: snapshot.alerts,
    });
  }

  return {
    success: true,
    alertedAdmins,
    recoveredAdmins: 0,
    reason: alertedAdmins > 0 ? 'sent' : 'cooldown',
  };
}

export function startE2eeMonitoringAlertJob() {
  const configured = Number(process.env.E2EE_ALERT_JOB_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const intervalMs = Number.isFinite(configured) && configured >= 60_000 ? configured : DEFAULT_INTERVAL_MS;

  setInterval(async () => {
    try {
      await processE2eeMonitoringAlerts();
    } catch (error) {
      logger.error('E2EE monitoring alert job error', { error: (error as Error)?.message });
    }
  }, intervalMs);

  logger.info('E2EE monitoring alert job started', { intervalMs });
}

