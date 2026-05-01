import { Request } from 'express';

/**
 * Récupère un paramètre de route comme string (Express peut typer params en string | string[]).
 */
export function param(req: Request, key: string): string {
  const v = req.params[key];
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

/** Id campagne = UUID (évite de confondre avec les segments /me/… du routeur). */
export function isUuidLike(s: string): boolean {
  if (!s || s.length < 32) return false;
  if (s === 'me') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
