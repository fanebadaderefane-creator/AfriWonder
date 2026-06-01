/** Libellé présence sous le nom du correspondant (fil DM). */

export function formatPeerPresenceLabel(opts: {
  isTyping: boolean;
  isOnline: boolean;
  lastSeen: string | null;
}): string {
  if (opts.isTyping) return "En train d'écrire...";
  if (opts.isOnline) return 'En ligne';
  if (opts.lastSeen) {
    const d = new Date(opts.lastSeen);
    if (!Number.isNaN(d.getTime())) {
      const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
      if (diffMin < 1) return "Vu à l'instant";
      if (diffMin < 60) return `Vu il y a ${diffMin} min`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `Vu il y a ${diffH} h`;
      return `Vu le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
    }
  }
  return 'Hors ligne';
}
