import { describe, expect, it } from 'vitest';

import {
  AGORA_DM_PIP_TAP_MAX_MOVE_PX,
  AGORA_DM_PIP_TAP_MAX_MS,
  shouldAgoraDmPipSwapOnRelease,
} from './useAgoraDmPipGestures';

describe('shouldAgoraDmPipSwapOnRelease', () => {
  it('tap court sans mouvement → inversion flux', () => {
    expect(
      shouldAgoraDmPipSwapOnRelease({
        elapsedMs: AGORA_DM_PIP_TAP_MAX_MS - 1,
        dx: 0,
        dy: 0,
      }),
    ).toBe(true);
  });

  it('drag → pas d’inversion', () => {
    expect(
      shouldAgoraDmPipSwapOnRelease({
        elapsedMs: 100,
        dx: 20,
        dy: 0,
      }),
    ).toBe(false);
  });

  it('appui long → pas d’inversion', () => {
    expect(
      shouldAgoraDmPipSwapOnRelease({
        elapsedMs: AGORA_DM_PIP_TAP_MAX_MS + 50,
        dx: 0,
        dy: 0,
      }),
    ).toBe(false);
  });

  it('micro-mouvement sous seuil → inversion', () => {
    expect(
      shouldAgoraDmPipSwapOnRelease({
        elapsedMs: 120,
        dx: 4,
        dy: 4,
      }),
    ).toBe(true);
  });
});
