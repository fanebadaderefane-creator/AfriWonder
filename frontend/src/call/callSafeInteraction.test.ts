import { describe, expect, it, vi } from 'vitest';
import { runAfterCallUiInteractions } from './callSafeInteraction';

describe('runAfterCallUiInteractions', () => {
  it('fallback direct si runAfterInteractions absent', () => {
    const task = vi.fn();
    runAfterCallUiInteractions(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
