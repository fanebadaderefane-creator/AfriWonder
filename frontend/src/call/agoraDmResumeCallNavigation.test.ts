import { describe, expect, it } from 'vitest';

import { resolveAgoraDmResumeCallNavigation } from './agoraDmResumeCallNavigation';

describe('resolveAgoraDmResumeCallNavigation', () => {
  it('chat minimisé — pop la pile (pas un 2e push call)', () => {
    expect(
      resolveAgoraDmResumeCallNavigation({ wasMinimized: true, canGoBack: true }),
    ).toBe('router_back');
  });

  it('pile navigation — router.back dès que possible (évite double CallScreen)', () => {
    expect(
      resolveAgoraDmResumeCallNavigation({ wasMinimized: false, canGoBack: true }),
    ).toBe('router_back');
  });

  it('sans historique — push call', () => {
    expect(
      resolveAgoraDmResumeCallNavigation({ wasMinimized: true, canGoBack: false }),
    ).toBe('router_push');
  });
});
