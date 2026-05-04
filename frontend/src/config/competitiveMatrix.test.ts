import { describe, it, expect } from 'vitest';
import {
  BENCHMARK_CRITERIA_ORDER,
  COMPETITOR_ILLUSTRATIVE_COLUMNS,
  getAfriWonderMatrixCells,
  validateSuperApp,
  getFeatureMatrix,
} from './competitiveMatrix';

describe('competitiveMatrix + featureMatrix', () => {
  it('validateSuperApp : tous les axes fonctionnels à true', () => {
    expect(validateSuperApp()).toBe(true);
  });

  it('getFeatureMatrix : 7 clés booléennes', () => {
    const m = getFeatureMatrix();
    expect(Object.keys(m).sort()).toEqual(
      ['africaAdapted', 'dataOptimized', 'marketplace', 'messaging', 'mobilePayment', 'openAuditable', 'social'].sort(),
    );
    expect(Object.values(m).every((v) => v === true)).toBe(true);
  });

  it('colonne AfriWonder : une cellule par critère, tout vert si super-app valide', () => {
    const cells = getAfriWonderMatrixCells();
    expect(BENCHMARK_CRITERIA_ORDER.every((id) => id in cells)).toBe(true);
    if (validateSuperApp()) {
      for (const id of BENCHMARK_CRITERIA_ORDER) {
        expect(cells[id]).toBe('yes');
      }
    }
  });

  it('3 colonnes concurrentes illustratives, 7 critères chacune', () => {
    expect(COMPETITOR_ILLUSTRATIVE_COLUMNS.length).toBe(3);
    for (const col of COMPETITOR_ILLUSTRATIVE_COLUMNS) {
      for (const id of BENCHMARK_CRITERIA_ORDER) {
        expect(['yes', 'no', 'partial']).toContain(col.cells[id]);
      }
    }
  });
});
