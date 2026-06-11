/**
 * Politique de persistance inbox / fil DM : ne pas effacer l’historique local
 * quand le serveur renvoie une liste vide (erreur proxy, session, réseau).
 */

import { mergeThreadMessagesById, stripThreadDateSeparators } from './dmChatMessageMapper';

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

/**
 * Fusionne serveur + cache + UI par id (ne remplace plus tout l’historique par une page API).
 */
export function mergeThreadMessageSources<T extends { id: string; createdAt?: string }>(
  serverMessages: T[],
  cachedMessages: T[],
  currentMessages: T[],
): T[] {
  if (serverMessages.length === 0 && cachedMessages.length === 0) {
    return stripThreadDateSeparators(currentMessages);
  }
  // Ordre : cache → UI → serveur (le serveur écrase en cas de doublon).
  return mergeThreadMessagesById(
    stripThreadDateSeparators(cachedMessages),
    stripThreadDateSeparators(currentMessages),
    stripThreadDateSeparators(serverMessages),
  );
}
