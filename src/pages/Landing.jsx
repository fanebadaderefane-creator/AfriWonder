// AfriWonder full review PR - CodeRabbit
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { motion, MotionConfig } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Globe2,
  Heart,
  MessageCircle,
  Radio,
  ShieldCheck,
  Share2,
  Sparkles,
  Store,
  Video,
  Users,
  ChevronDown,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import AfriWonderLogo from '@/components/common/AfriWonderLogo';
import { ALL_COUNTRIES, getCountryDialCodeByName } from '@/constants/countries';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// URL de l'application AfriWonder (site séparé)
const APP_URL = import.meta.env.VITE_APP_URL || '/';

function formatStat(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return n.toLocaleString('fr-FR') || (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('fr-FR');
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function normalizeUsernameValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

function normalizeDialCode(value) {
  const cleaned = String(value || '').replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  return cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/\+/g, '')}`;
}

function buildInternationalPhone(dialCode, phone) {
  const normalizedDialCode = normalizeDialCode(dialCode);
  const localDigits = String(phone || '').replace(/\D/g, '');
  if (!normalizedDialCode || !localDigits) return '';
  return `${normalizedDialCode}${localDigits}`;
}

/** Message court hero — le détail vit dans le footer / support */
const EARLY_ACCESS_MESSAGE =
  "AfriWonder est en accès anticipé : nous livrons souvent, et quelques imperfections peuvent encore apparaître. Vos retours via Feedback nous aident à prioriser.";
/** Même famille que Discover : fond + sections « verre » sans cadre blanc agressif */
const LANDING_PAGE_BG = 'bg-[#070a12]';
const LANDING_SECTION =
  'rounded-[28px] bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl';
const LANDING_SOFT_TILE =
  'rounded-2xl bg-white/[0.05] ring-1 ring-inset ring-white/[0.06] transition-colors duration-200 hover:bg-white/[0.07]';
const LANDING_STAT_CELL = 'rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/[0.06] sm:p-5';
/** Encadrement type aperçu Discover (mockups, médias) */
const LANDING_MEDIA_FRAME =
  'relative overflow-hidden rounded-[22px] bg-black/25 ring-1 ring-inset ring-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.35)]';
const LANDING_INPUT =
  'w-full rounded-2xl border-0 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/34 outline-none ring-1 ring-inset ring-white/[0.08] transition-[background-color,box-shadow] duration-200 focus:bg-white/[0.08] focus:ring-white/16';
const LANDING_LABEL = 'mb-1 block text-sm text-white/56';
const LANDING_LIST_ROW =
  'flex items-start gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.06]';

function LandingSectionHeader({ kicker, title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {kicker ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{kicker}</p>
        ) : null}
        <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[30px]">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-white/48 sm:text-[14px]">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { login, register, authError } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [registerMethod, setRegisterMethod] = useState('email');
  const [regEmail, setRegEmail] = useState('');
  const [regCountry, setRegCountry] = useState('Mali');
  const [regDialCode, setRegDialCode] = useState('+223');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAcceptTerms, setRegAcceptTerms] = useState(false);
  const [regAvatarFile, setRegAvatarFile] = useState(null);
  const [regAvatarPreview, setRegAvatarPreview] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [earlyAccessEnabled, setEarlyAccessEnabled] = useState(false);

  const { data: earlyAccessConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['early-access-config'],
    queryFn: () => api.earlyAccess.getConfig(),
    staleTime: 30 * 1000,
    enabled: earlyAccessEnabled,
  });

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Waitlist
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Donations
  const [donationAmount, setDonationAmount] = useState(null);
  const [donationCustom, setDonationCustom] = useState('');
  const [donationPhone, setDonationPhone] = useState('');
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationWantsThanks, setDonationWantsThanks] = useState(false);
  const [donationName, setDonationName] = useState('');
  const [donationFirstName, setDonationFirstName] = useState('');
  const [donationAge, setDonationAge] = useState('');
  const [donationCountry, setDonationCountry] = useState('');
  const [donationCity, setDonationCity] = useState('');
  const [donationEmail, setDonationEmail] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [donationShowInContributors, setDonationShowInContributors] = useState(false);

  // Feedback
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackJoinWhatsapp, setFeedbackJoinWhatsapp] = useState(false);
  const [feedbackJoinMailing, setFeedbackJoinMailing] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const isFull = earlyAccessConfig?.isFull ?? false;
  const maxUsers = earlyAccessConfig?.maxUsers ?? 10000;
  const totalUsers = earlyAccessConfig?.totalUsers ?? 0;

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setRegAvatarFile(null);
      setRegAvatarPreview('');
      return;
    }
    setRegAvatarFile(file);
    try {
      const url = URL.createObjectURL(file);
      setRegAvatarPreview((prev) => {
        if (prev && prev.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(prev);
          } catch (_e) {}
        }
        return url;
      });
    } catch (_e) {
      setRegAvatarPreview('');
    }
  };

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    setEarlyAccessEnabled(true);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    const suggestedDialCode = getCountryDialCodeByName(regCountry);
    if (suggestedDialCode) {
      setRegDialCode(suggestedDialCode);
    }
  }, [regCountry]);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') toast.success('AfriWonder installé !');
      });
    } else {
      window.location.href = APP_URL;
    }
  };

  const handleJoinWaitlist = async (e) => {
    e?.preventDefault();
    if (!waitlistEmail?.trim()) {
      toast.error('Email requis');
      return;
    }
    setWaitlistLoading(true);
    try {
      const result = await api.earlyAccess.joinWaitlist(waitlistEmail.trim(), waitlistName.trim());
      toast.success(result.message || 'Vous avez rejoint la liste d\'attente !');
      setWaitlistEmail('');
      setWaitlistName('');
    } catch (err) {
      toast.error(err.apiMessage || err.message || 'Erreur');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleDonate = async (e) => {
    e?.preventDefault();
    const amount = donationAmount ?? parseInt(donationCustom, 10);
    if (!amount || amount < 100) {
      toast.error('Montant minimum 100 FCFA');
      return;
    }
    const phone = donationPhone?.trim();
    if (!phone || phone.length < 8) {
      toast.error('Numéro Orange Money / Mobile Money obligatoire pour recevoir la demande de paiement.');
      return;
    }
    setDonationLoading(true);
    try {
      const result = await api.platformDonations.create({
        amount_fcfa: amount,
        donor_phone: phone,
        donor_name: donationWantsThanks ? donationName?.trim() || undefined : undefined,
        donor_first_name: donationWantsThanks ? donationFirstName?.trim() || undefined : undefined,
        donor_age: donationWantsThanks && donationAge ? parseInt(donationAge, 10) : undefined,
        donor_country: donationWantsThanks ? donationCountry?.trim() || undefined : undefined,
        donor_city: donationWantsThanks ? donationCity?.trim() || undefined : undefined,
        donor_email: donationWantsThanks ? donationEmail?.trim() || undefined : undefined,
        donor_message: donationWantsThanks ? donationMessage?.trim() || undefined : undefined,
        show_in_contributors: donationShowInContributors,
      });
      toast.success(result?.message || 'Merci pour votre soutien !');
      setDonationAmount(null);
      setDonationCustom('');
      setDonationPhone('');
      setDonationWantsThanks(false);
      setDonationName('');
      setDonationFirstName('');
      setDonationAge('');
      setDonationCountry('');
      setDonationCity('');
      setDonationEmail('');
      setDonationMessage('');
      setDonationShowInContributors(false);
    } catch (err) {
      toast.error(err.apiMessage || err.message || 'Erreur');
    } finally {
      setDonationLoading(false);
    }
  };

  const handleFeedback = async (e) => {
    e?.preventDefault();
    if (!feedbackContent?.trim() || feedbackContent.trim().length < 3) {
      toast.error('Le contenu doit faire au moins 3 caractères');
      return;
    }
    setFeedbackLoading(true);
    try {
      await api.platformFeedback.create({
        type: feedbackType,
        content: feedbackContent.trim(),
        email: feedbackEmail || undefined,
        join_whatsapp: feedbackJoinWhatsapp,
        join_mailing: feedbackJoinMailing,
      });
      toast.success('Merci pour votre retour !');
      setFeedbackContent('');
      setFeedbackEmail('');
      setFeedbackJoinWhatsapp(false);
      setFeedbackJoinMailing(false);
    } catch (err) {
      toast.error(err.apiMessage || err.message || 'Erreur');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareText = "Découvrez AfriWonder - La Super-app vidéo africaine en Early Access !";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AfriWonder',
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      toast.success('Lien copié !');
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`min-h-screen text-white ${LANDING_PAGE_BG}`}
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'auto',
        touchAction: 'pan-y',
      }}
    >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.11),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.28),_transparent_38%),linear-gradient(180deg,_#08101f_0%,_#070a12_42%,_#050913_100%)]" />
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute left-[-12%] top-[6%] h-[min(420px,55vw)] w-[min(420px,55vw)] rounded-full bg-blue-500/12 blur-3xl" />
          <div className="absolute right-[-10%] top-[14%] h-[min(400px,50vw)] w-[min(400px,50vw)] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-[6%] left-[14%] h-[min(340px,45vw)] w-[min(340px,45vw)] rounded-full bg-emerald-500/08 blur-3xl" />
        </div>

        <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070a12]/88 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <AfriWonderLogo size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-[-0.02em] text-white">AfriWonder</p>
                <p className="truncate text-[11px] text-white/42 sm:text-xs">Where Africa Wows the World</p>
              </div>
            </div>

            <div className="hidden items-center gap-8 lg:flex">
              <a href="#auth" className="text-[13px] font-medium text-white/52 transition-colors hover:text-white">
                Accès
              </a>
              <a href="#support" className="text-[13px] font-medium text-white/52 transition-colors hover:text-white">
                Soutien
              </a>
              <a href="#feedback" className="text-[13px] font-medium text-white/52 transition-colors hover:text-white">
                Feedback
              </a>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <a
                href="#auth"
                className="rounded-full px-4 py-2 text-[13px] font-medium text-white/65 transition-colors hover:text-white"
              >
                Se connecter
              </a>
              <button
                type="button"
                onClick={handleInstallPWA}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,0.12)] transition-transform hover:bg-white/95 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Installer
              </button>
            </div>

            <a
              href="#auth"
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-2 text-[13px] font-medium text-white/85 ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.09] md:hidden"
            >
              <ExternalLink className="h-4 w-4 opacity-80" />
              Ouvrir
            </a>
          </div>
        </nav>

        <main className="relative">
          <section className="px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
            <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72 ring-1 ring-inset ring-white/[0.08]">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300/90" strokeWidth={2} />
                  Accès anticipé
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/[0.1] sm:h-[118px] sm:w-[118px]">
                      <img
                        src="/icon-192.png"
                        alt="AfriWonder"
                        className="h-full w-full scale-[1.18] object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">Vidéo · commerce · communauté</p>
                      <h1 className="mt-2 text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-white">
                        AfriWonder
                      </h1>
                      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/52 sm:text-base">
                        La super-app pensée pour créer, vendre et rassembler — avec un feed vidéo au centre, comme vous l’utilisez déjà au quotidien.
                      </p>
                    </div>
                  </div>

                  <p className="max-w-2xl text-[17px] leading-[1.65] text-white/72 sm:text-[18px] lg:max-w-[34rem]">
                    Publiez, achetez, réservez un service, lancez un live et gardez le contact avec votre audience, dans une seule app rapide et soignée.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { t: 'Feed mobile-first', icon: Video },
                      { t: 'Live intégré', icon: Radio },
                      { t: 'Marketplace', icon: Store },
                      { t: 'Communauté & paiements', icon: Users },
                    ].map(({ t, icon: Icon }) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white/70 ring-1 ring-inset ring-white/[0.07] transition-colors hover:bg-white/[0.08] hover:text-white/85"
                      >
                        <Icon className="h-3.5 w-3.5 text-white/45" strokeWidth={2} />
                        {t}
                      </span>
                    ))}
                  </div>

                  <p className="max-w-xl text-[13px] leading-relaxed text-white/45">
                    <span className="mr-1.5 inline-flex align-middle text-[10px] font-bold uppercase tracking-wider text-white/55">Bêta</span>
                    {EARLY_ACCESS_MESSAGE}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Membres', value: loadingConfig ? '…' : formatStat(totalUsers), icon: Users },
                    { label: 'Capacité', value: loadingConfig ? '…' : formatStat(maxUsers), icon: Globe2 },
                    { label: 'Confiance', value: 'Prestataires vérifiés', icon: ShieldCheck },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className={LANDING_STAT_CELL}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]">
                          <Icon className="h-4 w-4 text-white/55" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold tracking-tight text-white">{value}</p>
                          <p className="text-[12px] text-white/42">{label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstallPWA}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-950 shadow-[0_12px_40px_rgba(255,255,255,0.14)] transition-colors hover:bg-white/95"
                  >
                    <Download className="h-5 w-5" />
                    Installer l’app
                  </motion.button>
                  <motion.a
                    href="#auth"
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-6 py-3.5 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/[0.1] transition-colors hover:bg-white/[0.09]"
                  >
                    <Smartphone className="h-5 w-5 text-white/75" />
                    Ouvrir / se connecter
                  </motion.a>
                  <button
                    type="button"
                    onClick={() => navigate('/Discover')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[15px] font-medium text-white/55 transition-colors hover:text-white"
                  >
                    Parcourir sans compte
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {isIOS() ? (
                  <p className="text-[12px] leading-relaxed text-white/38">
                    iPhone / iPad : ouvrez dans <strong className="font-medium text-white/55">Safari</strong>, touchez{' '}
                    <strong className="font-medium text-white/55">Partager</strong> puis{' '}
                    <strong className="font-medium text-white/55">Sur l’écran d’accueil</strong>.
                  </p>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={cn('relative overflow-hidden p-5 sm:p-6 lg:p-7', LANDING_SECTION)}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(59,130,246,0.14)_0%,transparent_100%)]" />
                <div className="pointer-events-none absolute -right-16 top-24 h-44 w-44 rounded-full bg-cyan-400/08 blur-3xl" />
                <div className="pointer-events-none absolute -left-12 bottom-20 h-36 w-36 rounded-full bg-blue-500/08 blur-3xl" />

                <div className="relative">
                  <LandingSectionHeader
                    kicker="Aperçu produit"
                    title="Conçu pour l’usage réel"
                    subtitle="Un aperçu fidèle de l’expérience dans l’application : feed, live et boutique au même endroit."
                    right={
                      <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[11px] font-semibold text-white/75 ring-1 ring-inset ring-white/[0.1]">
                        Bêta
                      </span>
                    }
                  />

                  <div className="grid gap-4">
                    <div className={cn(LANDING_SOFT_TILE, 'overflow-hidden p-4')}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]">
                            <Video className="h-4 w-4 text-white/55" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold tracking-tight text-white">Feed vidéo</p>
                            <p className="text-[13px] text-white/45">Pour vous, abonnements, découverte</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-950">Pour vous</span>
                      </div>

                      <div className="rounded-[20px] bg-black/30 p-2 ring-1 ring-inset ring-white/[0.06]">
                        <div className={LANDING_MEDIA_FRAME}>
                          <img
                            src="/landing-feed-ui.png"
                            alt="Aperçu du feed vidéo AfriWonder"
                            className="h-[min(420px,58dvh)] w-full object-cover object-[78%_center] sm:h-[440px]"
                            loading="eager"
                            decoding="async"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.06)_55%,rgba(2,6,23,0.22)_100%)]" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={cn(LANDING_SOFT_TILE, 'p-4')}>
                        <div className="mb-3 flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]">
                            <Radio className="h-4 w-4 text-white/55" strokeWidth={1.75} />
                          </div>
                          <div>
                            <p className="font-semibold tracking-tight text-white">Live</p>
                            <p className="text-[13px] text-white/45">Directs & replays</p>
                          </div>
                        </div>
                        <div className={LANDING_MEDIA_FRAME}>
                          <img
                            src="/landing-live-ui.png"
                            alt="Aperçu live AfriWonder"
                            className="h-48 w-full object-cover object-top"
                            loading="eager"
                            decoding="async"
                          />
                        </div>
                      </div>

                      <div className={cn(LANDING_SOFT_TILE, 'p-4')}>
                        <div className="mb-3 flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]">
                            <Store className="h-4 w-4 text-white/55" strokeWidth={1.75} />
                          </div>
                          <div>
                            <p className="font-semibold tracking-tight text-white">Marketplace</p>
                            <p className="text-[13px] text-white/45">Achat & réservation</p>
                          </div>
                        </div>
                        <div className={LANDING_MEDIA_FRAME}>
                          <img
                            src="/landing-market-ui.png"
                            alt="Aperçu marketplace AfriWonder"
                            className="h-48 w-full object-cover object-top"
                            loading="eager"
                            decoding="async"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-12 flex justify-center text-white/30"
            >
              <ChevronDown className="h-7 w-7 animate-bounce text-white/35" strokeWidth={1.5} />
            </motion.div>
          </section>

          <section className="px-4 pb-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className={cn(LANDING_SECTION, 'mx-auto mb-8 max-w-3xl px-5 py-8 text-center sm:px-8 sm:py-10')}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">Pourquoi AfriWonder</p>
                <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.035em] text-white sm:text-[32px]">
                  Une app, plusieurs façons d’avancer
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/48">
                  Le feed attire l’attention ; le reste du produit transforme cette attention en ventes, réservations et relations durables.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    icon: Video,
                    title: 'Découverte fluide',
                    description:
                      'Scroll vertical, sons, likes et partages : un feed pensé mobile, lisible et agréable sur petit écran comme sur grand.',
                  },
                  {
                    icon: Store,
                    title: 'Commerce intégré',
                    description:
                      'Boutique, services et créateurs côte à côte. Moins de friction entre « j’ai vu » et « j’achète » ou « je réserve ».',
                  },
                  {
                    icon: Globe2,
                    title: 'Pensé pour l’Afrique',
                    description:
                      'Usages locaux, talents et indépendance tech au centre — sans copier une app californienne et espérer que ça colle.',
                  },
                ].map(({ icon: Icon, title, description }) => (
                  <div key={title} className={cn(LANDING_SOFT_TILE, 'p-5 sm:p-6')}>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]">
                      <Icon className="h-5 w-5 text-white/55" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[17px] font-semibold tracking-tight text-white">{title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/48 sm:text-[14px]">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="auth" className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-6">
                <div className={`${LANDING_SECTION} p-6`}>
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Accès</p>
                  <h2 className="mt-2 text-[34px] font-black tracking-[-0.04em] text-white">Entrer dans l’app</h2>
                  <p className="mt-3 text-white/58">
                    Connectez-vous pour retrouver votre compte, ou créez-en un pour rejoindre dès maintenant l’écosystème AfriWonder.
                  </p>

                  <div className="mt-6 grid gap-3">
                    {[
                      'Créateurs, prestataires et utilisateurs dans une seule expérience.',
                      'Authentification simple, rapide et pensée pour le mobile.',
                      'Paiements, live, commerce et communauté dans la même app.',
                    ].map((item) => (
                      <div key={item} className={LANDING_LIST_ROW}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-white/72" />
                        <p className="text-sm text-white/62">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {isFull ? (
                  <div className={`${LANDING_SECTION} p-6`}>
                    <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Liste d’attente</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Early Access momentanément complet</h3>
                    <p className="mt-2 text-sm text-white/56">Rejoignez la prochaine vague d’accès en laissant votre contact.</p>

                    <form onSubmit={handleJoinWaitlist} className="mt-5 space-y-3">
                <input
                  type="email"
                  placeholder="Votre email"
                  aria-label="Votre email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                        className={LANDING_INPUT}
                  required
                />
                <input
                  type="text"
                  placeholder="Nom (optionnel)"
                  aria-label="Nom (optionnel)"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                        className={LANDING_INPUT}
                />
                <button
                  type="submit"
                  disabled={waitlistLoading}
                        className="w-full rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-white/92 disabled:opacity-50"
                >
                        {waitlistLoading ? 'Envoi...' : 'Rejoindre la liste d’attente'}
                </button>
              </form>
                  </div>
                ) : (
                  <div className={`${LANDING_SOFT_TILE} p-5`}>
                    <p className="text-sm text-white/60">
                      L’accès n’est pas encore saturé. Vous pouvez télécharger la PWA, créer votre compte et démarrer immédiatement.
                    </p>
                  </div>
                )}
              </div>

              <div className={`${LANDING_SECTION} p-6`}>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Authentification</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{authMode === 'login' ? 'Se connecter' : 'Créer un compte'}</h3>
                  </div>

                  <div className="inline-flex rounded-full bg-white/[0.05] p-1 ring-1 ring-inset ring-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${authMode === 'login' ? 'bg-white text-slate-950' : 'text-white/64 hover:text-white'}`}
                    >
                      Connexion
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${authMode === 'register' ? 'bg-white text-slate-950' : 'text-white/64 hover:text-white'}`}
                    >
                      Inscription
                    </button>
                  </div>
                </div>

                {authError?.message ? (
                  <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/12 p-3 text-sm text-red-100">
              {authError.message}
            </div>
                ) : null}

          {authMode === 'login' ? (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={async (e) => {
                e.preventDefault();
                      if (!loginIdentifier?.trim() || !loginPassword) {
                        toast.error('Email, nom d’utilisateur ou numéro requis');
                  return;
                }
                setAuthLoading(true);
                try {
                        await login(loginIdentifier.trim(), loginPassword);
                  toast.success('Connexion réussie !');
                  navigate('/', { replace: true });
                } catch {
                } finally {
                  setAuthLoading(false);
                }
              }}
                    className="space-y-4"
            >
              <div>
                      <label className={LANDING_LABEL}>Email, nom d’utilisateur ou numéro</label>
                <input
                        type="text"
                        placeholder="votre@email.com ou +22370123456"
                        aria-label="Email, nom d’utilisateur ou numéro"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className={LANDING_INPUT}
                  required
                />
              </div>
              <div>
                      <label className={LANDING_LABEL}>Mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  aria-label="Mot de passe"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                        className={LANDING_INPUT}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                      className="w-full rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-white/92 disabled:opacity-50"
              >
                {authLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </motion.form>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={async (e) => {
                e.preventDefault();
                      if (!regFullName?.trim() || !regUsername?.trim() || !regPassword) {
                  toast.error('Tous les champs sont requis');
                  return;
                }
                      if (registerMethod === 'email' && !regEmail?.trim()) {
                        toast.error('Email requis');
                        return;
                      }
                      if (registerMethod === 'phone' && (!regCountry || !regDialCode || !regPhone?.trim())) {
                        toast.error('Pays, indicatif et numéro requis');
                        return;
                      }
                      const usernameTrimmed = normalizeUsernameValue(regUsername.trim());
                if (usernameTrimmed.length < 3 || usernameTrimmed.length > 30) {
                        toast.error('Le nom d’utilisateur doit faire entre 3 et 30 caractères');
                  return;
                }
                if (!/^[a-zA-Z0-9_]+$/.test(usernameTrimmed)) {
                        toast.error('Le nom d’utilisateur ne peut contenir que lettres, chiffres et underscore');
                  return;
                }
                if (regPassword.length < 8) {
                  toast.error('Le mot de passe doit contenir au moins 8 caractères');
                  return;
                }
                if (!/[a-zA-Z]/.test(regPassword)) {
                  toast.error('Le mot de passe doit contenir au moins une lettre');
                  return;
                }
                if (!/\d/.test(regPassword)) {
                  toast.error('Le mot de passe doit contenir au moins un chiffre');
                  return;
                }
                if (!regAcceptTerms) {
                        toast.error('Veuillez accepter les conditions d’utilisation');
                        return;
                      }
                      const intlPhone = registerMethod === 'phone'
                        ? buildInternationalPhone(regDialCode, regPhone)
                        : '';
                      if (registerMethod === 'phone' && !/^\+\d{6,15}$/.test(intlPhone)) {
                        toast.error('Le numéro doit inclure un indicatif international valide');
                  return;
                }
                setAuthLoading(true);
                try {
                  await register({
                    full_name: regFullName.trim(),
                          username: usernameTrimmed,
                          email: registerMethod === 'email' ? regEmail.trim() : undefined,
                          phone: registerMethod === 'phone' ? intlPhone : undefined,
                    password: regPassword,
                  });
                  if (regAvatarFile) {
                    try {
                      const up = await api.upload.image(regAvatarFile);
                      const url = up?.file_url ?? up?.url;
                      if (url) {
                        await api.auth.updateMe({ profile_image: url });
                      }
                    } catch (_avatarError) {
                      // Avatar optionnel : ne pas bloquer l'inscription
                    }
                  }
                  toast.success('Compte créé ! Bienvenue sur AfriWonder.');
                  navigate('/', { replace: true });
                } catch {
                } finally {
                  setAuthLoading(false);
                }
              }}
                    className="space-y-4"
                  >
                    <div className="inline-flex rounded-full bg-white/[0.05] p-1 ring-1 ring-inset ring-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setRegisterMethod('email')}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${registerMethod === 'email' ? 'bg-white text-slate-950' : 'text-white/64 hover:text-white'}`}
                      >
                        Avec email
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterMethod('phone')}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${registerMethod === 'phone' ? 'bg-white text-slate-950' : 'text-white/64 hover:text-white'}`}
                      >
                        Avec téléphone
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={LANDING_LABEL}>Nom complet</label>
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  aria-label="Nom complet"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                          className={LANDING_INPUT}
                  required
                />
              </div>
              <div>
                        <label className={LANDING_LABEL}>Nom d’utilisateur</label>
                <input
                  type="text"
                  placeholder="jeandupont"
                          aria-label="Nom d’utilisateur"
                  value={regUsername}
                          onChange={(e) => setRegUsername(normalizeUsernameValue(e.target.value))}
                          className={LANDING_INPUT}
                  required
                />
                        <p className="mt-1 text-xs text-white/38">Les accents et espaces sont convertis automatiquement pour éviter le blocage de création.</p>
              </div>
                      {registerMethod === 'email' ? (
              <div>
                          <label className={LANDING_LABEL}>Email</label>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  aria-label="Email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                            className={LANDING_INPUT}
                  required
                />
              </div>
                      ) : (
                        <>
              <div>
                            <label className={LANDING_LABEL}>Pays</label>
                            <select
                              aria-label="Pays"
                              value={regCountry}
                              onChange={(e) => setRegCountry(e.target.value)}
                              className={LANDING_INPUT}
                              required
                            >
                              {ALL_COUNTRIES.map((country) => (
                                <option key={country} value={country} className="bg-slate-950 text-white">
                                  {country}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={LANDING_LABEL}>Indicatif</label>
                            <input
                              type="tel"
                              placeholder="+223"
                              aria-label="Indicatif pays"
                              value={regDialCode}
                              onChange={(e) => setRegDialCode(normalizeDialCode(e.target.value))}
                              className={LANDING_INPUT}
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={LANDING_LABEL}>Numéro de téléphone</label>
                            <input
                              type="tel"
                              placeholder="70 12 34 56"
                              aria-label="Numéro de téléphone"
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              className={LANDING_INPUT}
                              required
                            />
                            <p className="mt-1 text-xs text-white/38">Aucun code de vérification pour l’instant. Le numéro sera enregistré directement au format international.</p>
                          </div>
                        </>
                      )}
                      <div className="sm:col-span-2">
                        <label className={LANDING_LABEL}>Mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  aria-label="Mot de passe"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                          className={LANDING_INPUT}
                  required
                />
              </div>
                      <div className="sm:col-span-2">
                        <label className={LANDING_LABEL}>Photo de profil (optionnel)</label>
                        <div className="flex items-center gap-4">
                          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/14 bg-white/5">
                            {regAvatarPreview ? (
                              <img
                                src={regAvatarPreview}
                                alt="Aperçu"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/70">
                                {regFullName?.[0]?.toUpperCase() || regUsername?.[0]?.toUpperCase() || 'AW'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-950 shadow-sm hover:bg-white/90">
                              Choisir une photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                              />
                            </label>
                            {regAvatarFile && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRegAvatarFile(null);
                                  setRegAvatarPreview('');
                                }}
                                className="text-[11px] font-medium text-white/60 underline-offset-4 hover:text-white hover:underline"
                              >
                                Ignorer pour l’instant
                              </button>
                            )}
                            {!regAvatarFile && (
                              <p className="text-[11px] text-white/40">
                                Vous pourrez ajouter ou changer la photo plus tard dans vos paramètres.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <label className={LANDING_LIST_ROW}>
                <input
                  type="checkbox"
                  checked={regAcceptTerms}
                  onChange={(e) => setRegAcceptTerms(e.target.checked)}
                        className="mt-1 rounded"
                      />
                      <span className="text-sm leading-6 text-white/62">
                        J’accepte les{' '}
                        <Link to="/TermsOfService" className="text-white underline-offset-4 hover:underline">conditions d’utilisation</Link>
                  {' '}et la{' '}
                        <Link to="/PrivacyPolicy" className="text-white underline-offset-4 hover:underline">politique de confidentialité</Link>.
                </span>
              </label>

              <button
                type="submit"
                disabled={authLoading || !regAcceptTerms}
                      className="w-full rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-white/92 disabled:opacity-50"
              >
                      {authLoading ? 'Inscription...' : 'Créer mon compte'}
              </button>
            </motion.form>
          )}
              </div>
        </div>
      </section>

          <section id="support" className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-6">
                <div className={`${LANDING_SECTION} p-6`}>
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Soutien</p>
                  <h2 className="mt-2 text-[34px] font-black tracking-[-0.04em] text-white">Construisons l’avenir numérique africain</h2>
                  <p className="mt-3 text-white/58">
                    Chaque contribution aide à améliorer la plateforme, renforcer l’équipe et soutenir durablement les créateurs et prestataires.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      'Vous investissez dans un produit africain conçu pour des usages réels.',
                      'Vous soutenez l’emploi, l’ingénierie locale et la montée en compétence.',
                      'Vous contribuez à une plateforme indépendante, ambitieuse et durable.',
                    ].map((item) => (
                      <div key={item} className={LANDING_LIST_ROW}>
                        <Heart className="mt-0.5 h-4 w-4 text-white/72" />
                        <p className="text-sm text-white/62">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

          <motion.div
                initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
                className={`${LANDING_SECTION} p-6`}
              >
                <div className="mb-5">
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Contribution</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Soutenir AfriWonder</h3>
                  <p className="mt-2 text-sm text-white/56">
                    Chaque paiement sera libellé « Soutien AfriWonder » pour simplifier la traçabilité.
                  </p>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setDonationAmount(amt); setDonationCustom(''); }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${donationAmount === amt ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.04] text-white/74 hover:bg-white/[0.08] hover:text-white'}`}
                >
                  {amt.toLocaleString()} FCFA
                </button>
              ))}
            </div>

            <form onSubmit={handleDonate} className="space-y-4">
              <div>
                    <label className={LANDING_LABEL}>Montant libre (min 100 FCFA)</label>
                <input
                  type="number"
                  min={100}
                  placeholder="Ex: 2500"
                  aria-label="Montant libre"
                  value={donationCustom}
                  onChange={(e) => { setDonationCustom(e.target.value); setDonationAmount(null); }}
                      className={LANDING_INPUT}
                />
              </div>

              <div>
                    <label className={LANDING_LABEL}>Numéro Orange Money / Mobile Money</label>
                <input
                  type="tel"
                  placeholder="Ex: +223 70 12 34 56"
                  aria-label="Numéro Orange Money / Mobile Money"
                  value={donationPhone}
                  onChange={(e) => setDonationPhone(e.target.value)}
                      className={LANDING_INPUT}
                  required
                />
                    <p className="mt-1 text-xs text-white/38">Obligatoire pour recevoir la demande de paiement.</p>
              </div>

                  <label className={LANDING_LIST_ROW}>
                  <input
                    type="checkbox"
                    checked={donationShowInContributors}
                    onChange={(e) => setDonationShowInContributors(e.target.checked)}
                    aria-label="Souhaitez-vous apparaître dans la liste des contributeurs"
                      className="mt-1 rounded"
                    />
                    <span className="text-sm leading-6 text-white/62">
                      Apparaître dans la liste des contributeurs et être associé publiquement aux premiers soutiens du projet.
                  </span>
                </label>

                  <label className={LANDING_LIST_ROW}>
                  <input
                    type="checkbox"
                    checked={donationWantsThanks}
                    onChange={(e) => setDonationWantsThanks(e.target.checked)}
                      aria-label="Laisser vos coordonnées pour être remercié personnellement"
                      className="mt-1 rounded"
                  />
                    <span className="text-sm leading-6 text-white/62">
                      Laisser vos coordonnées pour être remercié(e) personnellement.
                    </span>
                </label>

                  {donationWantsThanks ? (
                    <div className="grid gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.06] sm:grid-cols-2">
                      <input type="text" placeholder="Nom (optionnel)" aria-label="Nom (optionnel)" value={donationName} onChange={(e) => setDonationName(e.target.value)} className={LANDING_INPUT} />
                      <input type="text" placeholder="Prénom (optionnel)" aria-label="Prénom (optionnel)" value={donationFirstName} onChange={(e) => setDonationFirstName(e.target.value)} className={LANDING_INPUT} />
                      <input type="number" min={1} max={120} placeholder="Age (optionnel)" aria-label="Age (optionnel)" value={donationAge} onChange={(e) => setDonationAge(e.target.value)} className={LANDING_INPUT} />
                      <input type="text" placeholder="Pays (optionnel)" aria-label="Pays (optionnel)" value={donationCountry} onChange={(e) => setDonationCountry(e.target.value)} className={LANDING_INPUT} />
                      <input type="text" placeholder="Ville (optionnel)" aria-label="Ville (optionnel)" value={donationCity} onChange={(e) => setDonationCity(e.target.value)} className={`${LANDING_INPUT} sm:col-span-2`} />
                      <input type="email" placeholder="Email (optionnel)" aria-label="Email (optionnel)" value={donationEmail} onChange={(e) => setDonationEmail(e.target.value)} className={`${LANDING_INPUT} sm:col-span-2`} />
                      <textarea placeholder="Un message pour nous ? (optionnel)" aria-label="Un message pour nous ? (optionnel)" value={donationMessage} onChange={(e) => setDonationMessage(e.target.value)} rows={3} className={`${LANDING_INPUT} min-h-[96px] sm:col-span-2`} />
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={donationLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-white/92 disabled:opacity-50"
                  >
                    <Heart className="h-5 w-5" />
                {donationLoading ? 'Envoi...' : 'Contribuer'}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

          <section id="feedback" className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className={`${LANDING_SECTION} p-6`}>
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Feedback</p>
                <h2 className="mt-2 text-[34px] font-black tracking-[-0.04em] text-white">Votre avis compte vraiment</h2>
                <p className="mt-3 text-white/58">
                  Bug, suggestion, idée produit ou retour de terrain : nous lisons tout pour faire évoluer AfriWonder avec davantage d’intention et de qualité.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    'Les suggestions influencent la roadmap produit.',
                    'Les bugs signalés accélèrent la stabilisation de l’app.',
                    'Les retours utilisateurs nous aident à mieux prioriser.',
                  ].map((item) => (
                    <div key={item} className={LANDING_LIST_ROW}>
                      <MessageCircle className="mt-0.5 h-4 w-4 text-white/72" />
                      <p className="text-sm text-white/62">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

          <motion.form
                initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleFeedback}
                className={`${LANDING_SECTION} space-y-4 p-6`}
          >
            <div>
                  <label className={LANDING_LABEL}>Type</label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                    className={LANDING_INPUT}
                aria-label="Type de retour"
              >
                <option value="bug">Bug</option>
                <option value="suggestion">Suggestion</option>
                <option value="comment">Commentaire</option>
              </select>
            </div>

                <div>
                  <label className={LANDING_LABEL}>Votre message</label>
            <textarea
                    placeholder="Décrivez votre retour..."
              aria-label="Votre message"
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
                    rows={5}
                    className={`${LANDING_INPUT} min-h-[128px]`}
              required
            />
                </div>

                <div>
                  <label className={LANDING_LABEL}>Email (optionnel)</label>
            <input
              type="email"
                    placeholder="votre@email.com"
              aria-label="Email (optionnel)"
              value={feedbackEmail}
              onChange={(e) => setFeedbackEmail(e.target.value)}
                    className={LANDING_INPUT}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={LANDING_LIST_ROW}>
                    <input type="checkbox" checked={feedbackJoinWhatsapp} onChange={(e) => setFeedbackJoinWhatsapp(e.target.checked)} aria-label="Rejoindre le groupe WhatsApp" className="mt-1 rounded" />
                    <span className="text-sm text-white/62">Rejoindre le groupe WhatsApp</span>
              </label>
                  <label className={LANDING_LIST_ROW}>
                    <input type="checkbox" checked={feedbackJoinMailing} onChange={(e) => setFeedbackJoinMailing(e.target.checked)} aria-label="Rejoindre la mailing list" className="mt-1 rounded" />
                    <span className="text-sm text-white/62">Rejoindre la mailing list</span>
              </label>
            </div>

                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-white/92 disabled:opacity-50"
                >
                  <MessageCircle className="h-5 w-5" />
                  {feedbackLoading ? 'Envoi...' : 'Envoyer mon retour'}
            </button>
          </motion.form>
        </div>
      </section>

          <section className="px-4 py-10 sm:px-6 lg:px-8">
            <div className={`mx-auto flex max-w-5xl flex-col items-center gap-4 p-6 text-center ${LANDING_SECTION}`}>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Partager</p>
              <h3 className="text-2xl font-semibold text-white">Invitez vos proches à découvrir AfriWonder</h3>
              <p className="max-w-2xl text-white/56">
                Plus tôt la communauté rejoint la plateforme, plus vite nous pouvons l’améliorer et l’ancrer dans des usages réels.
              </p>
          <button
            onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-6 py-3 font-semibold text-white ring-1 ring-inset ring-white/[0.1] transition-colors hover:bg-white/[0.09]"
          >
                <Share2 className="h-5 w-5" />
                Partager AfriWonder
          </button>
            </div>
      </section>
        </main>

        <footer className="border-t border-white/[0.06] px-4 py-12 text-center text-white/46 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4">© 2026 AfriWonder. Fabriqué en Afrique.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/PrivacyPolicy" onClick={() => window.scrollTo(0, 0)} className="transition-colors hover:text-white">Confidentialité</Link>
              <Link to="/DataProtection" onClick={() => window.scrollTo(0, 0)} className="transition-colors hover:text-white">Sécurité</Link>
              <Link to="/Help" onClick={() => window.scrollTo(0, 0)} className="transition-colors hover:text-white">Support</Link>
              <Link to="/About" onClick={() => window.scrollTo(0, 0)} className="transition-colors hover:text-white">À propos</Link>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
