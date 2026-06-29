export async function activateAgoraDmVideoPreview(_callId: string): Promise<boolean> {
  return false;
}

export async function ensureAgoraDmPreviewSession(_callId: string): Promise<boolean> {
  return false;
}

export function peekAgoraDmPreviewSession(_callId: string): boolean {
  return false;
}

export function peekAgoraDmPreviewEngine(_callId: string): null {
  return null;
}

export function isAgoraDmPreviewEngineAlive(_callId: string): boolean {
  return false;
}

export function clearAgoraDmPreviewEngineAlive(_callId: string, _reason: string): void {
  /* noop */
}

export function markAgoraDmPreviewHandoff(_callId: string): boolean {
  return false;
}

export function consumeAgoraDmPreviewEngine(_callId: string): null {
  return null;
}

export function setAgoraDmPreviewVideoEnabled(_callId: string, _on: boolean): void {
  /* noop */
}

export function isAgoraDmPreviewHandoffPending(_callId: string): boolean {
  return false;
}

export async function releaseAgoraDmPreviewSession(_reason: string): Promise<void> {
  /* noop */
}
