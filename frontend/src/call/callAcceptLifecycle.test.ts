/** ⛔ Tests de régression cycle accept/offre — ne pas supprimer. Voir call-signaling-locked.mdc */
import { describe, expect, it } from 'vitest';
import {
  peerConnectionHasLocalOffer,
  shouldArmMediaConnectionWatchdog,
  shouldClearCallerRingTimeoutOnAccept,
  shouldFinishCallAsMissed,
  shouldDowngradeVideoInviteToAudioAnswer,
  shouldResendCallerOffer,
  shouldSendCallerOfferAfterInvite,
} from './callAcceptLifecycle';

describe('callAcceptLifecycle', () => {
  it('watchdog média seulement après accept côté appelant', () => {
    expect(shouldArmMediaConnectionWatchdog({ role: 'caller', peerAccepted: false })).toBe(false);
    expect(shouldArmMediaConnectionWatchdog({ role: 'caller', peerAccepted: true })).toBe(true);
    expect(shouldArmMediaConnectionWatchdog({ role: 'receiver', peerAccepted: false })).toBe(true);
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
