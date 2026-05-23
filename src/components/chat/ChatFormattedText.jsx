import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Parse style WhatsApp / proche : *gras* _italique_ ~barré~ ~~barré~~ `mono` ||spoiler||
 * Spoilers aussi : [[spoiler]]...[[/spoiler]] (alias de ||...|| pour le CDC).
 * Le texte brut est conservé côté serveur ; le rendu est uniquement visuel.
 */

function normalizeSpoilerDelimiters(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\[\[spoiler\]\]([\s\S]*?)\[\[\/spoiler\]\]/gi, '||$1||');
}

function parseInline(str, keyPrefix) {
  if (!str) return [];
  const nodes = [];
  let from = 0;
  let k = 0;
  const key = () => `${keyPrefix}-${k++}`;

  const findCode = (s, start) => {
    if (s[start] !== '`') return null;
    const end = s.indexOf('`', start + 1);
    if (end === -1 || end === start + 1) return null;
    return { kind: 'code', i: start, j: end + 1, inner: s.slice(start + 1, end) };
  };

  const findDouble = (s, start, open, closeLen) => {
    if (s.slice(start, start + closeLen) !== open) return null;
    const rest = s.slice(start + closeLen);
    const idx = rest.indexOf(open);
    if (idx === -1 || idx === 0) return null;
    return {
      kind: 'strike',
      i: start,
      j: start + closeLen + idx + closeLen,
      inner: rest.slice(0, idx),
    };
  };

  const findSingle = (s, start, ch) => {
    if (s[start] !== ch) return null;
    if (ch === '~' && s[start + 1] === '~') return null;
    const end = s.indexOf(ch, start + 1);
    if (end === -1 || end === start + 1) return null;
    const kind = ch === '~' ? 'strike' : ch === '*' ? 'bold' : 'italic';
    return { kind, i: start, j: end + 1, inner: s.slice(start + 1, end) };
  };

  while (from < str.length) {
    let best = null;
    for (let pos = from; pos < str.length; pos++) {
      const c = str[pos];
      let t = null;
      if (c === '`') t = findCode(str, pos);
      if (!t && c === '~') t = findDouble(str, pos, '~~', 2) || findSingle(str, pos, '~');
      if (!t && c === '*') t = findSingle(str, pos, '*');
      if (!t && c === '_') t = findSingle(str, pos, '_');
      if (t) {
        best = { ...t, pos };
        break;
      }
    }

    if (!best) {
      nodes.push(<span key={key()}>{str.slice(from)}</span>);
      break;
    }

    if (best.pos > from) {
      nodes.push(<span key={key()}>{str.slice(from, best.pos)}</span>);
    }

    if (best.kind === 'code') {
      nodes.push(
        <code
          key={key()}
          className="rounded bg-black/25 px-1 py-0.5 font-mono text-[0.92em] text-inherit"
        >
          {best.inner}
        </code>
      );
    } else {
      const innerNodes = parseInline(best.inner, `${keyPrefix}-n`);
      const body = innerNodes.length ? innerNodes : best.inner;
      if (best.kind === 'strike') {
        nodes.push(
          <del key={key()} className="line-through opacity-80">
            {body}
          </del>
        );
      } else if (best.kind === 'bold') {
        nodes.push(
          <strong key={key()} className="font-semibold">
            {body}
          </strong>
        );
      } else {
        nodes.push(
          <em key={key()} className="italic">
            {body}
          </em>
        );
      }
    }

    from = best.j;
  }

  return nodes;
}

