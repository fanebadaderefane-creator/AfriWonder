import { existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

/** Chemins relatifs à `frontend/` : preuve qu’un module écran / service existe pour chaque axe. */
const FRONTEND_ROOT = join(__dirname, '..', '..');

const MODULE_PATHS: Record<string, string[]> = {
  social: ['app/(tabs)/index.tsx', 'src/api/videos.ts'],
  marketplace: ['app/(tabs)/market.tsx', 'src/api/ordersApi.ts', 'src/api/cartApi.ts'],
  mobilePayment: ['app/checkout/orange-money.tsx', 'app/cart/index.tsx'],
  messaging: ['app/messages/index.tsx', 'src/services/socketService.ts'],
  dataOptimized: ['src/dataSaver/DataSaverContext.tsx', 'src/components/common/ImageOrPlaceholder.tsx'],
  africaAdapted: ['src/i18n/LanguageContext.tsx', 'src/utils/formatMoney.ts', 'app/settings/language.tsx'],
  openAuditable: ['src/api/client.ts', 'src/api/tokenRefresh.ts', 'app/(auth)/login.tsx'],
};

describe('featureModulePaths', () => {
  it('chaque axe a des fichiers canoniques présents sur le disque', () => {
    for (const [axis, rels] of Object.entries(MODULE_PATHS)) {
      for (const rel of rels) {
        const abs = join(FRONTEND_ROOT, ...rel.split('/'));
        expect(existsSync(abs), `${axis}: manquant ${rel}`).toBe(true);
      }
    }
  });
});
