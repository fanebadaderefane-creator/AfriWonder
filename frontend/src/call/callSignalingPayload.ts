/** Payloads socket `call:*` — champs alignés sur le relais backend (`index.ts`). */

export type CallMediaType = 'audio' | 'video';

export function buildCallAcceptPayload(input: {
  callId: string;
  accepterUserId: string;
  callerUserId: string;
  type: CallMediaType;
}): { callId: string; fromUserId: string; toUserId: string; type: CallMediaType } {
  return {
    callId: input.callId,
    fromUserId: input.accepterUserId,
    toUserId: input.callerUserId,
    type: input.type,
  };
}

export function buildCallDeclinePayload(input: {
  callId: string;
  declinerUserId: string;
  callerUserId: string;
  reason?: string;
}): { callId: string; fromUserId: string; toUserId: string; reason?: string } {
  return {
    callId: input.callId,
    fromUserId: input.declinerUserId,
    toUserId: input.callerUserId,
    ...(input.reason ? { reason: input.reason } : {}),
  };
}
