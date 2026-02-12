/**
 * CDC: Traduction fr ↔ bambara (dictionnaire de base pour chat live)
 */
const FR_BM = {
  bonjour: 'Aw ni ce',
  salut: 'Aw ni ce',
  merci: 'A ni ce',
  oui: 'Owo',
  non: 'Ayi',
  bien: 'Soumaya',
  super: 'Ka di',
  bravo: 'Soumaya',
  bon: 'Soumaya',
  cool: 'Ka di',
  fire: 'Wo',
  beau: 'Ka di',
  belle: 'Ka di',
  amour: 'Kanou',
  cœur: 'Su',
  musique: 'Donkili',
  danse: 'Donsoli',
  live: 'Sigi',
  créateur: 'Daara',
  spectateur: 'Kalanden',
  don: 'Samu',
  cadeau: 'Samu',
  génial: 'Ka di',
  excellent: 'Ka di',
  magnifique: 'Ka di',
  parfait: 'Ka di',
  fantastique: 'Ka di',
  incroyable: 'Ka di',
  trop: 'Boro',
  beaucoup: 'Abada',
  petit: 'Dogo',
  grand: 'Ba',
  nouveau: 'Kura',
  vieux: 'Koro',
  ami: 'Teriya',
  amie: 'Teriya',
  famille: 'Denbaya',
  mali: 'Mali',
  bamako: 'Bamako',
};

const BM_FR = Object.fromEntries(
  Object.entries(FR_BM).map(([k, v]) => [v.toLowerCase(), k])
);

export function translateToBambara(text) {
  if (!text || typeof text !== 'string') return text;
  const words = text.split(/\s+/);
  return words
    .map((w) => {
      const lower = w.toLowerCase().replace(/[^\w\u00c0-\u024f]/g, '');
      return FR_BM[lower] || w;
    })
    .join(' ');
}

export function translateToFrench(text) {
  if (!text || typeof text !== 'string') return text;
  const words = text.split(/\s+/);
  return words
    .map((w) => {
      const lower = w.toLowerCase().replace(/[^\w\u00c0-\u024f]/g, '');
      return BM_FR[lower] || w;
    })
    .join(' ');
}

export function detectLanguage(text) {
  if (!text) return 'fr';
  const sample = text.slice(0, 200).toLowerCase();
  const bmWords = Object.keys(BM_FR).filter((w) => w.length > 2);
  const bmCount = bmWords.filter((w) => sample.includes(w)).length;
  const frWords = Object.keys(FR_BM).filter((w) => w.length > 2);
  const frCount = frWords.filter((w) => sample.includes(w)).length;
  return bmCount > frCount ? 'bm' : 'fr';
}
