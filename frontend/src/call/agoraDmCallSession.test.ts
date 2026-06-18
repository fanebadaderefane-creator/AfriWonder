import { describe, expect, it } from 'vitest';
import { resolveAgoraDmCallId, shouldStartNativeInCallBeforeAgora } from './agoraDmCallSession';

describe('resolveAgoraDmCallId', () => {
  it('receveur exige callId de la route', () => {
    expect(
      resolveAgoraDmCallId({
        role: 'receiver',
        routeCallId: '',
        newCallId: () => 'call-new',
      }),
    ).toEqual({ callId: '', error: 'Appel invalide — identifiant manquant.' });
  });

  it('receveur conserve callId invite', () => {
    expect(
      resolveAgoraDmCallId({
        role: 'receiver',
        routeCallId: 'call-123-abc',
        newCallId: () => 'call-new',
      }),
    ).toEqual({ callId: 'call-123-abc', error: null });
  });

  it('appelant génère callId si absent', () => {
    expect(
      resolveAgoraDmCallId({
        role: 'caller',
        routeCallId: '',
        newCallId: () => 'call-gen',
      }),
    ).toEqual({ callId: 'call-gen', error: null });
  });
});

describe('shouldStartNativeInCallBeforeAgora', () => {
  it('ringback natif uniquement appelant', () => {
    expect(shouldStartNativeInCallBeforeAgora('caller')).toBe(true);
    expect(shouldStartNativeInCallBeforeAgora('receiver')).toBe(false);
  });
});
