/** Stratégie retour écran d'appel depuis le chat (WhatsApp). */
export type AgoraDmResumeCallNavAction = 'router_back' | 'router_push';

export function resolveAgoraDmResumeCallNavigation(input: {
  wasMinimized: boolean;
  canGoBack: boolean;
}): AgoraDmResumeCallNavAction {
  if (input.wasMinimized && input.canGoBack) return 'router_back';
  return 'router_push';
}
