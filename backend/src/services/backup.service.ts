/**
 * Sauvegardes / export des données critiques pour sauvegardes automatiques ou manuelles.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const DEFAULT_BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

export interface BackupExportOptions {
  from?: string; // ISO date
  to?: string;  // ISO date
  includeTransactions?: boolean;
  includeOrders?: boolean;
  includeUsersSummary?: boolean;
}

/**
 * Exporte les données critiques (pour backup ou archive).
 */
export async function exportCriticalData(options: BackupExportOptions = {}) {
  const from = options.from ? new Date(options.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = options.to ? new Date(options.to) : new Date();

  const result: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    period: { from: from.toISOString(), to: to.toISOString() },
  };

  if (options.includeUsersSummary !== false) {
    const [userCount, sellerCount] = await Promise.all([
      prisma.user.count(),
      prisma.sellerProfile.count(),
    ]);
    result.usersSummary = { userCount, sellerCount };
  }

  if (options.includeOrders !== false) {
    const orders = await prisma.order.findMany({
      where: { created_at: { gte: from, lte: to } },
      orderBy: { created_at: 'asc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, seller_id: true } } } },
      },
    });
    result.orders = orders;
    result.ordersCount = orders.length;
  }

  if (options.includeTransactions !== false) {
    const transactions = await prisma.transaction.findMany({
      where: { created_at: { gte: from, lte: to } },
      orderBy: { created_at: 'asc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });
    result.transactions = transactions;
    result.transactionsCount = transactions.length;
  }

  return result;
}

/**
 * Écrit l'export dans un fichier dans BACKUP_DIR (pour cron ou script).
 */
export async function writeBackupToFile(options: BackupExportOptions = {}): Promise<string> {
  if (!fs.existsSync(DEFAULT_BACKUP_DIR)) {
    fs.mkdirSync(DEFAULT_BACKUP_DIR, { recursive: true });
  }
  const data = await exportCriticalData(options);
  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(DEFAULT_BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  logger.info('Backup écrit', { filepath, ordersCount: (data as any).ordersCount, transactionsCount: (data as any).transactionsCount });
  return filepath;
}

export default { exportCriticalData, writeBackupToFile };
