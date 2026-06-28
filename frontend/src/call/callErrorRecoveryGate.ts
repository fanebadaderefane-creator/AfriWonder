/** ErrorBoundary appel — évite finishCall au unmount React pendant recovery média vivant. */
let callScreenRecovering = false;

export function markCallScreenRecovering(active: boolean): void {
  callScreenRecovering = active;
}

export function isCallScreenRecovering(): boolean {
  return callScreenRecovering;
}
