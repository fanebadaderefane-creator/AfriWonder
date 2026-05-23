/**
 * Backup export script. Run: npx tsx backend/scripts/backup-export.ts
 * Env: BACKUP_DIR, DATABASE_URL. Optional: BACKUP_FROM, BACKUP_TO (ISO dates).
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

import { writeBackupToFile } from '../src/services/backup.service.js';

async function main() {
  const options = {
    from: process.env.BACKUP_FROM || undefined,
    to: process.env.BACKUP_TO || undefined,
    includeOrders: true,
    includeTransactions: true,
    includeUsersSummary: true,
  };
  console.log('Export backup...');
  const filepath = await writeBackupToFile(options);
  console.log('Backup written:', filepath);
  process.exit(0);
}

main().catch((err) => {
  console.error('Backup error:', err);
  process.exit(1);
});
