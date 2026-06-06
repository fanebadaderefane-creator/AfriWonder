import { Platform } from 'react-native';
import { installMobileMemoryMaintenance } from './mobileMemoryMaintenance';

let installed = false;

/**
 * Stabilité session mobile : maintenance RAM continue + alertes mémoire système.
 * Voir `mobileMemoryMaintenance.ts`.
 */
export function installMobileSessionStability(): void {
  if (installed || Platform.OS === 'web') return;
  installed = true;
  installMobileMemoryMaintenance();
}
