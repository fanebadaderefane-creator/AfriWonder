import { describe, expect, it } from 'vitest';

import {
  agoraDmLocalPreviewLayoutKey,
  shouldRefreshAgoraDmLocalPreviewOnLayout,
} from './agoraDmLocalPreviewSurfaceLayout';

describe('agoraDmLocalPreviewSurfaceLayout', () => {
  it('refuse sync sur layout 0×0', () => {
    expect(shouldRefreshAgoraDmLocalPreviewOnLayout(0, 156)).toBe(false);
    expect(shouldRefreshAgoraDmLocalPreviewOnLayout(110, 0)).toBe(false);
  });

  it('accepte PiP 110×156', () => {
    expect(shouldRefreshAgoraDmLocalPreviewOnLayout(110, 156)).toBe(true);
    expect(agoraDmLocalPreviewLayoutKey(110, 156)).toBe('110x156');
  });
});
