import React, { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Radio,
  Tv,
  UsersRound,
  Phone,
  Shield,
  Palette,
  Briefcase,
  Sparkles,
  CalendarClock,
  ChevronRight,
  Paperclip,
  Layers,
  MonitorSmartphone,
  Gavel,
  KeyRound,
  Crown,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import BottomNav from '@/components/navigation/BottomNav';
import PageLoader from '@/components/common/PageLoader';
import { MESSAGING_CDC_LAZY_PANELS } from '@/pages/messagingCdcPanels.lazy';

const CARD =
  'flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition hover:bg-white/[0.07] active:scale-[0.99] [touch-action:manipulation]';

const SECTION_TITLE = 'mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38 first:mt-0';

export default function MessagingCdcHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || '';

  const LazyPanel = useMemo(() => (section ? MESSAGING_CDC_LAZY_PANELS[section] : null), [section]);

  useEffect(() => {
    if (section && !MESSAGING_CDC_LAZY_PANELS[section]) {
      setSearchParams({}, { replace: true });
    }
  }, [section, setSearchParams]);

  const go = useCallback(
    (key) => () => {
      setSearchParams({ section: key }, { replace: false });
    },
    [setSearchParams]
  );

  const closeSection = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  if (LazyPanel) {
    const Panel = LazyPanel;
    return (
      <div className="relative min-h-[100dvh] bg-[#070a12] text-white">
        <Suspense fallback={<PageLoader />}>
          <Panel />
        </Suspense>
        <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-[60] flex justify-center px-4">
          <Button
            type="button"
            variant="secondary"
            className="pointer-events-auto rounded-full border border-white/15 bg-black/70 px-5 py-2 text-sm text-white backdrop-blur-md hover:bg-black/80"
            onClick={closeSection}
          >
            Retour au hub CDC
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#070a12] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.07),_transparent_42%),linear-gradient(180deg,_#08101f_0%,_#070d18_50%,_#050913_100%)]" />
      </div>

      <header className="relative z-10 flex items-center gap-3 border-b border-white/[0.06] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl text-white/85 hover:bg-white/[0.08]"
          onClick={() => navigate(createPageUrl('Inbox'))}
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Cahier des charges</p>
          <h1 className="text-lg font-semibold tracking-tight">Messagerie complète</h1>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-3xl flex-1 space-y-1 px-3 pb-28 pt-4">
        <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-2.5 text-[13px] leading-relaxed text-emerald-100/90">
          <strong className="font-semibold text-emerald-50">Parcours consolidé (audit).</strong> Un hub + sections
          chargées à la demande : moins de routes plein écran, même contenu CDC. L’app réelle :{' '}
          <strong>Inbox</strong>, <strong>Chat</strong>, <strong>Appels</strong>, <strong>Paramètres</strong>.
        </p>

        <p className={SECTION_TITLE}>Déjà dans l’app (4 axes)</p>
        <button type="button" className={CARD} onClick={() => navigate(createPageUrl('Inbox'))}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Boîte de réception</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Liste des conversations</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={() => navigate(createPageUrl('Chat'))}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-200">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Discussion (Chat)</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Ouvrir depuis une convo dans Inbox</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={() => navigate(createPageUrl('DirectCall'))}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-200">
            <Phone className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Appels</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Audio / vidéo — flux principal</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={() => navigate(createPageUrl('Settings'))}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/85">
            <KeyRound className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Paramètres compte</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Notifications, confidentialité, apparence</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Messagerie — texte & interactions</p>
        <button type="button" className={CARD} onClick={go('text-features')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/85">
            <Quote className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Texte & interactions</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Formatage, spoiler, réponse, programmation…</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Messagerie — contenu & pièces jointes</p>
        <button type="button" className={CARD} onClick={go('media-share')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-500/25 text-slate-200">
            <Paperclip className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Médias & partage</span>
            <span className="mt-0.5 block text-[13px] text-white/45">GIF, fichiers 2 Go, localisation, vCard…</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Statuts & diffusion</p>
        <button type="button" className={CARD} onClick={go('status')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
            <Radio className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Statuts</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Photos, vidéos 30 s, texte, audience</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={go('channels')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-200">
            <Tv className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Chaînes</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Suivre, publications, réactions</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Groupes & communautés</p>
        <button type="button" className={CARD} onClick={go('communities')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-200">
            <UsersRound className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Communautés</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Plusieurs groupes, annonces, invitation</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={go('groups-advanced')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500/20 text-pink-200">
            <Layers className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Groupes avancés</span>
            <span className="mt-0.5 block text-[13px] text-white/45">1024 membres, sondages, épingles, historique…</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Appels (CDC détaillé)</p>
        <button type="button" className={CARD} onClick={go('calls')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-200">
            <Phone className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Appels & historique (CDC)</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Exigences, démo, intégration</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Planification</p>
        <button type="button" className={CARD} onClick={go('scheduled')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-200">
            <CalendarClock className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Messages programmés</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Liste DM + groupes, rafraîchissement auto</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Confidentialité & sécurité</p>
        <button type="button" className={CARD} onClick={go('privacy')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-200">
            <Shield className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Confidentialité messagerie</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Accusés, éphémère, view once, E2E…</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={go('security-account')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/25 text-emerald-200">
            <KeyRound className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Sécurité du compte</span>
            <span className="mt-0.5 block text-[13px] text-white/45">2FA, e-mail, mot de passe, sauvegardes</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
        <button type="button" className={CARD} onClick={go('moderation')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600/25 text-orange-200">
            <Gavel className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Modération</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Quitter silencieux, transferts, signalement</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Multi-appareils</p>
        <button type="button" className={CARD} onClick={go('multi-device')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-200">
            <MonitorSmartphone className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Appareils & plateformes</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Web, 4 appareils, tablette, montre</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Personnalisation</p>
        <button type="button" className={CARD} onClick={go('customize')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200">
            <Palette className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Apparence des discussions</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Fonds, couleurs, épingles</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        <p className={SECTION_TITLE}>Pro & intelligence</p>
        <button type="button" className={CARD} onClick={go('pro-tools')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-200">
            <Briefcase className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">Business & IA</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Catalogue, auto-réponses, traduction, résumés</span>
          </span>
          <Sparkles className="h-5 w-5 shrink-0 text-amber-300/80" />
        </button>

        <p className={SECTION_TITLE}>Abonnement</p>
        <button type="button" className={CARD} onClick={go('premium')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/40 to-orange-600/30 text-amber-100">
            <Crown className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white/95">AfriWonder Plus</span>
            <span className="mt-0.5 block text-[13px] text-white/45">Thèmes, épingles, sonneries — CDC premium</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
