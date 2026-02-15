import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { motion } from 'framer-motion';
import {
  Download,
  Heart,
  MessageCircle,
  Share2,
  Users,
  ChevronDown,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import AfriWonderLogo from '@/components/common/AfriWonderLogo';
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

const EARLY_ACCESS_MESSAGE = "AfriWonder est en version Beta / Early Access. Nous construisons ensemble. Vos retours sont précieux et certains bugs peuvent exister. Merci de votre soutien !";

export default function Landing() {
  const { data: earlyAccessConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['early-access-config'],
    queryFn: () => api.earlyAccess.getConfig(),
    staleTime: 30 * 1000,
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

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden" style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-transparent backdrop-blur-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AfriWonderLogo size="sm" />
            <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              AfriWonder
            </span>
          </div>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-4 sm:right-6 lg:right-8 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium text-sm flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Accéder à l'app
          </a>
        </div>
      </nav>

      {/* Hero Section - Early Access */}
      <section className="min-h-screen flex items-center justify-center pt-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-4xl"
        >
          <div className="mb-6 flex justify-center">
            <AfriWonderLogo size="3xl" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black mb-4 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
            AfriWonder
          </h1>

          {/* Message Early Access */}
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-100 text-sm sm:text-base max-w-2xl mx-auto">
            {EARLY_ACCESS_MESSAGE}
          </div>

          <p className="text-gray-400 mb-6 italic">Where Africa Wows the World</p>

          {/* Compteur utilisateurs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Users className="w-5 h-5 text-orange-400" />
            <span className="text-lg font-semibold">
              {loadingConfig ? '...' : (
                <>
                  <span className="text-orange-400">{formatStat(totalUsers)}</span>
                  <span className="text-gray-400"> / </span>
                  <span>{formatStat(maxUsers)}</span>
                  <span className="text-gray-500 ml-1">utilisateurs</span>
                </>
              )}
            </span>
          </div>

          {/* Boutons Téléchargement — liens vers l'app AfriWonder (site séparé) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleInstallPWA}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-lg hover:shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Télécharger PWA
            </motion.button>
            <motion.a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              Ouvrir l'application
            </motion.a>
          </div>
          {isIOS() && (
            <p className="text-xs text-gray-500 mb-4">
              iOS : Safari → Partager → « Ajouter à l'écran d'accueil »
            </p>
          )}

          {/* Early Access complet : liste d'attente */}
          {isFull ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto bg-gray-800/60 backdrop-blur-md border border-amber-500/40 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-amber-400 mb-2">Early Access complet pour le moment</h3>
              <p className="text-gray-400 text-sm mb-4">Rejoignez la liste d'attente pour la prochaine vague.</p>
              <form onSubmit={handleJoinWaitlist} className="space-y-3">
                <input
                  type="email"
                  placeholder="Votre email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Nom (optionnel)"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={waitlistLoading}
                  className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold disabled:opacity-50"
                >
                  {waitlistLoading ? 'Envoi...' : 'Rejoindre la liste d\'attente'}
                </button>
              </form>
            </motion.div>
          ) : (
            <p className="text-gray-400 text-sm">
              Cliquez ci-dessus pour télécharger ou accéder à l'application AfriWonder.
            </p>
          )}

          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-gray-400 mt-8">
            <ChevronDown className="w-8 h-8 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* Soutien financier / Donations */}
      <section className="py-20 px-4 relative">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-4xl font-black text-center mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"
          >
            Soutenez AfriWonder
          </motion.h2>

          {/* Message motivant et patriotique */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40"
          >
            <h3 className="text-xl font-bold text-orange-100 mb-4 text-center">
              Soutenez AfriWonder – Construisons l'avenir numérique de l'Afrique ensemble !
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Chaque contribution, même la plus petite, compte. En soutenant AfriWonder :
            </p>
            <ul className="space-y-2 text-gray-300 text-sm mb-4 list-disc list-inside">
              <li>Vous investissez dans le futur de l'Afrique numérique.</li>
              <li>Vous créez des emplois pour nos ingénieurs, développeurs et créateurs locaux.</li>
              <li>Vous accompagnez la croissance de nos talents et la formation de la nouvelle génération.</li>
              <li>Vous renforcez une plateforme africaine, conçue par et pour nous, qui continuera à évoluer grâce à vous.</li>
            </ul>
            <p className="text-gray-300 text-sm mb-4">
              Votre soutien n'est pas seulement un don, c'est un acte pour :
            </p>
            <ul className="space-y-2 text-gray-300 text-sm mb-4 list-disc list-inside">
              <li>Offrir des opportunités réelles à nos talents africains.</li>
              <li>Construire une communauté solide et indépendante.</li>
              <li>Permettre à AfriWonder de rester 100% au service de l'Afrique, et non des intérêts extérieurs.</li>
            </ul>
            <p className="text-amber-200/90 text-sm mb-2">
              💡 Chaque franc investi revient directement à renforcer nos équipes, améliorer la plateforme et soutenir nos créateurs. Ensemble, nous faisons plus qu'une plateforme : nous bâtissons l'avenir numérique de notre continent.
            </p>
            <p className="text-orange-200 font-semibold text-sm text-center">
              🎯 Faites partie des premiers à soutenir et transformer l'Afrique numérique dès aujourd'hui.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8"
          >
            <p className="text-amber-200/90 text-sm text-center mb-6 px-2">
              Chaque paiement sera libellé « Soutien AfriWonder » pour faciliter la traçabilité.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setDonationAmount(amt); setDonationCustom(''); }}
                  className={`px-6 py-3 rounded-xl font-bold transition-all ${donationAmount === amt ? 'bg-orange-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {amt.toLocaleString()} FCFA
                </button>
              ))}
            </div>
            <form onSubmit={handleDonate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Montant libre (min 100 FCFA)</label>
                <input
                  type="number"
                  min={100}
                  placeholder="Ex: 2500"
                  value={donationCustom}
                  onChange={(e) => { setDonationCustom(e.target.value); setDonationAmount(null); }}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Numéro Orange Money / Mobile Money <span className="text-orange-400">*</span></label>
                <input
                  type="tel"
                  placeholder="Ex: +223 70 12 34 56"
                  value={donationPhone}
                  onChange={(e) => setDonationPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Obligatoire pour recevoir la demande de paiement.</p>
              </div>

              {/* Option : apparaître dans la liste des contributeurs */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={donationShowInContributors}
                    onChange={(e) => setDonationShowInContributors(e.target.checked)}
                    className="rounded mt-1"
                  />
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-orange-200">Souhaitez-vous apparaître dans la liste des contributeurs ?</span>
                    <br />
                    <span className="text-gray-500">Rejoignez les noms de ceux qui bâtissent l'Afrique numérique. Votre soutien sera honoré publiquement. (optionnel)</span>
                  </span>
                </label>
              </div>

              {/* Section optionnelle : infos pour remerciement */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={donationWantsThanks}
                    onChange={(e) => setDonationWantsThanks(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">Laisser vos coordonnées pour être remercié(e) personnellement ? (optionnel)</span>
                </label>
                {donationWantsThanks && (
                  <div className="space-y-3 pl-6 border-l-2 border-orange-500/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nom (optionnel)"
                        value={donationName}
                        onChange={(e) => setDonationName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Prénom (optionnel)"
                        value={donationFirstName}
                        onChange={(e) => setDonationFirstName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        placeholder="Âge (optionnel)"
                        value={donationAge}
                        onChange={(e) => setDonationAge(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Pays (optionnel)"
                        value={donationCountry}
                        onChange={(e) => setDonationCountry(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Ville (optionnel)"
                      value={donationCity}
                      onChange={(e) => setDonationCity(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="email"
                      placeholder="Email (optionnel)"
                      value={donationEmail}
                      onChange={(e) => setDonationEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                    <textarea
                      placeholder="Un message pour nous ? (optionnel)"
                      value={donationMessage}
                      onChange={(e) => setDonationMessage(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </div>

              <button type="submit" disabled={donationLoading} className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                {donationLoading ? 'Envoi...' : 'Contribuer'}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Feedback */}
      <section className="py-20 px-4 relative">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-4xl font-black text-center mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"
          >
            Votre avis compte
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-400 text-center mb-8"
          >
            Bug, suggestion ou commentaire — nous lisons tout.
          </motion.p>
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleFeedback}
            className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 space-y-4"
          >
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500">
                <option value="bug">Bug</option>
                <option value="suggestion">Suggestion</option>
                <option value="comment">Commentaire</option>
              </select>
            </div>
            <textarea placeholder="Votre message..." value={feedbackContent} onChange={(e) => setFeedbackContent(e.target.value)} rows={4} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500" required />
            <input type="email" placeholder="Email (optionnel)" value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500" />
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={feedbackJoinWhatsapp} onChange={(e) => setFeedbackJoinWhatsapp(e.target.checked)} className="rounded" />
                <span className="text-sm">Rejoindre le groupe WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={feedbackJoinMailing} onChange={(e) => setFeedbackJoinMailing(e.target.checked)} className="rounded" />
                <span className="text-sm">Rejoindre la mailing list</span>
              </label>
            </div>
            <button type="submit" disabled={feedbackLoading} className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {feedbackLoading ? 'Envoi...' : 'Envoyer'}
            </button>
          </motion.form>
        </div>
      </section>

      {/* Partage social */}
      <section className="py-12 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-gray-400 mb-4">Invitez vos amis à rejoindre AfriWonder</p>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-all"
          >
            <Share2 className="w-5 h-5" />
            Partager
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 text-center text-gray-400">
        <div className="max-w-7xl mx-auto">
          <p className="mb-4">© 2026 AfriWonder. Fabriqué en Afrique 🌍</p>
          <div className="flex justify-center gap-6 flex-wrap">
            <Link to="/PrivacyPolicy" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors underline">Confidentialité</Link>
            <Link to="/DataProtection" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors underline">Sécurité</Link>
            <Link to="/Help" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors underline">Support</Link>
            <Link to="/About" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors underline">À propos</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}
