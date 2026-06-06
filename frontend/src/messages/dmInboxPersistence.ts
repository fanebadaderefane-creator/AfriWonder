/**
 * Politique de persistance inbox / fil DM : ne pas effacer l’historique local
 * quand le serveur renvoie une liste vide (erreur proxy, session, réseau).
 */

export function shouldApplyServerInboxList(serverCount: number, cachedCount: number): boolean {
  if (serverCount > 0) return true;
  return cachedCount === 0;
}

/** Priorité : serveur → cache disque → état UI courant (évite écran vide). */
export function pickThreadMessageSource<T>(
  serverMessages: T[],
  cachedMessages: T[],
  currentMessages: T[],
): T[] {
  if (serverMessages.length > 0) return serverMessages;
  if (cachedMessages.length > 0) return cachedMessages;
  return currentMessages;
}
