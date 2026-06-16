/**
 * Régions TURN Metered.ca — Maroc ↔ Mali / Afrique de l'Ouest.
 * Doc : https://www.metered.ca/docs/turnserver-guides/turnserver-regions/
 */

export type MeteredIceServerEntry = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export const METERED_RELAY_HOST_PATTERN =
  /(?:global|standard|[a-z0-9-]+)\.relay\.metered\.ca/gi;

/** Presets AfriWonder — évite le relais Canada (global seul) sur liens Maroc↔Mali. */
export const METERED_TURN_REGION_PRESETS: Record<string, readonly string[]> = {
  /** Auto geo-routing Metered (déconseillé seul pour Afrique ↔ EU). */
  global: ['global.relay.metered.ca'],
  /**
   * Défaut produit AfriWonder : France (Maroc) + EU-Ouest (Mali via câbles EU) + repli global.
   * Les deux peers obtiennent les mêmes hôtes → relais cohérent cross-border.
   */
  afriwonder: ['fr.relay.metered.ca', 'eu-west.relay.metered.ca', 'global.relay.metered.ca'],
  europe: ['europe.relay.metered.ca'],
  eu: ['eu.relay.metered.ca'],
  'eu-west': ['eu-west.relay.metered.ca'],
  fr: ['fr.relay.metered.ca'],
  'middle-east': ['middle-east.relay.metered.ca'],
  qa: ['qa.relay.metered.ca'],
};

export function meteredTurnUrlsForHost(host: string): string[] {
  const h = host.trim().toLowerCase();
  return [
    `turn:${h}:80`,
    `turn:${h}:80?transport=tcp`,
    `turn:${h}:443`,
    `turns:${h}:443?transport=tcp`,
  ];
}

function isTurnIceEntry(entry: MeteredIceServerEntry): boolean {
  const raw = entry.urls;
  const list = Array.isArray(raw) ? raw : [String(raw ?? '')];
  return list.some((u) => {
    const lower = String(u).toLowerCase();
    return lower.startsWith('turn:') || lower.startsWith('turns:');
  });
}

export function resolveMeteredTurnRelayHosts(env: NodeJS.ProcessEnv = process.env): {
  preset: string;
  hosts: string[];
} {
  const custom = String(env.METERED_TURN_RELAY_HOSTS || '').trim();
  if (custom) {
    const hosts = [...new Set(custom.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean))];
    return { preset: 'custom', hosts };
  }

  const preset = String(env.METERED_TURN_REGION || 'afriwonder').trim().toLowerCase();
  const hosts = [...(METERED_TURN_REGION_PRESETS[preset] ?? METERED_TURN_REGION_PRESETS.afriwonder)];
  return { preset, hosts };
}

/** Remplace les hôtes Metered dans iceServers par la région configurée. */
export function applyMeteredRegionalTurn(
  iceServers: MeteredIceServerEntry[],
  hosts: readonly string[],
): MeteredIceServerEntry[] {
  if (!iceServers.length || !hosts.length) return iceServers;

  const stunEntries = iceServers.filter((e) => !isTurnIceEntry(e));
  const turnEntries = iceServers.filter((e) => isTurnIceEntry(e));
  if (!turnEntries.length) return iceServers;

  const username =
    turnEntries.map((e) => e.username).find((u) => String(u || '').trim()) ?? '';
  const credential =
    turnEntries.map((e) => e.credential).find((c) => String(c || '').trim()) ?? '';
  if (!username || !credential) return iceServers;

  const regionalUrls = [...new Set(hosts.flatMap((h) => meteredTurnUrlsForHost(h)))];
  const regionalTurn: MeteredIceServerEntry = {
    urls: regionalUrls.length === 1 ? regionalUrls[0] : regionalUrls,
    username: String(username),
    credential: String(credential),
  };

  return [...stunEntries, regionalTurn];
}

/** Réécrit TURN_URL statiques (global → tous les hôtes régionaux afriwonder). */
export function rewriteMeteredTurnUrlList(urls: string[], hosts: readonly string[]): string[] {
  if (!urls.length || !hosts.length) return urls;
  const expanded: string[] = [];
  for (const u of urls) {
    const str = String(u);
    if (METERED_RELAY_HOST_PATTERN.test(str)) {
      for (const host of hosts) {
        expanded.push(str.replace(METERED_RELAY_HOST_PATTERN, host));
      }
    } else {
      expanded.push(str);
    }
  }
  return [...new Set(expanded)];
}
