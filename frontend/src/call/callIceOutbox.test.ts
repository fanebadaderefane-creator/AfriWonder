/** ⛔ Tests de régression livraison ICE — ne pas supprimer. Voir call-signaling-locked.mdc */
import { describe, expect, it, vi } from 'vitest';
import { CallIceOutbox } from './callIceOutbox';

/** Laisse le micro-task queue se vider (flush async interne). */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CallIceOutbox', () => {
  it('émet immédiatement un candidat quand le socket répond OK', async () => {
    const emit = vi.fn().mockResolvedValue(true);
    const outbox = new CallIceOutbox({ emit });
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    await tick();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(outbox.pendingCount).toBe(0);
    expect(outbox.confirmedCount).toBe(1);
  });

  it('conserve le candidat en file si l’émission échoue (pas de perte silencieuse)', async () => {
    const emit = vi.fn().mockResolvedValue(false);
    const outbox = new CallIceOutbox({ emit });
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    await tick();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(outbox.pendingCount).toBe(1);
    expect(outbox.confirmedCount).toBe(0);
  });

  it('ré-essaie les candidats en attente sur reconnexion (flushNow)', async () => {
    const emit = vi
      .fn()
      .mockResolvedValueOnce(false) // 1er essai : socket KO (blip radio)
      .mockResolvedValue(true); // reconnexion : OK
    const outbox = new CallIceOutbox({ emit });
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    await tick();
    expect(outbox.pendingCount).toBe(1);

    outbox.flushNow();
    await tick();
    expect(emit).toHaveBeenCalledTimes(2);
    expect(outbox.pendingCount).toBe(0);
    expect(outbox.confirmedCount).toBe(1);
  });

  it('préserve l’ordre et vide toute la file quand le socket revient', async () => {
    let online = false;
    const sent: (string | null)[] = [];
    const emit = vi.fn(async (candidate: RTCIceCandidateInit | null) => {
      if (!online) return false;
      sent.push(candidate ? String(candidate.candidate) : null);
      return true;
    });
    const outbox = new CallIceOutbox({ emit });
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    outbox.enqueue({ candidate: 'b', sdpMLineIndex: 0, sdpMid: '0' });
    outbox.enqueue({ candidate: 'c', sdpMLineIndex: 0, sdpMid: '0' });
    await tick();
    expect(outbox.pendingCount).toBe(3);

    online = true;
    outbox.flushNow();
    await tick();
    expect(sent).toEqual(['a', 'b', 'c']);
    expect(outbox.pendingCount).toBe(0);
  });

  it('relaie le candidat de fin (null) une fois le socket disponible', async () => {
    let online = false;
    const emit = vi.fn(async () => online);
    const outbox = new CallIceOutbox({ emit });
    outbox.enqueue(null);
    await tick();
    expect(outbox.pendingCount).toBe(1);
    online = true;
    outbox.flushNow();
    await tick();
    expect(outbox.pendingCount).toBe(0);
  });

  it('journalise le résultat de chaque émission (preuve terrain)', async () => {
    const onLog = vi.fn();
    const emit = vi.fn().mockResolvedValue(true);
    const outbox = new CallIceOutbox({ emit, onLog });
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    await tick();
    expect(onLog).toHaveBeenCalledWith('ice_emit', expect.objectContaining({ ok: true }));
  });

  it('n’émet plus rien après close() (fin d’appel)', async () => {
    const emit = vi.fn().mockResolvedValue(true);
    const outbox = new CallIceOutbox({ emit });
    outbox.close();
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    outbox.flushNow();
    await tick();
    expect(emit).not.toHaveBeenCalled();
    expect(outbox.pendingCount).toBe(0);
  });

  it('ne perd pas de candidat même si emit rejette (exception réseau)', async () => {
    const emit = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(true);
    const outbox = new CallIceOutbox({ emit });
    outbox.enqueue({ candidate: 'a', sdpMLineIndex: 0, sdpMid: '0' });
    await tick();
    expect(outbox.pendingCount).toBe(1);
    outbox.flushNow();
    await tick();
    expect(outbox.pendingCount).toBe(0);
    expect(outbox.confirmedCount).toBe(1);
  });
});
