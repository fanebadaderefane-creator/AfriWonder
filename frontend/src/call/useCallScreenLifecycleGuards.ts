/**
 * Réexport — hook déplacé dans callSessionStability.ts (évite erreur TS sur fichier supprimé).
 */
export {
  useCallScreenLifecycleGuards,
  type CallScreenLifecycleGuardInput,
} from './callSessionStability';
