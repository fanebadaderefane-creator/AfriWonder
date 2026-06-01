export type LiveStartedPayload = {
  streamId: string;
  creatorId: string;
  creatorName?: string;
  creatorAvatar?: string;
  title?: string;
  roomId?: string;
};

export function setLiveStartedToastListener(_fn: ((data: LiveStartedPayload) => void) | null) {
  // Native local notifications are unavailable on web.
}

export async function initLiveStartedNotifService(): Promise<() => void> {
  return () => {};
}
