import { z } from 'zod';

/**
 * Corps JSON objet (clés string). À utiliser quand aucun schéma métier n’est encore défini :
 * refuse tableaux et scalaires en racine (erreur 400 Zod).
 * Les routes critiques doivent préférer un schéma dédié.
 */
export const jsonObjectBodySchema = z.record(z.string(), z.unknown());
