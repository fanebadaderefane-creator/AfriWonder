import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Shield, Cookie, Download, Trash2, Lock, 
  Eye, EyeOff, AlertTriangle, CheckCircle, Clock, Key 
} from 'lucide-react';
import BottomNav from '../components/navigation/BottomNav';
import api from '../services/api';

export default function PrivacySettings() {
  const navigate = useNavigate();
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
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      await Promise.all([
        loadCookiePreferences(),
        load2FAStatus(),
        loadExportRequests(),
        loadDeletionStatus(),
      ]);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCookiePreferences = async () => {
    try {
      const response = await api.get('/privacy/cookies/preferences');
      setCookiePreferences(response.data.data);
    } catch (error) {
      console.error('Error loading cookie preferences:', error);
    }
  };

  const saveCookiePreferences = async () => {
    try {
      await api.post('/privacy/cookies/consent', cookiePreferences);
      alert('Préférences de cookies enregistrées');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const load2FAStatus = async () => {
    try {
      const response = await api.get('/privacy/2fa/status');
      setTwoFAStatus(response.data.data);
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    }
  };

  const enable2FA = async () => {
    try {
      const response = await api.post('/privacy/2fa/enable', {
        method: 'authenticator',
      });
      
      setQrCodeUrl(response.data.data.qr_code_url);
      setBackupCodes(response.data.data.backup_codes);
      setShowVerificationCode(true);
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      alert('Erreur lors de l\'activation de 2FA');
    }
  };

  const verify2FA = async () => {
    try {
      await api.post('/privacy/2fa/verify', { code: verificationCode });
      alert('Authentification à deux facteurs activée avec succès');
      setShowVerificationCode(false);
      await load2FAStatus();
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      alert('Code de vérification invalide');
    }
  };

  const disable2FA = async () => {
    const password = prompt('Entrez votre mot de passe pour désactiver 2FA:');
    if (!password) return;

    try {
      await api.post('/privacy/2fa/disable', { password });
      alert('Authentification à deux facteurs désactivée');
      await load2FAStatus();
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      alert('Mot de passe incorrect');
    }
  };

  const loadExportRequests = async () => {
    try {
      const response = await api.get('/privacy/export-data/requests');
      setExportRequests(response.data.data);
    } catch (error) {
      console.error('Error loading export requests:', error);
    }
  };

  const requestDataExport = async () => {
    try {
      await api.post('/privacy/export-data', { format: 'json' });
      alert('Demande d\'export enregistrée. Vous recevrez un email quand elle sera prête.');
      await loadExportRequests();
    } catch (error) {
      console.error('Error requesting export:', error);
      alert(error.response?.data?.error || 'Erreur lors de la demande');
    }
  };

  const loadDeletionStatus = async () => {
    try {
      const response = await api.get('/privacy/deletion-status');
      setDeletionStatus(response.data.data);
    } catch (error) {
      console.error('Error loading deletion status:', error);
    }
  };

  const requestAccountDeletion = async () => {
    try {
      const response = await api.post('/privacy/delete-account', {
        reason: deletionReason,
      });
      alert('Demande de suppression enregistrée. Votre compte sera supprimé dans 30 jours. Vous recevrez un email avec un lien d\'annulation.');
      setShowDeletionConfirm(false);
      await loadDeletionStatus();
    } catch (error) {
      console.error('Error requesting deletion:', error);
      alert(error.response?.data?.error || 'Erreur lors de la demande');
    }
  };

  const loadSecurityLogs = async () => {
    try {
      const response = await api.get('/privacy/security-logs?limit=10');
      setSecurityLogs(response.data.data.logs);
    } catch (error) {
      console.error('Error loading security logs:', error);
    }
  };

  const tabs = [
    { id: 'cookies', label: 'Cookies', icon: Cookie },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'deletion', label: 'Suppression', icon: Trash2 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-orange-500/20 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-orange-100">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Confidentialité & Sécurité
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 gap-2 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
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
            onDisable2FA={disable2FA}
            showVerificationCode={showVerificationCode}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            onVerify={verify2FA}
            qrCodeUrl={qrCodeUrl}
            backupCodes={backupCodes}
            securityLogs={securityLogs}
            onLoadLogs={loadSecurityLogs}
          />
        )}

        {activeTab === 'export' && (
          <ExportTab
            requests={exportRequests}
            onRequestExport={requestDataExport}
          />
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

// Cookie Tab Component
function CookiesTab({ preferences, setPreferences, onSave }) {
  const togglePreference = (key) => {
    if (key === 'essential') return;
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Préférences de Cookies</h2>
        
        <div className="space-y-3 mb-6">
          <CookieToggle
            title="Cookies essentiels"
            description="Nécessaires au fonctionnement du site"
            enabled={true}
            disabled={true}
          />
          <CookieToggle
            title="Cookies analytiques"
            description="Nous aident à améliorer le site"
            enabled={preferences.analytics}
            onChange={() => togglePreference('analytics')}
          />
          <CookieToggle
            title="Cookies marketing"
            description="Personnalisent les publicités"
            enabled={preferences.marketing}
            onChange={() => togglePreference('marketing')}
          />
          <CookieToggle
            title="Cookies fonctionnels"
            description="Mémorisent vos préférences"
            enabled={preferences.functional}
            onChange={() => togglePreference('functional')}
          />
          <CookieToggle
            title="Cookies réseaux sociaux"
            description="Partagent sur les réseaux"
            enabled={preferences.social_media}
            onChange={() => togglePreference('social_media')}
          />
        </div>

        <Button 
          onClick={onSave}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
        >
          Enregistrer les préférences
        </Button>
      </div>
    </div>
  );
}

function CookieToggle({ title, description, enabled, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`ml-4 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`w-12 h-6 rounded-full flex items-center transition-colors ${
          enabled ? 'bg-orange-500 justify-end' : 'bg-gray-300 justify-start'
        } px-1`}>
          <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
        </div>
      </button>
    </div>
  );
}

// Security Tab Component
function SecurityTab({ 
  twoFAStatus, onEnable2FA, onDisable2FA, 
  showVerificationCode, verificationCode, setVerificationCode, onVerify,
  qrCodeUrl, backupCodes, securityLogs, onLoadLogs 
}) {
  const [showLogs, setShowLogs] = useState(false);

  const handleShowLogs = async () => {
    await onLoadLogs();
    setShowLogs(true);
  };

  return (
    <div className="space-y-4">
      {/* 2FA Section */}
      <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentification à Deux Facteurs (2FA)</h2>
            <p className="text-sm text-gray-600">
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            twoFAStatus.is_enabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {twoFAStatus.is_enabled ? 'Activée' : 'Désactivée'}
          </div>
        </div>

        {!twoFAStatus.is_enabled ? (
          <>
            {!showVerificationCode ? (
              <Button 
                onClick={onEnable2FA}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
              >
                <Key className="w-4 h-4 mr-2" />
                Activer 2FA
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Scannez ce code QR</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Utilisez une application comme Google Authenticator ou Authy
                  </p>
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="mx-auto w-48 h-48 bg-white p-2 rounded-lg"
                    />
                  )}
                </div>

                {backupCodes.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Codes de secours
                    </h3>
                    <p className="text-xs text-red-700 mb-2">
                      Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une fois.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, idx) => (
                        <div key={idx} className="bg-white px-2 py-1 rounded">{code}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code de vérification
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                    maxLength={6}
                  />
                </div>

                <Button 
                  onClick={onVerify}
                  disabled={verificationCode.length !== 6}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
                >
                  Vérifier et Activer
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">2FA est active sur votre compte</span>
            </div>
            <Button 
              onClick={onDisable2FA}
              variant="outline"
              className="w-full border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold"
            >
              Désactiver 2FA
            </Button>
          </div>
        )}
      </div>

      {/* Security Logs */}
      <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activité de Sécurité</h2>
        
        {!showLogs ? (
          <Button 
            onClick={handleShowLogs}
            variant="outline"
            className="w-full border-2 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir l'historique
          </Button>
        ) : (
          <div className="space-y-2">
            {securityLogs.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Aucune activité récente</p>
            ) : (
              securityLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-600">IP: {log.ip_address}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export Tab Component
function ExportTab({ requests, onRequestExport }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Exporter mes données</h2>
        <p className="text-sm text-gray-600 mb-4">
          Conformément au RGPD Article 20, vous pouvez télécharger toutes vos données personnelles.
        </p>

        <Button 
          onClick={onRequestExport}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold mb-6"
        >
          <Download className="w-4 h-4 mr-2" />
          Nouvelle demande d'export
        </Button>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Mes demandes</h3>
          {requests.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">Aucune demande d'export</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">
                        Export {req.format.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(req.requested_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                      req.status === 'completed' ? 'bg-green-100 text-green-700' :
                      req.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === 'completed' && req.download_url && (
                    <Button
                      as="a"
                      href={req.download_url}
                      target="_blank"
                      size="sm"
                      className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Télécharger
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Deletion Tab Component
function DeletionTab({ deletionStatus, showConfirm, setShowConfirm, reason, setReason, onRequestDeletion }) {
  if (deletionStatus?.has_pending_deletion) {
    const req = deletionStatus.deletion_request;
    return (
      <div className="bg-white rounded-xl shadow-lg border border-red-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-900 mb-2">Suppression programmée</h2>
            <p className="text-sm text-red-700">
              Votre compte sera définitivement supprimé le{' '}
              {new Date(req.scheduled_deletion_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-red-900 mb-2">Que se passe-t-il ?</h3>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Votre compte et vos données seront supprimés dans 30 jours</li>
            <li>• Vous avez reçu un email avec un lien d'annulation</li>
            <li>• Après suppression, cette action est irréversible</li>
          </ul>
        </div>

        <p className="text-xs text-gray-600 text-center">
          Vous avez changé d'avis ? Cliquez sur le lien dans l'email pour annuler la suppression.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Supprimer mon compte</h2>
          <p className="text-sm text-gray-600">
            La suppression de votre compte est définitive et irréversible.
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">Attention !</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Toutes vos données personnelles seront supprimées</li>
              <li>• Vos vidéos, produits et contenus seront effacés</li>
              <li>• Vous ne pourrez plus accéder à votre compte</li>
              <li>• Cette action est irréversible après 30 jours</li>
            </ul>
          </div>

          <Button 
            onClick={() => setShowConfirm(true)}
            variant="outline"
            className="w-full border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Demander la suppression
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Période de grâce de 30 jours</h3>
            <p className="text-sm text-gray-700">
              Votre compte sera marqué pour suppression mais vous aurez 30 jours pour annuler cette demande.
              Après ce délai, la suppression sera définitive.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Raison (optionnelle)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pourquoi souhaitez-vous supprimer votre compte ?"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => setShowConfirm(false)}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={onRequestDeletion}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              Confirmer la suppression
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
