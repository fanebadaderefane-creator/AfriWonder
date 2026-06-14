/**
 * File d'attente fiable pour l'émission des candidats ICE (trickle).
 *
 * Problème observé (Maroc↔Mali, cellulaire) : le SDP traverse car il est émis
 * via `ensureConnectedEmit` **attendu** (12 s), tandis que les candidats ICE
 * étaient envoyés en « fire-and-forget » sans ré-essai. Sur un blip radio
 * (déclenché par l'activation caméra/micro juste après l'offre), un candidat
 * dont l'émission échoue était **perdu silencieusement** → aucune paire ICE →
 * DTLS bloqué en `new` → aucun média.
 *
 * Cette file :
 *  - tente d'émettre chaque candidat immédiatement ;
 *  - en cas d'échec (socket non connecté / timeout), conserve le candidat en
 *    tête de file et le **ré-essaie** au prochain `flushNow()` (appelé sur
 *    (re)connexion du socket) ;
 *  - journalise le résultat de chaque émission (`onLog('ice_emit', …)`) afin de
 *    disposer d'une preuve terrain (le « fire-and-forget » n'en laissait aucune).
 *
 * Module **pur** (aucune dépendance socket/WebRTC) → entièrement testable.
 * Réémettre un même candidat est inoffensif : l'agent ICE distant ignore les
 * doublons.
 */

export type OutboundIceCandidate = RTCIceCandidateInit | null;

export interface CallIceOutboxOptions {
  /** Émet réellement un candidat. Doit résoudre `true` uniquement si envoyé. */
  emit: (candidate: OutboundIceCandidate) => Promise<boolean>;
  /** Journalisation diagnostique optionnelle. */
  onLog?: (phase: string, data: Record<string, unknown>) => void;
}

interface QueuedCandidate {
  candidate: OutboundIceCandidate;
  attempts: number;
}

export class CallIceOutbox {
  private readonly queue: QueuedCandidate[] = [];
  private sending = false;
  private closed = false;
  private sentCount = 0;

  constructor(private readonly options: CallIceOutboxOptions) {}

  /** Ajoute un candidat local et tente de vider la file. */
  enqueue(candidate: OutboundIceCandidate): void {
    if (this.closed) return;
    this.queue.push({ candidate, attempts: 0 });
    void this.flush();
  }

  /** Ré-essaie les candidats non confirmés (à appeler sur (re)connexion socket). */
  flushNow(): void {
    if (this.closed) return;
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.sending || this.closed) return;
    this.sending = true;
    try {
      while (this.queue.length > 0 && !this.closed) {
        const item = this.queue[0];
        item.attempts += 1;
        let ok = false;
        try {
          ok = await this.options.emit(item.candidate);
        } catch {
          ok = false;
        }
        if (this.closed) break;
        this.options.onLog?.('ice_emit', {
          ok,
          attempts: item.attempts,
          queued: this.queue.length,
          end: item.candidate === null,
        });
        if (ok) {
          this.queue.shift();
          this.sentCount += 1;
        } else {
          // Conserver en tête de file ; ré-essai au prochain flushNow (reconnexion).
          break;
        }
      }
    } finally {
      this.sending = false;
    }
  }

  /** Détruit la file (fin d'appel) — empêche toute émission ultérieure. */
  close(): void {
    this.closed = true;
    this.queue.length = 0;
  }

  /** Nombre de candidats encore en attente de confirmation. */
  get pendingCount(): number {
    return this.queue.length;
  }

  /** Nombre de candidats confirmés envoyés (diagnostic / tests). */
  get confirmedCount(): number {
    return this.sentCount;
  }
}
