/** IDs optimistes (Date.now()) — jamais enregistrés côté serveur tant que l’envoi n’a pas réussi. */
export function isLocalOnlyMessageId(id: string): boolean {
  return /^\d{10,}$/.test(String(id || '').trim());
}
