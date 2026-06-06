export type IncomingCallPayload = {
  callId: string;
  callerName: string;
  callerAvatar?: string;
  callerUserId: string;
  type: 'audio' | 'video';
  fromUserId: string;
};

export async function initIncomingCallService(): Promise<void> {
  // Native-only service: CallKit/Notifee are unavailable on web.
}

export async function displayIncomingCall(_payload: IncomingCallPayload): Promise<void> {
  // Incoming call system UI is handled only by native builds.
}

export async function dismissIncomingCall(_callId: string): Promise<void> {
  // No native notification to dismiss on web.
}

export function wireIncomingCallSocket(): () => void {
  return () => {};
}

/** Android-only foreground service — no-op on web. */
export async function startActiveCallForeground(_peerName: string, _isVideo: boolean): Promise<void> {}

export async function stopActiveCallForeground(): Promise<void> {}
