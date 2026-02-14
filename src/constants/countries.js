/**
 * Pays d'Afrique de l'Ouest avec leurs drapeaux (ECOWAS + Mauritanie)
 * Utilisé pour le ciblage publicitaire AfriWonder
 */
export const WEST_AFRICAN_COUNTRIES = [
  { name: 'Bénin', flag: '🇧🇯' },
  { name: 'Burkina Faso', flag: '🇧🇫' },
  { name: 'Cap-Vert', flag: '🇨🇻' },
  { name: "Côte d'Ivoire", flag: '🇨🇮' },
  { name: 'Gambie', flag: '🇬🇲' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Guinée', flag: '🇬🇳' },
  { name: 'Guinée-Bissau', flag: '🇬🇼' },
  { name: 'Liberia', flag: '🇱🇷' },
  { name: 'Mali', flag: '🇲🇱' },
  { name: 'Mauritanie', flag: '🇲🇷' },
  { name: 'Niger', flag: '🇳🇪' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Sénégal', flag: '🇸🇳' },
  { name: 'Sierra Leone', flag: '🇸🇱' },
  { name: 'Togo', flag: '🇹🇬' },
];

/**
 * Liste complète des pays du monde (ISO 3166-1)
 * Utilisé pour le ciblage publicitaire et l'inscription annonceur
 */
export const ALL_COUNTRIES = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Antigua-et-Barbuda', 'Arabie saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche',
  'Azerbaïdjan', 'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin',
  'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 'Brésil',
  'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun', 'Canada',
  'Cap-Vert', 'Centrafrique', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo', 'Congo (RDC)', "Corée du Nord", "Corée du Sud", 'Costa Rica', "Côte d'Ivoire",
  'Croatie', 'Cuba', 'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis',
  'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie',
  'Fidji', 'Finlande', 'France', 'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade',
  'Guatemala', 'Guinée', 'Guinée-Bissau', 'Guinée équatoriale', 'Guyana', 'Haïti', 'Honduras',
  'Hongrie', 'Îles Marshall', 'Îles Salomon', 'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande',
  'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie', 'Kazakhstan', 'Kenya',
  'Kirghizistan', 'Kiribati', 'Kosovo', 'Koweït', 'Laos', 'Lesotho', 'Lettonie', 'Liban',
  'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg', 'Macédoine du Nord', 'Madagascar',
  'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte', 'Maroc', 'Maurice', 'Mauritanie', 'Mexique',
  'Micronésie', 'Moldavie', 'Monaco', 'Mongolie', 'Monténégro', 'Mozambique', 'Namibie', 'Nauru',
  'Népal', 'Nicaragua', 'Niger', 'Nigeria', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda',
  'Ouzbékistan', 'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Paraguay',
  'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar', 'République tchèque',
  'République dominicaine', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Saint-Christophe-et-Niévès',
  'Sainte-Lucie', 'Saint-Marin', 'Saint-Vincent-et-les-Grenadines', 'Salvador', 'Samoa', 'Sao Tomé-et-Príncipe',
  'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie', 'Somalie',
  'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suisse', 'Suriname', 'Syrie', 'Tadjikistan',
  'Tanzanie', 'Tchad', 'Thaïlande', 'Timor oriental', 'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie',
  'Turkménistan', 'Turquie', 'Tuvalu', 'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela',
  'Viêt Nam', 'Yémen', 'Zambie', 'Zimbabwe',
];

/** Code ISO 3166-1 alpha-2 par nom français (pour afficher le drapeau) */
const COUNTRY_ISO = {
  Afghanistan: 'AF', 'Afrique du Sud': 'ZA', Albanie: 'AL', Algérie: 'DZ', Allemagne: 'DE',
  Andorre: 'AD', Angola: 'AO', 'Antigua-et-Barbuda': 'AG', 'Arabie saoudite': 'SA',
  Argentine: 'AR', Arménie: 'AM', Australie: 'AU', Autriche: 'AT', Azerbaïdjan: 'AZ',
  Bahamas: 'BS', Bahreïn: 'BH', Bangladesh: 'BD', Barbade: 'BB', Belgique: 'BE',
  Belize: 'BZ', Bénin: 'BJ', Bhoutan: 'BT', Biélorussie: 'BY', Birmanie: 'MM',
  Bolivie: 'BO', 'Bosnie-Herzégovine': 'BA', Botswana: 'BW', Brésil: 'BR', Brunei: 'BN',
  Bulgarie: 'BG', 'Burkina Faso': 'BF', Burundi: 'BI', Cambodge: 'KH', Cameroun: 'CM',
  Canada: 'CA', 'Cap-Vert': 'CV', Centrafrique: 'CF', Chili: 'CL', Chine: 'CN',
  Chypre: 'CY', Colombie: 'CO', Comores: 'KM', Congo: 'CG', 'Congo (RDC)': 'CD',
  "Corée du Nord": 'KP', "Corée du Sud": 'KR', 'Costa Rica': 'CR', "Côte d'Ivoire": 'CI',
  Croatie: 'HR', Cuba: 'CU', Danemark: 'DK', Djibouti: 'DJ', Dominique: 'DM',
  Égypte: 'EG', 'Émirats arabes unis': 'AE', Équateur: 'EC', Érythrée: 'ER',
  Espagne: 'ES', Estonie: 'EE', Eswatini: 'SZ', 'États-Unis': 'US', Éthiopie: 'ET',
  Fidji: 'FJ', Finlande: 'FI', France: 'FR', Gabon: 'GA', Gambie: 'GM', Géorgie: 'GE',
  Ghana: 'GH', Grèce: 'GR', Grenade: 'GD', Guatemala: 'GT', Guinée: 'GN',
  'Guinée-Bissau': 'GW', 'Guinée équatoriale': 'GQ', Guyana: 'GY', Haïti: 'HT',
  Honduras: 'HN', Hongrie: 'HU', 'Îles Marshall': 'MH', 'Îles Salomon': 'SB',
  Inde: 'IN', Indonésie: 'ID', Irak: 'IQ', Iran: 'IR', Irlande: 'IE', Islande: 'IS',
  Israël: 'IL', Italie: 'IT', Jamaïque: 'JM', Japon: 'JP', Jordanie: 'JO',
  Kazakhstan: 'KZ', Kenya: 'KE', Kirghizistan: 'KG', Kiribati: 'KI', Kosovo: 'XK',
  Koweït: 'KW', Laos: 'LA', Lesotho: 'LS', Lettonie: 'LV', Liban: 'LB', Liberia: 'LR',
  Libye: 'LY', Liechtenstein: 'LI', Lituanie: 'LT', Luxembourg: 'LU',
  'Macédoine du Nord': 'MK', Madagascar: 'MG', Malaisie: 'MY', Malawi: 'MW',
  Maldives: 'MV', Mali: 'ML', Malte: 'MT', Maroc: 'MA', Maurice: 'MU', Mauritanie: 'MR',
  Mexique: 'MX', Micronésie: 'FM', Moldavie: 'MD', Monaco: 'MC', Mongolie: 'MN',
  Monténégro: 'ME', Mozambique: 'MZ', Namibie: 'NA', Nauru: 'NR', Népal: 'NP',
  Nicaragua: 'NI', Niger: 'NE', Nigeria: 'NG', Norvège: 'NO', 'Nouvelle-Zélande': 'NZ',
  Oman: 'OM', Ouganda: 'UG', Ouzbékistan: 'UZ', Pakistan: 'PK', Palaos: 'PW',
  Palestine: 'PS', Panama: 'PA', 'Papouasie-Nouvelle-Guinée': 'PG', Paraguay: 'PY',
  'Pays-Bas': 'NL', Pérou: 'PE', Philippines: 'PH', Pologne: 'PL', Portugal: 'PT',
  Qatar: 'QA', 'République tchèque': 'CZ', 'République dominicaine': 'DO',
  Roumanie: 'RO', 'Royaume-Uni': 'GB', Russie: 'RU', Rwanda: 'RW',
  'Saint-Christophe-et-Niévès': 'KN', 'Sainte-Lucie': 'LC', 'Saint-Marin': 'SM',
  'Saint-Vincent-et-les-Grenadines': 'VC', Salvador: 'SV', Samoa: 'WS',
  'Sao Tomé-et-Príncipe': 'ST', Sénégal: 'SN', Serbie: 'RS', Seychelles: 'SC',
  'Sierra Leone': 'SL', Singapour: 'SG', Slovaquie: 'SK', Slovénie: 'SI', Somalie: 'SO',
  Soudan: 'SD', 'Soudan du Sud': 'SS', 'Sri Lanka': 'LK', Suède: 'SE', Suisse: 'CH',
  Suriname: 'SR', Syrie: 'SY', Tadjikistan: 'TJ', Tanzanie: 'TZ', Tchad: 'TD',
  Thaïlande: 'TH', 'Timor oriental': 'TL', Togo: 'TG', Tonga: 'TO',
  'Trinité-et-Tobago': 'TT', Tunisie: 'TN', Turkménistan: 'TM', Turquie: 'TR',
  Tuvalu: 'TV', Ukraine: 'UA', Uruguay: 'UY', Vanuatu: 'VU', Vatican: 'VA',
  Venezuela: 'VE', 'Viêt Nam': 'VN', Yémen: 'YE', Zambie: 'ZM', Zimbabwe: 'ZW',
};

const OFFSET = 127397;

/** Convertit un code ISO alpha-2 en emoji drapeau */
export function getCountryFlag(isoCode) {
  if (!isoCode || isoCode.length !== 2) return '';
  const codePoints = [...isoCode.toUpperCase()].map((c) => c.codePointAt(0) + OFFSET);
  return String.fromCodePoint(...codePoints);
}

/** Retourne l'emoji drapeau pour un nom de pays en français */
export function getCountryFlagByName(name) {
  const iso = COUNTRY_ISO[name];
  return iso ? getCountryFlag(iso) : '';
}

/**
 * Tous les pays classés par ordre alphabétique, groupés par lettre (A à Z)
 */
function getLetter(c) {
  const first = (c.charAt(0) || '').toUpperCase();
  const accented = { É: 'E', Ê: 'E', È: 'E', Ë: 'E', Î: 'I', Ï: 'I', Ô: 'O', Œ: 'O', Ù: 'U', Û: 'U', Ü: 'U', Ÿ: 'Y', 'Î': 'I' };
  return accented[first] || (first >= 'A' && first <= 'Z' ? first : '#');
}

export const COUNTRIES_BY_LETTER = (() => {
  const sorted = [...ALL_COUNTRIES].sort((a, b) => a.localeCompare(b, 'fr'));
  const byLetter = {};
  for (const c of sorted) {
    const L = getLetter(c);
    if (!byLetter[L]) byLetter[L] = [];
    byLetter[L].push(c);
  }
  const letters = Object.keys(byLetter).filter((k) => k !== '#').sort();
  if (byLetter['#']) letters.push('#');
  return letters.map((letter) => ({ letter, countries: byLetter[letter] }));
})();
