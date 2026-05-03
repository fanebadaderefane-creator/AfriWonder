import 'axios';

declare module 'axios' {
  export interface AxiosError<T = unknown, D = unknown> {
    /** Renseigné par l’intercepteur `apiClient` — utiliser à la place de `message` pour l’UI. */
    userFacingMessage?: string;
  }
}
