import { describe, expect, it, vi } from 'vitest';
import { runCallScreenSafeEffect } from './callScreenSafeEffect';
import * as callDiagnosticLog from './callDiagnosticLog';

describe('runCallScreenSafeEffect', () => {
  it('log l’erreur sans la relancer', () => {
    const logSpy = vi.spyOn(callDiagnosticLog, 'logAfwCall').mockImplementation(() => {});
    expect(() => {
      runCallScreenSafeEffect('test_effect', () => {
        throw new TypeError('undefined is not a function');
      });
    }).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith(
      'call_screen_effect_error',
      expect.objectContaining({ effect: 'test_effect' }),
    );
    logSpy.mockRestore();
  });
});
