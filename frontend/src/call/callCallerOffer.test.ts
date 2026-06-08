/** ⛔ Régression course createOffer — ne pas supprimer. */
import { describe, expect, it } from 'vitest';
import {
  CALLER_OFFER_MAX_RETRIES,
  chainCallerOfferTask,
  shouldAttemptCallerCreateOffer,
  shouldDeferConnectionWatchdogIceRestart,
  shouldFailCallerAfterOfferRetries,
  shouldIgnoreInboundCallEnd,
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
});
