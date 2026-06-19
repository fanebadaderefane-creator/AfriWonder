export async function enableCallKeepAwake(_meta?: Record<string, unknown>): Promise<void> {
  /* Web — pas de FLAG_KEEP_SCREEN_ON natif */
}

export function disableCallKeepAwake(_meta?: Record<string, unknown>): void {
  /* noop */
}
