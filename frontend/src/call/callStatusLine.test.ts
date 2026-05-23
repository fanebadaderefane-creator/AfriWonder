import { describe, expect, it } from 'vitest';
import { formatCallDurationMmSs, formatCallStatusLine } from './callStatusLine';

describe('formatCallDurationMmSs', () => {
  it('formate mm:ss avec zéros à gauche', () => {
    expect(formatCallDurationMmSs(0)).toBe('00:00');
    expect(formatCallDurationMmSs(9)).toBe('00:09');
    expect(formatCallDurationMmSs(65)).toBe('01:05');
    expect(formatCallDurationMmSs(3599)).toBe('59:59');
  });
});

describe('formatCallStatusLine', () => {
  const base = {
    hasWebRtcSupport: true,
    errorMsg: null as string | null,
    durationSeconds: 0,
    role: 'caller' as const,
  };

  it('sans WebRTC utilisable', () => {
    expect(
      formatCallStatusLine({
        ...base,
        hasWebRtcSupport: false,
        callState: 'connected',
      }),
    ).toBe('Appel indisponible sur cet appareil.');
  });

  it('priorise le message d’erreur', () => {
    expect(
      formatCallStatusLine({
        ...base,
        errorMsg: 'Pas de réponse.',
        callState: 'ringing',
      }),
    ).toBe('Pas de réponse.');
  });

  it('sonnerie selon le rôle', () => {
    expect(formatCallStatusLine({ ...base, callState: 'ringing', role: 'caller' })).toBe('Sonnerie…');
    expect(formatCallStatusLine({ ...base, callState: 'ringing', role: 'receiver' })).toBe('Appel entrant…');
  });

  it('connexion en cours', () => {
    expect(formatCallStatusLine({ ...base, callState: 'connecting' })).toBe('Appel en cours…');
  });

  it('connecté avec durée', () => {
    expect(
      formatCallStatusLine({
        ...base,
        callState: 'connected',
        durationSeconds: 125,
      }),
    ).toBe('Appel en cours · 02:05');
  });

  it('terminé', () => {
    expect(formatCallStatusLine({ ...base, callState: 'ended' })).toBe('Appel terminé');
  });
});
