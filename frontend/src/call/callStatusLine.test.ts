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
    peerOnline: true as boolean | null,
    answered: false,
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

  it('priorise le message d’erreur sauf une fois connecté', () => {
    expect(
      formatCallStatusLine({
        ...base,
        errorMsg: 'Pas de réponse.',
        callState: 'ringing',
      }),
    ).toBe('Pas de réponse.');
    expect(
      formatCallStatusLine({
        ...base,
        errorMsg: 'Connexion lente…',
        callState: 'connected',
        durationSeconds: 79,
      }),
    ).toBe('01:19');
  });

  it('sonnerie : en ligne → Appel en cours, hors ligne → Appel', () => {
    expect(
      formatCallStatusLine({ ...base, callState: 'ringing', role: 'caller', peerOnline: true }),
    ).toBe('Appel en cours…');
    expect(
      formatCallStatusLine({ ...base, callState: 'ringing', role: 'caller', peerOnline: false }),
    ).toBe('Appel');
    expect(
      formatCallStatusLine({ ...base, callState: 'ringing', role: 'receiver' }),
    ).toBe('Appel entrant…');
  });

  it('après décrochage : connexion média avant chronomètre', () => {
    expect(
      formatCallStatusLine({
        ...base,
        callState: 'connecting',
        answered: true,
        durationSeconds: 125,
      }),
    ).toBe('Connexion média…');
    expect(
      formatCallStatusLine({
        ...base,
        callState: 'connected',
        answered: true,
        durationSeconds: 9,
      }),
    ).toBe('00:09');
  });

  it('terminé', () => {
    expect(formatCallStatusLine({ ...base, callState: 'ended' })).toBe('Appel terminé');
  });
});
