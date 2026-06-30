/** Stratégie retour écran d'appel depuis le chat (WhatsApp). */
export type AgoraDmResumeCallNavAction = 'router_back' | 'router_push';

export function resolveAgoraDmResumeCallNavigation(input: {
  wasMinimized: boolean;
  canGoBack: boolean;
}): AgoraDmResumeCallNavAction {
  /** CallScreen reste dans la pile après minimize — éviter router.push (double écran / noir). */
  if (input.canGoBack) return 'router_back';
  return 'router_push';
}
