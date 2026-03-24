/**
 * Twemoji PNG — version 36×36 pour grilles denses (léger, net sur petites tuiles).
 * @see https://github.com/twitter/twemoji
 */
const TW = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/36x36';

/** Codes hexadécimaux Twemoji (fichier .png sur le CDN). */
export const STICKER_HEX_CODES = [
  /* Visages & émotions */
  '1f600',
  '1f603',
  '1f604',
  '1f601',
  '1f606',
  '1f605',
  '1f607',
  '1f608',
  '1f609',
  '1f60a',
  '1f60b',
  '1f60e',
  '1f60d',
  '1f618',
  '1f617',
  '1f619',
  '1f61a',
  '1f642',
  '1f643',
  '1f923',
  '1f970',
  '1f929',
  '1f973',
  '1f917',
  '1f914',
  '1f610',
  '1f611',
  '1f612',
  '1f613',
  '1f615',
  '1f616',
  '1f61b',
  '1f61c',
  '1f61d',
  '1f620',
  '1f621',
  '1f624',
  '1f628',
  '1f630',
  '1f631',
  '1f633',
  '1f634',
  '1f635',
  '1f636',
  '1f637',
  '1f622',
  '1f62d',
  '1f920',
  '1f921',
  '1f47b',
  '1f47d',
  '1f47e',
  '1f480',
  /* Cœurs & symboles */
  '2764',
  '1f49a',
  '1f49b',
  '1f49c',
  '1f9e1',
  '1f494',
  '1f495',
  '1f48b',
  '1f525',
  '2728',
  '1f4af',
  '1f389',
  '1f38a',
  '1f388',
  '1f382',
  '1f381',
  '1f380',
  '1f384',
  '1f383',
  /* Mains & gestes */
  '1f44d',
  '1f44e',
  '1f44c',
  '1f44f',
  '1f4aa',
  '1f64c',
  '1f64f',
  '1f91d',
  '270c',
  '1faf6',
  /* Animaux */
  '1f436',
  '1f431',
  '1f439',
  '1f430',
  '1f43b',
  '1f43c',
  '1f981',
  '1f984',
  '1f433',
  '1f42d',
  '1f439',
  '1f987',
  '1f41b',
  '1f40c',
  '1f420',
  '1f419',
  /* Nature & nourriture */
  '1f335',
  '1f33b',
  '1f339',
  '1f337',
  '1f34e',
  '1f34a',
  '1f353',
  '1f366',
  '1f369',
  '1f355',
  '1f37a',
  '1f37b',
  '2615',
  /* Activités & objets */
  '26bd',
  '26be',
  '1f3c0',
  '1f3ae',
  '1f3b5',
  '1f3b8',
  '1f4bb',
  '1f4f1',
  '1f4a1',
  '1f6b2',
  '1f697',
  '2708',
  '1f680',
  /* Divers */
  '1f648',
  '1f649',
  '1f64a',
  '1f4a9',
  '1f31b',
  '2b50',
  '1f308',
  '1f30d',
  '1f3d4',
  '1f916',
];

/** Déduplique si doublon dans la liste source. */
function uniqueHex(list) {
  const seen = new Set();
  return list.filter((h) => {
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });
}

export const STICKER_HEX_CODES_UNIQUE = uniqueHex(STICKER_HEX_CODES);

export function twemojiStickerUrl(hexCode) {
  return `${TW}/${hexCode}.png`;
}

export function stickerPackItems() {
  return STICKER_HEX_CODES_UNIQUE.map((hex) => ({
    id: hex,
    url: twemojiStickerUrl(hex),
  }));
}
