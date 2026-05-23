import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Shield, Cookie, Download, Trash2,
  Eye, AlertTriangle, CheckCircle, Key, Lock,
} from 'lucide-react';
import BottomNav from '../components/navigation/BottomNav';
import { api } from '@/api/expressClient';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('cookies');
  const [loading, setLoading] = useState(true);

  // Cookies
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
    social_media: false,
  });

  // 2FA
  const [twoFAStatus, setTwoFAStatus] = useState({ is_enabled: false });
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  // Export
  const [exportRequests, setExportRequests] = useState([]);

  // Deletion
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  // Security Logs
  const [securityLogs, setSecurityLogs] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isLoadingAuth && !isAuthenticated) {
      navigate('/Landing', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCookiePreferences(),
        load2FAStatus(),
        loadExportRequests(),
        loadDeletionStatus(),
      ]);
    } catch {
      // Errors handled individually per request
    } finally {
      setLoading(false);
    }
  };

  const loadCookiePreferences = async () => {
    try {
      const response = await api.get('/privacy/cookies/preferences');
      setCookiePreferences(response.data.data);
    } catch {
      // Préférences par défaut conservées
    }
  };

  const saveCookiePreferences = async () => {
    const id = toast.loading('Enregistrement...');
    try {
      await api.post('/privacy/cookies/consent', cookiePreferences);
      toast.success('Préférences de cookies enregistrées', { id });
    } catch {
      toast.error("Erreur lors de l'enregistrement", { id });
    }
  };

  const load2FAStatus = async () => {
    try {
      const response = await api.get('/privacy/2fa/status');
      setTwoFAStatus(response.data.data);
    } catch {
      // Statut par défaut conservé
    }
  };

  const enable2FA = async () => {
    const id = toast.loading('Activation en cours...');
    try {
      const response = await api.post('/privacy/2fa/enable', { method: 'authenticator' });
      setQrCodeUrl(response.data.data.qr_code_url);
      setBackupCodes(response.data.data.backup_codes);
      setShowVerificationCode(true);
      toast.dismiss(id);
    } catch {
      toast.error("Erreur lors de l'activation de 2FA", { id });
    }
  };

  const verify2FA = async () => {
    const id = toast.loading('Vérification...');
    try {
      await api.post('/privacy/2fa/verify', { code: verificationCode });
      toast.success('Authentification à deux facteurs activée avec succès', { id });
      setShowVerificationCode(false);
      setVerificationCode('');
      await load2FAStatus();
    } catch {
      toast.error('Code de vérification invalide', { id });
    }
  };

  const disable2FA = async () => {
    if (!disable2FAPassword.trim()) {
      toast.error('Veuillez saisir votre mot de passe');
      return;
    }
    setIsDisabling2FA(true);
    const id = toast.loading('Désactivation...');
    try {
      await api.post('/privacy/2fa/disable', { password: disable2FAPassword });
      toast.success('Authentification à deux facteurs désactivée', { id });
      setShowDisable2FAModal(false);
      setDisable2FAPassword('');
      await load2FAStatus();
    } catch {
      toast.error('Mot de passe incorrect', { id });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const loadExportRequests = async () => {
    try {
      const response = await api.get('/privacy/export-data/requests');
      setExportRequests(response.data.data);
    } catch {
      // Liste vide conservée
    }
  };

  const requestDataExport = async () => {
    const id = toast.loading('Demande en cours...');
    try {
      await api.post('/privacy/export-data', { format: 'json' });
      toast.success(
        "Demande d'export enregistrée. Vous recevrez un email quand elle sera prête.",
        { id, duration: 6000 }
      );
      await loadExportRequests();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erreur lors de la demande", { id });
    }
  };

  const loadDeletionStatus = async () => {
    try {
      const response = await api.get('/privacy/deletion-status');
      setDeletionStatus(response.data.data);
    } catch {
      // Statut par défaut conservé
    }
  };

  const requestAccountDeletion = async () => {
    const id = toast.loading('Traitement...');
    try {
      await api.post('/privacy/delete-account', { reason: deletionReason });
      toast.success(
        'Demande de suppression enregistrée. Votre compte sera supprimé dans 30 jours.',
        { id, duration: 8000 }
      );
      setShowDeletionConfirm(false);
      setDeletionReason('');
      await loadDeletionStatus();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erreur lors de la demande', { id });
    }
  };

  const tabs = [
    { id: 'cookies', label: 'Cookies', icon: Cookie },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'deletion', label: 'Suppression', icon: Trash2 },
  ];

  if (isLoadingAuth || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-white/60 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Disable 2FA Modal */}
      {showDisable2FAModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disable2fa-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-red-400" />
              </div>
              <h2 id="disable2fa-title" className="text-base font-semibold text-white">
                Désactiver la 2FA
              </h2>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Confirmez votre mot de passe pour désactiver l&apos;authentification à deux facteurs.
            </p>
            <input
              type="password"
              value={disable2FAPassword}
              onChange={(e) => setDisable2FAPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && disable2FA()}
              placeholder="Mot de passe"
              autoFocus
              className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white hover:bg-white/10"
                onClick={() => { setShowDisable2FAModal(false); setDisable2FAPassword(''); }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold"
                onClick={disable2FA}
                disabled={isDisabling2FA || !disable2FAPassword.trim()}
              >
                Désactiver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Button>
          <h1 className="text-base font-bold text-white">Confidentialité &amp; Sécurité</h1>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 gap-2 pb-3 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-[0_0_16px_rgba(37,99,235,0.35)]'
                    : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'cookies' && (
          <CookiesTab
            preferences={cookiePreferences}
            setPreferences={setCookiePreferences}
            onSave={saveCookiePreferences}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            twoFAStatus={twoFAStatus}
            onEnable2FA={enable2FA}
            onDisable2FA={() => setShowDisable2FAModal(true)}
            showVerificationCode={showVerificationCode}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            onVerify={verify2FA}
            qrCodeUrl={qrCodeUrl}
            backupCodes={backupCodes}
            securityLogs={securityLogs}
            onLoadLogs={async () => {
              try {
                const r = await api.get('/privacy/security-logs?limit=10');
                setSecurityLogs(r.data.data.logs);
              } catch { /* silence */ }
            }}
          />
        )}

        {activeTab === 'export' && (
          <ExportTab requests={exportRequests} onRequestExport={requestDataExport} />
        )}

        {activeTab === 'deletion' && (
          <DeletionTab
            deletionStatus={deletionStatus}
            showConfirm={showDeletionConfirm}
            setShowConfirm={setShowDeletionConfirm}
            reason={deletionReason}
            setReason={setDeletionReason}
            onRequestDeletion={requestAccountDeletion}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-white/[0.07] p-5 shadow-sm">
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-bold text-white mb-1">{children}</h2>;
}

function SectionDesc({ children }) {
  return <p className="text-sm text-white/55 mb-4">{children}</p>;
}

// ─── Cookies Tab ─────────────────────────────────────────────────────────────
function CookiesTab({ preferences, setPreferences, onSave }) {
  const togglePreference = (key) => {
    if (key === 'essential') return;
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cookieItems = [
    { key: 'essential', title: 'Cookies essentiels', desc: 'Nécessaires au fonctionnement — toujours actifs', locked: true },
    { key: 'analytics', title: 'Cookies analytiques', desc: "Nous aident à comprendre l'utilisation de l'app" },
    { key: 'marketing', title: 'Cookies marketing', desc: "Personnalisent les publicités selon vos centres d'intérêt" },
    { key: 'functional', title: 'Cookies fonctionnels', desc: 'Mémorisent vos préférences (langue, thème…)' },
    { key: 'social_media', title: 'Réseaux sociaux', desc: 'Permettent le partage sur les plateformes sociales' },
  ];

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle>Préférences de cookies</SectionTitle>
        <SectionDesc>Gérez vos consentements conformément au RGPD.</SectionDesc>
        <div className="space-y-2 mb-5">
          {cookieItems.map(({ key, title, desc, locked }) => (
            <CookieToggle
              key={key}
              title={title}
              description={desc}
              enabled={preferences[key]}
              locked={locked}
              onToggle={() => togglePreference(key)}
            />
          ))}
        </div>
        <Button
          onClick={onSave}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
        >
          Enregistrer les préférences
        </Button>
      </SectionCard>
    </div>
  );
}

function CookieToggle({ title, description, enabled, locked, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{title}</p>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        disabled={locked}
        onClick={onToggle}
        className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${enabled ? 'bg-blue-600' : 'bg-white/20'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({
  twoFAStatus, onEnable2FA, onDisable2FA,
  showVerificationCode, verificationCode, setVerificationCode, onVerify,
  qrCodeUrl, backupCodes, securityLogs, onLoadLogs,
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleShowLogs = async () => {
    setLoadingLogs(true);
    await onLoadLogs();
    setLoadingLogs(false);
    setShowLogs(true);
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex items-start justify-between mb-4">
          <div>
            <SectionTitle>Authentification à deux facteurs</SectionTitle>
            <SectionDesc>Protégez votre compte avec une vérification supplémentaire.</SectionDesc>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            twoFAStatus.is_enabled
              ? 'bg-green-500/15 text-green-400'
              : 'bg-white/[0.06] text-white/50'
          }`}>
            {twoFAStatus.is_enabled ? 'Active' : 'Inactive'}
          </span>
        </div>

        {!twoFAStatus.is_enabled ? (
          <>
            {!showVerificationCode ? (
              <Button
                onClick={onEnable2FA}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
              >
                <Key className="w-4 h-4 mr-2" aria-hidden="true" />
                Activer la 2FA
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                  <p className="text-sm font-semibold text-white mb-1">Scannez ce code QR</p>
                  <p className="text-xs text-white/50 mb-3">
                    Utilisez Google Authenticator, Authy ou toute app TOTP.
                  </p>
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code pour configurer la 2FA"
                      className="mx-auto w-40 h-40 rounded-lg bg-white p-2"
                    />
                  )}
                </div>

                {backupCodes.length > 0 && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                    <p className="text-sm font-semibold text-red-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                      Codes de secours — notez-les maintenant
                    </p>
                    <p className="text-xs text-red-400/70 mb-3">
                      Chaque code n&apos;est utilisable qu&apos;une seule fois.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-sm">
                      {backupCodes.map((code, idx) => (
                        <span key={idx} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-white/80 text-center">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="totp-code" className="block text-sm font-semibold text-white/80 mb-1.5">
                    Code de vérification (6 chiffres)
                  </label>
                  <input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-center text-2xl tracking-[0.5em] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  />
                </div>

                <Button
                  onClick={onVerify}
                  disabled={verificationCode.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  Vérifier et activer
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-semibold">2FA est active sur votre compte</span>
            </div>
            <Button
              onClick={onDisable2FA}
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold rounded-xl"
            >
              Désactiver la 2FA
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Security Logs */}
      <SectionCard>
        <SectionTitle>Activité de sécurité</SectionTitle>
        <SectionDesc>Consultez les connexions et actions sensibles sur votre compte.</SectionDesc>

        {!showLogs ? (
          <Button
            onClick={handleShowLogs}
            variant="outline"
            disabled={loadingLogs}
            className="w-full border-white/10 text-white/70 hover:bg-white/10 rounded-xl"
          >
            <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
            {loadingLogs ? 'Chargement...' : "Voir l'historique"}
          </Button>
        ) : (
          <div className="space-y-2">
            {securityLogs.length === 0 ? (
              <p className="text-center text-sm text-white/40 py-6">Aucune activité récente</p>
            ) : (
              securityLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{log.action}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {log.ip_address} · {new Date(log.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    log.status === 'success'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────
function ExportTab({ requests, onRequestExport }) {
  const statusConfig = {
    completed: { label: 'Terminé', className: 'bg-green-500/15 text-green-400' },
    processing: { label: 'En cours', className: 'bg-blue-500/15 text-blue-400' },
    failed: { label: 'Échec', className: 'bg-red-500/15 text-red-400' },
    pending: { label: 'En attente', className: 'bg-white/[0.06] text-white/50' },
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle>Exporter mes données</SectionTitle>
        <SectionDesc>
          Conformément au RGPD (Article 20), téléchargez toutes vos données personnelles au format JSON.
        </SectionDesc>

        <Button
          onClick={onRequestExport}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl mb-5"
        >
          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
          Nouvelle demande d&apos;export
        </Button>

        {requests.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-sm font-semibold text-white/70 mb-3">Mes demandes</p>
            <div className="space-y-2">
              {requests.map((req) => {
                const s = statusConfig[req.status] ?? statusConfig.pending;
                return (
                  <div key={req.id} className="rounded-xl bg-white/[0.04] px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">Export {req.format?.toUpperCase()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${s.className}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      {new Date(req.requested_at).toLocaleString('fr-FR')}
                    </p>
                    {req.status === 'completed' && req.download_url && (
                      <a
                        href={req.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                      >
                        <Download className="w-3 h-3" aria-hidden="true" />
                        Télécharger
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Deletion Tab ─────────────────────────────────────────────────────────────
function DeletionTab({ deletionStatus, showConfirm, setShowConfirm, reason, setReason, onRequestDeletion }) {
  if (deletionStatus?.has_pending_deletion) {
    const req = deletionStatus.deletion_request;
    const scheduledDate = new Date(req.scheduled_deletion_at).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    return (
      <SectionCard>
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">Suppression programmée</h2>
            <p className="text-sm text-white/60">
              Votre compte sera définitivement supprimé le <strong className="text-white">{scheduledDate}</strong>.
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 space-y-1">
          <p>• Toutes vos données personnelles seront supprimées</p>
          <p>• Cette action est irréversible après la date limite</p>
          <p>• Cliquez sur le lien dans l&apos;email de confirmation pour annuler</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-400" aria-hidden="true" />
        </div>
        <div>
          <SectionTitle>Supprimer mon compte</SectionTitle>
          <SectionDesc>La suppression est définitive et irréversible après 30 jours.</SectionDesc>
        </div>
      </div>

      {!showConfirm ? (
        <>
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-5 text-sm text-red-400 space-y-1">
            <p>• Toutes vos données personnelles seront supprimées</p>
            <p>• Vos vidéos, produits et contenus seront effacés</p>
            <p>• Vous aurez 30 jours pour annuler via email</p>
          </div>
          <Button
            onClick={() => setShowConfirm(true)}
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold rounded-xl"
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Demander la suppression
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
            <p className="text-sm font-semibold text-white mb-1">Période de grâce de 30 jours</p>
            <p className="text-xs text-white/50">
              Vous recevrez un email avec un lien d&apos;annulation valable 30 jours.
            </p>
          </div>
          <div>
            <label htmlFor="deletion-reason" className="block text-sm font-semibold text-white/70 mb-1.5">
              Raison (optionnelle)
            </label>
            <textarea
              id="deletion-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pourquoi souhaitez-vous supprimer votre compte ?"
              rows={3}
              className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-white hover:bg-white/10 rounded-xl"
              onClick={() => setShowConfirm(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={onRequestDeletion}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl"
            >
              Confirmer
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
