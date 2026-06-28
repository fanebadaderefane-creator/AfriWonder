import { describe, expect, it, vi } from 'vitest';
import { safeInvokeAsyncRef, safeInvokeSyncRef } from './callSafeRefInvoke';
import * as callDiagnosticLog from './callDiagnosticLog';

describe('callSafeRefInvoke', () => {
  it('ignore une ref non fonction', async () => {
    const ref = { current: { notAFunction: true } as unknown };
    await expect(safeInvokeAsyncRef(ref)).resolves.toBeUndefined();
    expect(ref.current).toBeNull();
  });

  it('log si la ref throw', async () => {
    const logSpy = vi.spyOn(callDiagnosticLog, 'logAfwCall').mockImplementation(() => {});
    const ref = {
      current: () => {
        throw new TypeError('undefined is not a function');
      },
    };
    await safeInvokeAsyncRef(ref, { reason: 'test' });
    expect(logSpy).toHaveBeenCalledWith(
      'call_ref_invoke_failed',
      expect.objectContaining({ reason: 'test' }),
    );
    logSpy.mockRestore();
  });

  it('safeInvokeSyncRef ignore undefined', () => {
    const ref = { current: undefined };
    expect(() => safeInvokeSyncRef(ref)).not.toThrow();
  });
});
