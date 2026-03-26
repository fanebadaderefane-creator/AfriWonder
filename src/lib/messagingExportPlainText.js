/**
 * Export « comme WhatsApp » : fichier .txt lisible pour utilisateurs non techniques (UTF-8 avec BOM pour Bloc-notes Windows).
 */
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function escapeLine(s) {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

function formatOneDmMessage(m, viewerUserId) {
  const created = m.created_at ? new Date(m.created_at) : null;
  const dt = created && !Number.isNaN(created.getTime()) ? format(created, 'dd/MM/yyyy HH:mm', { locale: fr }) : '—';
  const isMe = viewerUserId && String(m.sender_id) === String(viewerUserId);
  const who = isMe
    ? 'Vous'
    : m.sender?.full_name?.trim() || m.sender?.username?.trim() || 'Contact';
  const type = String(m.type || 'text').toLowerCase();
  let body = '';
  if (type === 'image') body = m.content?.trim() ? m.content.trim() : '[Photo]';
  else if (type === 'video') body = m.content?.trim() ? m.content.trim() : '[Vidéo]';
  else if (type === 'voice' || type === 'audio') body = m.content?.trim() ? m.content.trim() : '[Message vocal]';
  else if (type === 'file') body = m.content?.trim() ? m.content.trim() : '[Fichier]';
  else if (type === 'poll') body = `[Sondage] ${(m.content || '').trim() || '—'}`;
  else if (type === 'event') body = `[Événement] ${(m.content || '').trim() || '—'}`;
  else if (type === 'location' || type === 'place') body = `[Lieu] ${(m.content || '').trim() || '—'}`;
  else if (type === 'contact') body = `[Contact] ${(m.content || '').trim() || '—'}`;
  else if (type === 'sticker') body = '[Sticker]';
  else body = (m.content || '').trim() || '[Message]';
  return `[${dt}] ${who} : ${escapeLine(body).replace(/\n/g, ' ')}`;
}

/** Une conversation 1:1 (payload API export). */
export function formatDmConversationToPlainText(conv, viewerUserId) {
  const other = conv?.otherUser || conv?.other || {};
  const title = other.full_name?.trim() || other.username?.trim() || 'Discussion';
  const messages = Array.isArray(conv?.messages) ? [...conv.messages] : [];
  messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  const now = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  const lines = [
    'AfriWonder — Copie de discussion',
    `Avec : ${title}`,
    `Enregistré le ${now}`,
    '',
    '—'.repeat(36),
    '',
  ];
  for (const m of messages) {
    lines.push(formatOneDmMessage(m, viewerUserId));
  }
  return lines.join('\n');
}

/** Export complet des conversations directes. */
export function formatAllDmExportsToPlainText(payload, viewerUserId) {
  const list = payload?.conversations;
  if (!Array.isArray(list) || list.length === 0) {
    return 'AfriWonder\n\nAucune conversation à enregistrer.';
  }
  const now = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  const blocks = [`AfriWonder — Mes discussions`, `Enregistré le ${now}`, '', ''];
  for (const conv of list) {
    const other = conv?.otherUser || {};
    const name = other.full_name?.trim() || other.username?.trim() || 'Contact';
    blocks.push('═'.repeat(40));
    blocks.push(`Discussion avec ${name}`);
    blocks.push('═'.repeat(40));
    blocks.push('');
    const messages = Array.isArray(conv?.messages) ? [...conv.messages] : [];
    messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    for (const m of messages) {
      blocks.push(formatOneDmMessage(m, viewerUserId));
    }
    blocks.push('');
    blocks.push('');
  }
  return blocks.join('\n');
}

function formatOneGroupMessage(m, viewerUserId) {
  const created = m.created_at ? new Date(m.created_at) : null;
  const dt = created && !Number.isNaN(created.getTime()) ? format(created, 'dd/MM/yyyy HH:mm', { locale: fr }) : '—';
  const isMe = viewerUserId && String(m.sender_id) === String(viewerUserId);
  const who = isMe
    ? 'Vous'
    : m.sender?.full_name?.trim() || m.sender?.username?.trim() || 'Membre';
  const type = String(m.type || 'text').toLowerCase();
  let body = '';
  if (type === 'image') body = m.content?.trim() ? m.content.trim() : '[Photo]';
  else if (type === 'video') body = m.content?.trim() ? m.content.trim() : '[Vidéo]';
  else if (type === 'voice' || type === 'audio') body = m.content?.trim() ? m.content.trim() : '[Message vocal]';
  else if (type === 'file') body = m.content?.trim() ? m.content.trim() : '[Fichier]';
  else if (type === 'poll') body = `[Sondage] ${(m.content || '').trim() || '—'}`;
  else if (type === 'event') body = `[Événement] ${(m.content || '').trim() || '—'}`;
  else body = (m.content || '').trim() || '[Message]';
  return `[${dt}] ${who} : ${escapeLine(body).replace(/\n/g, ' ')}`;
}

/** Un groupe (payload API export groupe). */
export function formatGroupExportToPlainText(payload, viewerUserId) {
  const g = payload?.group || {};
  const name = g.name?.trim() || 'Groupe';
  const messages = Array.isArray(payload?.messages) ? [...payload.messages] : [];
  messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  const now = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  const lines = [
    'AfriWonder — Copie de groupe',
    `Groupe : ${name}`,
    `Enregistré le ${now}`,
    '',
    '—'.repeat(36),
    '',
  ];
  for (const m of messages) {
    lines.push(formatOneGroupMessage(m, viewerUserId));
  }
  return lines.join('\n');
}

/** Agrégat plusieurs groupes. */
export function formatAllGroupsBundleToPlainText(payload, viewerUserId) {
  const groups = payload?.groups;
  if (!Array.isArray(groups) || groups.length === 0) {
    return 'AfriWonder\n\nAucun groupe à enregistrer.';
  }
  const now = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  const blocks = [`AfriWonder — Mes groupes`, `Enregistré le ${now}`, ''];
  if (payload?.truncated) {
    blocks.push(
      `(Une partie seulement de vos groupes est incluse — ouvrez chaque groupe pour une copie complète si besoin.)`
    );
    blocks.push('');
  }
  for (const gPayload of groups) {
    const g = gPayload?.group || {};
    const name = g.name?.trim() || 'Groupe';
    blocks.push('═'.repeat(40));
    blocks.push(`Groupe : ${name}`);
    blocks.push('═'.repeat(40));
    blocks.push('');
    const messages = Array.isArray(gPayload?.messages) ? [...gPayload.messages] : [];
    messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    for (const m of messages) {
      blocks.push(formatOneGroupMessage(m, viewerUserId));
    }
    blocks.push('');
    blocks.push('');
  }
  return blocks.join('\n');
}

export function downloadPlainTextFile(filename, text) {
  const BOM = '\uFEFF';
  let name = String(filename || 'discussion.txt').trim();
  if (!name.toLowerCase().endsWith('.txt')) name += '.txt';
  name = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 180);
  const blob = new Blob([BOM + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