function SpoilerBlock({ children, revealLabel, isOnLightBubble }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'mx-0.5 inline max-w-full rounded-md border px-1.5 py-0.5 align-baseline text-left text-[0.95em] transition',
        open
          ? isOnLightBubble
            ? 'border-black/15 bg-black/[0.04]'
            : 'border-white/25 bg-white/[0.08]'
          : isOnLightBubble
            ? 'border-black/20 bg-black/[0.12]'
            : 'border-white/20 bg-white/[0.12]'
      )}
      aria-expanded={open}
      aria-label={revealLabel}
    >
      <span
        className={cn('inline break-words', !open && 'select-none')}
        style={
          !open
            ? {
                filter: 'blur(6px)',
                WebkitFilter: 'blur(6px)',
              }
            : undefined
        }
      >
        {children}
      </span>
    </button>
  );
}

function parseWithSpoilers(text, keyPrefix, spoilerLabel, isOnLightBubble) {
  if (!text) return [];
  const parts = [];
  const re = /\|\|([\s\S]*?)\|\|/g;
  let last = 0;
  let m;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={`${keyPrefix}-t-${idx}`}>{parseInline(text.slice(last, m.index), `${keyPrefix}-i-${idx}`)}</span>
      );
    }
    const inner = m[1];
    parts.push(
      <SpoilerBlock key={`${keyPrefix}-s-${idx}`} revealLabel={spoilerLabel} isOnLightBubble={isOnLightBubble}>
        {parseInline(inner, `${keyPrefix}-si-${idx}`)}
      </SpoilerBlock>
    );
    last = m.index + m[0].length;
    idx++;
  }
  if (last < text.length) {
    parts.push(
      <span key={`${keyPrefix}-t-end`}>{parseInline(text.slice(last), `${keyPrefix}-i-end`)}</span>
    );
  }
  return parts;
}

function renderWithOptionalMentions(raw, keyPrefix, spoilerTapLabel, isOnLightBubble, highlightAtMentions) {
  if (!highlightAtMentions) {
    return parseWithSpoilers(raw, keyPrefix, spoilerTapLabel, isOnLightBubble);
  }
  const parts = [];
  const re = /@(\w+)/g;
  let last = 0;
  let m;
  let idx = 0;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={`${keyPrefix}-t-${idx}`}>
          {parseWithSpoilers(raw.slice(last, m.index), `${keyPrefix}-p-${idx}`, spoilerTapLabel, isOnLightBubble)}
        </span>
      );
    }
    parts.push(
      <span key={`${keyPrefix}-m-${idx}`} className="font-semibold text-sky-300/95">
        @{m[1]}
      </span>
    );
    last = m.index + m[0].length;
    idx += 1;
  }
  if (last < raw.length) {
    parts.push(
      <span key={`${keyPrefix}-t-end`}>
        {parseWithSpoilers(raw.slice(last), `${keyPrefix}-p-end`, spoilerTapLabel, isOnLightBubble)}
      </span>
    );
  }
  return parts.length ? parts : parseWithSpoilers(raw, keyPrefix, spoilerTapLabel, isOnLightBubble);
}

/**
 * @param {{ text: string, className?: string, isOnLightBubble?: boolean, spoilerTapLabel?: string, highlightAtMentions?: boolean }} props
 */
export function ChatFormattedText({
  text,
  className,
  isOnLightBubble = false,
  spoilerTapLabel = 'Afficher le texte masqué',
  highlightAtMentions = false,
}) {
  const content = useMemo(() => {
    const raw = normalizeSpoilerDelimiters(typeof text === 'string' ? text : '');
    if (!raw.trim()) return null;
    return renderWithOptionalMentions(raw, 'cf', spoilerTapLabel, isOnLightBubble, highlightAtMentions);
  }, [text, spoilerTapLabel, isOnLightBubble, highlightAtMentions]);

  if (!content) return null;

  return <span className={cn('break-words whitespace-pre-wrap', className)}>{content}</span>;
}

/** Aperçu liste / réponse : enlève les marqueurs visuels pour truncate. */
export function stripChatMarkupForPreview(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/\[\[spoiler\]\]([\s\S]*?)\[\[\/spoiler\]\]/gi, '$1')
    .replace(/\|\|([\s\S]*?)\|\|/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/~([^~\n]+)~/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}
