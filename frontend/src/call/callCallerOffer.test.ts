/** ⛔ Régression course createOffer — ne pas supprimer. */
import { describe, expect, it } from 'vitest';
import {
  CALLER_BOOTSTRAP_MAX_WAIT_MS,
  CALLER_BOOTSTRAP_POLL_MS,
  CALLER_OFFER_MAX_RETRIES,
  callerBootstrapMaxWaitPolls,
  chainCallerOfferTask,
  isCallerOfferNegotiationLocked,
  shouldAttemptCallerCreateOffer,
  shouldAttemptCallerOfferMediaRecovery,
  shouldCountCallerOfferRetryAttempt,
  shouldCreateCallerOffer,
  shouldDeferConnectionWatchdogIceRestart,
  shouldDeferIceRestartOffer,
  shouldFailCallerAfterOfferRetries,
  shouldIgnoreInboundCallEnd,
  shouldIgnoreNegotiationNeeded,
  shouldMutateCallerMediaForOffer,
  shouldRetryCallerOfferAfterAccept,
  shouldSkipCallerOfferMediaSetup,
} from './callCallerOffer';

describe('callCallerOffer', () => {
  it('shouldAttemptCallerCreateOffer refuse si offre déjà envoyée ou posée localement', () => {
    expect(shouldAttemptCallerCreateOffer({ callerOfferSent: true })).toBe(false);
    expect(
      shouldAttemptCallerCreateOffer({
        callerOfferSent: false,
        signalingState: 'have-local-offer',
      }),
    ).toBe(false);
    expect(
      shouldAttemptCallerCreateOffer({
        callerOfferSent: false,
        localDescriptionType: 'offer',
      }),
    ).toBe(false);
    expect(
      shouldAttemptCallerCreateOffer({
        callerOfferSent: false,
        signalingState: 'stable',
      }),
    ).toBe(true);
  });

  it('chainCallerOfferTask sérialise deux tâches (pas de createOffer parallèle)', async () => {
    const order: string[] = [];
    let chain = Promise.resolve(false);

    const first = () =>
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          order.push('first');
          resolve(true);
        }, 30);
      });
    const second = () =>
      new Promise<boolean>((resolve) => {
        order.push('second');
        resolve(true);
      });

    const a = chainCallerOfferTask(chain, first);
    chain = a.nextChain;
    const b = chainCallerOfferTask(chain, second);

    await Promise.all([a.result, b.result]);
    expect(order).toEqual(['first', 'second']);
  });

  it('chainCallerOfferTask propage false si une tâche échoue sans bloquer la chaîne', async () => {
    let chain = Promise.resolve(false);
    const fail = () => Promise.reject(new Error('InvalidStateError'));
    const ok = () => Promise.resolve(true);

    const a = chainCallerOfferTask(chain, fail);
    chain = a.nextChain;
    const b = chainCallerOfferTask(chain, ok);

    await expect(a.result).resolves.toBe(false);
    await expect(b.result).resolves.toBe(true);
  });

  it('shouldIgnoreInboundCallEnd filtre callId mismatch et sonnerie sans callId', () => {
    expect(
      shouldIgnoreInboundCallEnd({
        payloadCallId: 'call-a',
        localCallId: 'call-b',
        callState: 'ringing',
        role: 'caller',
      }),
    ).toBe(true);
    expect(
      shouldIgnoreInboundCallEnd({
        localCallId: 'call-b',
        callState: 'ringing',
        role: 'caller',
      }),
    ).toBe(true);
    expect(
      shouldIgnoreInboundCallEnd({
        payloadCallId: 'call-b',
        localCallId: 'call-b',
        callState: 'connecting',
        role: 'caller',
      }),
    ).toBe(false);
  });

  it('shouldDeferConnectionWatchdogIceRestart pendant négociation offre', () => {
    expect(shouldDeferConnectionWatchdogIceRestart(true)).toBe(true);
    expect(shouldDeferConnectionWatchdogIceRestart(false)).toBe(false);
  });

  it('shouldFailCallerAfterOfferRetries respecte la limite', () => {
    expect(shouldFailCallerAfterOfferRetries(CALLER_OFFER_MAX_RETRIES)).toBe(false);
    expect(shouldFailCallerAfterOfferRetries(CALLER_OFFER_MAX_RETRIES + 1)).toBe(true);
  });

  it('shouldCountCallerOfferRetryAttempt attend le bootstrap appelant', () => {
    expect(shouldCountCallerOfferRetryAttempt({ callerBootstrapReady: false })).toBe(false);
    expect(shouldCountCallerOfferRetryAttempt({ callerBootstrapReady: true })).toBe(true);
  });

  it('callerBootstrapMaxWaitPolls couvre 45 s en polls de 100 ms', () => {
    expect(callerBootstrapMaxWaitPolls(CALLER_BOOTSTRAP_MAX_WAIT_MS, CALLER_BOOTSTRAP_POLL_MS)).toBe(450);
  });

  it('isCallerOfferNegotiationLocked — offre envoyée sans answer', () => {
    expect(
      isCallerOfferNegotiationLocked({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: true,
        hasLocalOffer: true,
        hasRemoteDescription: false,
      }),
    ).toBe(true);
    expect(
      isCallerOfferNegotiationLocked({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: false,
        hasLocalOffer: true,
        hasRemoteDescription: false,
      }),
    ).toBe(true);
    expect(
      isCallerOfferNegotiationLocked({
        role: 'caller',
        peerAccepted: true,
        callerOfferSent: true,
        hasLocalOffer: true,
        hasRemoteDescription: true,
      }),
    ).toBe(false);
  });

  it('shouldCreateCallerOffer refuse si négociation verrouillée', () => {
    expect(
      shouldCreateCallerOffer({
        callerOfferSent: false,
        signalingState: 'stable',
        negotiationLocked: true,
      }),
    ).toBe(false);
  });

  it('shouldSkipCallerOfferMediaSetup — bootstrap OK → pas de mutation à accept', () => {
    expect(
      shouldSkipCallerOfferMediaSetup({
        localTracksAttachedAtBootstrap: true,
        hasActiveAudioSender: true,
      }),
    ).toBe(true);
    expect(
      shouldSkipCallerOfferMediaSetup({
        localTracksAttachedAtBootstrap: true,
        hasActiveAudioSender: false,
      }),
    ).toBe(false);
  });

  it('shouldMutateCallerMediaForOffer — une seule préparation', () => {
    expect(
      shouldMutateCallerMediaForOffer({
        negotiationLocked: false,
        callerOfferSent: false,
        hasLocalOffer: false,
        mediaPrepared: false,
        localTracksAttachedAtBootstrap: false,
        hasActiveAudioSender: false,
      }),
    ).toBe(true);
    expect(
      shouldMutateCallerMediaForOffer({
        negotiationLocked: false,
        callerOfferSent: false,
        hasLocalOffer: false,
        mediaPrepared: true,
        localTracksAttachedAtBootstrap: false,
        hasActiveAudioSender: false,
      }),
    ).toBe(false);
    expect(
      shouldMutateCallerMediaForOffer({
        negotiationLocked: false,
        callerOfferSent: false,
        hasLocalOffer: false,
        mediaPrepared: false,
        localTracksAttachedAtBootstrap: true,
        hasActiveAudioSender: true,
      }),
    ).toBe(false);
  });

  it('shouldAttemptCallerOfferMediaRecovery — au plus une fois', () => {
    expect(
      shouldAttemptCallerOfferMediaRecovery({
        negotiationLocked: false,
        callerOfferSent: false,
        hasLocalOffer: false,
        recoveryAlreadyAttempted: false,
        localTracksAttachedAtBootstrap: false,
        hasActiveAudioSender: false,
      }),
    ).toBe(true);
    expect(
      shouldAttemptCallerOfferMediaRecovery({
        negotiationLocked: false,
        callerOfferSent: false,
        hasLocalOffer: false,
        recoveryAlreadyAttempted: true,
        localTracksAttachedAtBootstrap: false,
        hasActiveAudioSender: false,
      }),
    ).toBe(false);
    expect(
      shouldAttemptCallerOfferMediaRecovery({
        negotiationLocked: false,
        callerOfferSent: false,
        hasLocalOffer: false,
        recoveryAlreadyAttempted: false,
        localTracksAttachedAtBootstrap: true,
        hasActiveAudioSender: true,
      }),
    ).toBe(false);
  });

  it('shouldIgnoreNegotiationNeeded sur natif avant connecté', () => {
    expect(
      shouldIgnoreNegotiationNeeded({
        isNativeRuntime: true,
        connectionState: 'new',
        offerNegotiationInFlight: false,
        negotiationLocked: false,
      }),
    ).toBe(true);
    expect(
      shouldIgnoreNegotiationNeeded({
        isNativeRuntime: true,
        connectionState: 'connected',
        offerNegotiationInFlight: false,
        negotiationLocked: false,
      }),
    ).toBe(false);
    expect(
      shouldIgnoreNegotiationNeeded({
        isNativeRuntime: false,
        connectionState: 'new',
        offerNegotiationInFlight: false,
        negotiationLocked: true,
      }),
    ).toBe(false);
  });

  it('shouldDeferIceRestartOffer tant que pas de answer', () => {
    expect(
      shouldDeferIceRestartOffer({
        role: 'caller',
        negotiationLocked: true,
        callerOfferSent: true,
        hasRemoteDescription: false,
      }),
    ).toBe(true);
    expect(
      shouldDeferIceRestartOffer({
        role: 'caller',
        negotiationLocked: false,
        callerOfferSent: true,
        hasRemoteDescription: true,
      }),
    ).toBe(false);
  });

  it('shouldRetryCallerOfferAfterAccept — pas si offre déjà partie', () => {
    expect(
      shouldRetryCallerOfferAfterAccept({
        sent: false,
        callerOfferSent: true,
        peerAccepted: true,
        cancelled: false,
      }),
    ).toBe(false);
    expect(
      shouldRetryCallerOfferAfterAccept({
        sent: false,
        callerOfferSent: false,
        peerAccepted: true,
        cancelled: false,
      }),
    ).toBe(true);
  });
});
