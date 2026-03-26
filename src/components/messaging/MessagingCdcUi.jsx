import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const CDC_PREFIX = 'afw_cdc_messaging_';

/** Titres de section (hub & satellites). */
export const CDC_SECTION_TITLE =
  'mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38 first:mt-0';

/**
 * Persistance locale des maquettes CDC (réglages fictifs, listes démo).
 * Fusionne avec defaultValue si objet plain.
 */
export function useCdcPersistedJson(key, defaultValue) {
  const fullKey = `${CDC_PREFIX}${key}`;
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw == null) return defaultValue;
      const parsed = JSON.parse(raw);
      if (
        defaultValue != null &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue) &&
        typeof parsed === 'object' &&
        parsed != null &&
        !Array.isArray(parsed)
      ) {
        return { ...defaultValue, ...parsed };
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [fullKey, state]);

  return [state, setState];
}

const CALLOUT = {
  neutral: 'border-white/[0.08] bg-white/[0.035] text-white/70',
  info: 'border-sky-400/20 bg-sky-500/[0.07] text-sky-100/88',
  warn: 'border-amber-400/20 bg-amber-500/[0.08] text-amber-100/90',
};

export function CdcCallout({ variant = 'neutral', className, children }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed', CALLOUT[variant], className)}>
      {children}
    </div>
  );
}

const BADGE = {
  app: 'bg-emerald-500/18 text-emerald-100/95 ring-1 ring-emerald-400/25',
  partial: 'bg-amber-500/18 text-amber-100/95 ring-1 ring-amber-400/25',
  api: 'bg-slate-500/20 text-slate-200/90 ring-1 ring-white/10',
  demo: 'bg-violet-500/18 text-violet-100/95 ring-1 ring-violet-400/25',
};

const BADGE_LABEL = {
  app: 'Dans l’app',
  partial: 'Partiel',
  api: 'Phase API',
  demo: 'Démo locale',
};

export function CdcImplBadge({ tier = 'api', className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        BADGE[tier] || BADGE.api,
        className
      )}
    >
      {BADGE_LABEL[tier] || BADGE_LABEL.api}
    </span>
  );
}

/** Pied de page commun sous le contenu des écrans CDC. */
export function CdcFooterNote() {
  return (
    <p className="mt-10 border-t border-white/[0.06] pt-4 text-center text-[11px] leading-relaxed text-white/32">
      Parcours interface CDC messagerie : écrans et interactions frontend terminés sur cet hub. Données temps réel,
      billing premium et extensions API non couvertes ici : phase backend dédiée.
    </p>
  );
}

/** Titre de sous-section (même style que le hub). */
export function CdcSubsectionTitle({ children, className }) {
  return <p className={cn(CDC_SECTION_TITLE, className)}>{children}</p>;
}

const REQ_DOT = {
  ui: 'bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.35)]',
  partial: 'bg-amber-400/90',
  server: 'bg-slate-500/90',
};

/**
 * Liste d’exigences CDC avec statut (légende : voir CdcTierLegend).
 * items: { label: string, status: 'ui' | 'partial' | 'server' }
 */
export function CdcRequirementChecklist({ items, className }) {
  if (!items?.length) return null;
  return (
    <ul
      className={cn(
        'space-y-2.5 rounded-2xl border border-white/[0.07] bg-black/20 px-3.5 py-3.5',
        className
      )}
    >
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[13px] leading-snug text-white/80">
          <span
            className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', REQ_DOT[it.status] || REQ_DOT.server)}
            aria-hidden
          />
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Légende des pastilles du checklist. */
export function CdcTierLegend({ className }) {
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/42', className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', REQ_DOT.ui)} />
        Couvert en UI / app
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', REQ_DOT.partial)} />
        Partiel
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', REQ_DOT.server)} />
        Backend / API
      </span>
    </div>
  );
}

export function CdcFeatureRow({ icon: Icon, title, description, tier, children }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5">
      {Icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
          <Icon className="h-5 w-5 text-white/70" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[14px] font-medium text-white/92">{title}</p>
          {tier ? <CdcImplBadge tier={tier} /> : null}
        </div>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-white/45">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
