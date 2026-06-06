/** Délai avant de masquer le chevron après sortie du survol (web) — laisse le temps de cliquer. */
export const MESSAGE_BUBBLE_HIGHLIGHT_HOVER_RELEASE_MS = 400;

export type MessageHighlightDelayedRelease = {
  schedule: (messageId: string, release: (id: string) => void) => void;
  cancel: () => void;
};

export function createMessageHighlightDelayedRelease(
  delayMs = MESSAGE_BUBBLE_HIGHLIGHT_HOVER_RELEASE_MS,
): MessageHighlightDelayedRelease {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let scheduledId: string | null = null;

  return {
    schedule(messageId, release) {
      scheduledId = messageId;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (scheduledId === messageId) release(messageId);
        timer = null;
        scheduledId = null;
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      scheduledId = null;
    },
  };
}
