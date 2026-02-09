import { Request } from 'express';

/**
 * Récupère un paramètre de route comme string (Express peut typer params en string | string[]).
 */
export function param(req: Request, key: string): string {
  const v = req.params[key];
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}
