/** ⛔ Tests de régression cycle accept/offre — ne pas supprimer. Voir call-signaling-locked.mdc */
import { describe, expect, it } from 'vitest';
import {
  peerConnectionHasLocalOffer,
  shouldArmMediaConnectionWatchdog,
  shouldClearCallerRingTimeoutOnAccept,
  shouldFinishCallAsMissed,
  shouldDowngradeVideoInviteToAudioAnswer,
  shouldRecoverStalledConnectedCallMedia,
  shouldIceRestartFromConnectedMediaVerdict,
  shouldResendCallerOffer,
  shouldSendCallerOfferAfterInvite,
  STALLED_CONNECTED_MEDIA_RECOVERY_MS,
} from './callAcceptLifecycle';

describe('callAcceptLifecycle', () => {
  it('watchdog média seulement après accept côté appelant', () => {
    expect(shouldArmMediaConnectionWatchdog({ role: 'caller', peerAccepted: false })).toBe(false);
    expect(shouldArmMediaConnectionWatchdog({ role: 'caller', peerAccepted: true })).toBe(true);
    expect(shouldArmMediaConnectionWatchdog({ role: 'receiver', peerAccepted: false })).toBe(true);
  });

  describe('récupération média post-connexion (Maroc↔Mali)', () => {
    const base = {
      role: 'caller' as const,
      callConnected: true,
      hasSelectedPair: true,
      inboundBytesIncreased: false,
      stalledMs: STALLED_CONNECTED_MEDIA_RECOVERY_MS,
      alreadyRecovered: false,
    };

    it('déclenche un ICE restart appelant si média mort assez longtemps', () => {
      expect(shouldRecoverStalledConnectedCallMedia(base)).toBe(true);
    });

    it('appel sain (octets reçus en hausse) → jamais de restart', () => {
      expect(
        shouldRecoverStalledConnectedCallMedia({ ...base, inboundBytesIncreased: true }),
      ).toBe(false);
    });

    it('jamais avant le seuil de stagnation', () => {
      expect(
        shouldRecoverStalledConnectedCallMedia({ ...base, stalledMs: 3_000 }),
      ).toBe(false);
    });

    it('une seule tentative par appel', () => {
      expect(
        shouldRecoverStalledConnectedCallMedia({ ...base, alreadyRecovered: true }),
      ).toBe(false);
    });

    it('le receveur ne pilote pas le restart (anti-glare)', () => {
      expect(
        shouldRecoverStalledConnectedCallMedia({ ...base, role: 'receiver' }),
      ).toBe(false);
    });

    it('pas de restart sans paire ICE mesurable, ni avant connexion', () => {
      expect(shouldRecoverStalledConnectedCallMedia({ ...base, hasSelectedPair: false })).toBe(false);
      expect(shouldRecoverStalledConnectedCallMedia({ ...base, callConnected: false })).toBe(false);
    });

    it('verdict silent_both → ICE restart appelant (une fois)', () => {
      expect(
        shouldIceRestartFromConnectedMediaVerdict({
          role: 'caller',
          verdict: 'silent_both',
          alreadyRecovered: false,
        }),
      ).toBe(true);
      expect(
        shouldIceRestartFromConnectedMediaVerdict({
          role: 'receiver',
          verdict: 'silent_both',
          alreadyRecovered: false,
        }),
      ).toBe(false);
      expect(
        shouldIceRestartFromConnectedMediaVerdict({
          role: 'caller',
          verdict: 'ok',
          alreadyRecovered: false,
        }),
      ).toBe(false);
    });
  });

  it('timer sonnerie appelant annulé à l’accept', () => {
    expect(shouldClearCallerRingTimeoutOnAccept({ role: 'caller' })).toBe(true);
    expect(shouldClearCallerRingTimeoutOnAccept({ role: 'receiver' })).toBe(false);
  });

  it('pas de « manqué » après décrochage (connecting)', () => {
    expect(
      shouldFinishCallAsMissed({ callState: 'connecting', peerAnswered: true }),
    ).toBe(false);
    expect(
      shouldFinishCallAsMissed({ callState: 'ringing', peerAnswered: false }),
    ).toBe(true);
    expect(
      shouldFinishCallAsMissed({ callState: 'connected', peerAnswered: true }),
    ).toBe(false);
  });

  it('downgrade vidéo→audio sur accept 2G', () => {
    expect(shouldDowngradeVideoInviteToAudioAnswer({ startedAsVideo: true, acceptType: 'audio' })).toBe(true);
    expect(shouldDowngradeVideoInviteToAudioAnswer({ startedAsVideo: true, acceptType: 'video' })).toBe(false);
  });

  it('offre appelant après invite si accept déjà reçu', () => {
    expect(
      shouldSendCallerOfferAfterInvite({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: false,
      }),
    ).toBe(true);
    expect(
      shouldSendCallerOfferAfterInvite({
        role: 'caller',
        peerAccepted: false,
        callerOfferSent: false,
      }),
    ).toBe(false);
    expect(
      shouldSendCallerOfferAfterInvite({
        role: 'receiver',
        peerAccepted: true,
        callerOfferSent: false,
      }),
    ).toBe(false);
  });

  it('réémission offre appelant si pas de sdp_remote (max 2)', () => {
    expect(
      shouldResendCallerOffer({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: true,
        hasRemoteDescription: false,
        resendCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldResendCallerOffer({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: false,
        hasLocalOffer: true,
        hasRemoteDescription: false,
        resendCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldResendCallerOffer({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: true,
        hasRemoteDescription: false,
        resendCount: 2,
      }),
    ).toBe(false);
    expect(
      shouldResendCallerOffer({
        role: 'receiver',
        peerAccepted: true,
        callerOfferSent: true,
        hasRemoteDescription: false,
        resendCount: 0,
      }),
    ).toBe(false);
  });

  it('peerConnectionHasLocalOffer détecte have-local-offer', () => {
    expect(
      peerConnectionHasLocalOffer({ signalingState: 'have-local-offer', localDescriptionType: '' }),
    ).toBe(true);
    expect(
      peerConnectionHasLocalOffer({ signalingState: 'stable', localDescriptionType: 'offer' }),
    ).toBe(true);
    expect(
      peerConnectionHasLocalOffer({ signalingState: 'stable', localDescriptionType: 'answer' }),
    ).toBe(false);
  });
});
