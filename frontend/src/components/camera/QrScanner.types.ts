import type { ReactNode } from 'react';

export interface QrScannerProps {
  /** Callback appelé avec la valeur brute du QR scanné. */
  onScan: (value: string) => void;
  /** True quand le scanner doit être actif (caméra allumée). */
  active: boolean;
  /** Style appliqué au conteneur racine. */
  style?: any;
  /** Slot affiché lorsqu'aucune permission n'est encore accordée — sinon le composant gère un fallback par défaut. */
  permissionFallback?: ReactNode;
  /** Slot affiché en cas d'erreur runtime / device manquant. */
  errorFallback?: ReactNode;
}
