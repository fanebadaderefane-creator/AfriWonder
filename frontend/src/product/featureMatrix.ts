import type { BenchmarkCriterionId, MatrixCell } from '../config/benchmarkCore';
import { BENCHMARK_CRITERIA_ORDER } from '../config/benchmarkCore';
import {
  evidenceAfricaAdapted,
  evidenceDataOptimized,
  evidenceMarketplace,
  evidenceMessaging,
  evidenceMobilePayment,
  evidenceOpenAuditable,
  evidenceSocial,
} from './featureEvidence';

export type FeatureMatrixCriterion =
  | 'social'
  | 'marketplace'
  | 'mobilePayment'
  | 'messaging'
  | 'dataOptimized'
  | 'africaAdapted'
  | 'openAuditable';

export type FeatureMatrix = Record<FeatureMatrixCriterion, boolean>;

function buildFeatureMatrix(): FeatureMatrix {
  return {
    social: evidenceSocial(),
    marketplace: evidenceMarketplace(),
    mobilePayment: evidenceMobilePayment(),
    messaging: evidenceMessaging(),
    dataOptimized: evidenceDataOptimized(),
    africaAdapted: evidenceAfricaAdapted(),
    openAuditable: evidenceOpenAuditable(),
  };
}

/** État courant des 7 axes (recalcul à chaque appel — cohérent si les flags changent en mémoire). */
export function getFeatureMatrix(): FeatureMatrix {
  return buildFeatureMatrix();
}

/** Snapshot au chargement du module ; pour une lecture à jour utiliser `getFeatureMatrix()`. */
export const featureMatrix: FeatureMatrix = buildFeatureMatrix();

export function validateSuperApp(): boolean {
  return Object.values(getFeatureMatrix()).every((v) => v === true);
}

function criterionFromFeatureMatrix(m: FeatureMatrix, id: BenchmarkCriterionId): MatrixCell {
  const map: Record<BenchmarkCriterionId, keyof FeatureMatrix> = {
    social: 'social',
    marketplace: 'marketplace',
    mobile_money: 'mobilePayment',
    messaging: 'messaging',
    low_bandwidth: 'dataOptimized',
    africa_product: 'africaAdapted',
    open_engineering: 'openAuditable',
  };
  return m[map[id]] ? 'yes' : 'no';
}

/** Colonne AfriWonder du tableau : dérivée de `getFeatureMatrix()` (pas de données statiques). */
export function getAfriWonderMatrixCells(): Record<BenchmarkCriterionId, MatrixCell> {
  const m = getFeatureMatrix();
  const out = {} as Record<BenchmarkCriterionId, MatrixCell>;
  for (const id of BENCHMARK_CRITERIA_ORDER) {
    out[id] = criterionFromFeatureMatrix(m, id);
  }
  return out;
}
