/**
 * Masquage léger anti-insultes (FR) — complète les mots bannis configurables par live.
 * Liste conservatrice : mots entiers (\b) pour limiter les faux positifs.
 */
const PHRASES: string[] = [
  'nique ta mère',
  'nique ta race',
  'fils de pute',
  'ta gueule',
  'va te faire',
  'ferme ta gueule',
];

const WORDS: string[] = [
  'connard',
  'connasse',
  'salope',
  'pute',
  'enculé',
  'enculee',
  'enculer',
  'pd',
  'fdp',
  'tarlouze',
  'tapette',
  'nazi',
  'hitler',
  'chienne',
  'salaud',
  'abruti',
  'crétin',
  'cretin',
  'imbécile',
  'imbecile',
  'bouffon',
  'taré',
  'tare',
  'merde',
  'putain',
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskProfanityFr(input: string): string {
  let out = String(input || '');
  for (const phrase of PHRASES) {
    out = out.replace(new RegExp(escapeRe(phrase), 'gi'), '***');
  }
  for (const w of WORDS) {
    if (w.length < 2) continue;
    out = out.replace(new RegExp(`\\b${escapeRe(w)}\\b`, 'gi'), '***');
  }
  return out;
}
