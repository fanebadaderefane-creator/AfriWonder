import React, { useEffect, useState } from 'react';
import { ArrowLeft, Shield, Lock, Eye, Trash2, Share2, FileText, Download, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import api from '../services/api';

export default function DataProtection() {
  const navigate = useNavigate();
  const [legalInfo, setLegalInfo] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadLegalInfo();
  }, []);

  const loadLegalInfo = async () => {
    try {
      const response = await api.get('/legal/entity-info');
      setLegalInfo(response.data.data);
    } catch (error) {
      console.error('Error loading legal info:', error);
    }
  };

  const handleExportData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vous devez être connecté pour exporter vos données');
      navigate('/login');
      return;
    }

    try {
      setExportLoading(true);
      await api.post('/privacy/export-data', { format: 'json' });
      alert('Votre demande d\'export a été enregistrée. Vous recevrez un email quand elle sera prête (sous 24h).');
    } catch (error) {
      console.error('Error requesting export:', error);
      alert('Erreur lors de la demande d\'export');
    } finally {
      setExportLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Chiffrement des données',
      description: 'Toutes vos données sont chiffrées en transit et au repos'
    },
    {
      icon: Lock,
      title: 'Authentification sécurisée',
      description: 'Accès protégé par authentification forte et vérification en deux étapes'
    },
    {
      icon: Eye,
      title: 'Contrôle de la visibilité',
      description: 'Vous contrôlez qui peut voir vos données et votre contenu'
    },
    {
      icon: Trash2,
      title: 'Suppression complète',
      description: 'Droit d\'effacer vos données définitivement'
    },
    {
      icon: Share2,
      title: 'Partage contrôlé',
      description: 'Autorisation explicite pour chaque partage de données'
    },
    {
      icon: FileText,
      title: 'Transparence',
      description: 'Accès complet à vos informations personnelles'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-2 border-orange-500/20 shadow-sm">
        <div className="flex items-center gap-4 p-4 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Protection des Données</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Votre Protection est Notre Priorité</h2>
            <p className="text-gray-600">
              AfriWonder s'engage à protéger vos données personnelles conformément aux standards internationaux de protection des données.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="border-2 border-orange-100 rounded-xl p-4 hover:shadow-md hover:border-orange-200 transition-all">
                  <Icon className="w-6 h-6 text-orange-500 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Detailed Sections */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Vos Droits RGPD</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900">Droit d'accès</h4>
                <p className="text-gray-600 text-sm">Accédez à toutes vos données stockées sur AfriWonder à tout moment</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900">Droit de rectification</h4>
                <p className="text-gray-600 text-sm">Corrigez vos informations personnelles inexactes ou incomplètes</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900">Droit à l'oubli</h4>
                <p className="text-gray-600 text-sm">Demandez la suppression de vos données (sous réserve de obligations légales)</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900">Droit à la portabilité</h4>
                <p className="text-gray-600 text-sm">Exportez vos données dans un format structuré et lisible</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900">Droit d'opposition</h4>
                <p className="text-gray-600 text-sm">Refusez certains traitements de vos données</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Mesures de Sécurité Technique</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">•</span>
                <span>Chiffrement AES-256 pour le stockage des données</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">•</span>
                <span>HTTPS/TLS 1.2+ pour tous les transferts de données</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">•</span>
                <span>Authentification multi-facteurs (2FA/MFA)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">•</span>
                <span>Tests de sécurité réguliers et audits externes</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">•</span>
                <span>Accès aux données limité et contrôlé</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">•</span>
                <span>Sauvegarde régulière des données</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Gestion des Cookies</h3>
            <p className="text-gray-700">
              Nous utilisons des cookies uniquement avec votre consentement pour :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Authentification et sécurité</li>
              <li>Préférences utilisateur</li>
              <li>Analyse d'utilisation (anonymisée)</li>
              <li>Amélioration des performances</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">
              Vous pouvez gérer ou refuser les cookies à tout moment dans vos paramètres de confidentialité.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Violations de Données</h3>
            <p className="text-gray-700">
              En cas de violation de sécurité concernant vos données, nous vous notifierons sans délai et prendrons les mesures appropriées conformément à la loi.
            </p>
          </section>

          {/* Actions RGPD */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Actions Disponibles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleExportData}
                disabled={exportLoading}
                className="h-auto py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex flex-col items-center gap-2"
              >
                <Download className="w-6 h-6" />
                <span className="font-semibold">{exportLoading ? 'Traitement...' : 'Exporter mes données'}</span>
                <span className="text-xs opacity-90">RGPD Article 20</span>
              </Button>
              
              <Button
                onClick={() => navigate('/settings/privacy')}
                variant="outline"
                className="h-auto py-4 border-2 border-orange-300 text-orange-600 hover:bg-orange-50 flex flex-col items-center gap-2"
              >
                <SettingsIcon className="w-6 h-6" />
                <span className="font-semibold">Gérer mes paramètres</span>
                <span className="text-xs">Confidentialité & Cookies</span>
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Responsable de la Protection des Données</h3>
            <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4">
              {legalInfo ? (
                <>
                  <p className="text-gray-700 mb-2">
                    <strong>{legalInfo.company_name}</strong>
                  </p>
                  {legalInfo.dpo_name && (
                    <p className="text-gray-600 text-sm mb-1">
                      DPO: {legalInfo.dpo_name}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm">{legalInfo.dpo_email || legalInfo.email}</p>
                  {legalInfo.dpo_phone && (
                    <p className="text-gray-600 text-sm">{legalInfo.dpo_phone}</p>
                  )}
                  <p className="text-gray-600 text-sm mt-2">
                    {legalInfo.address}, {legalInfo.city} {legalInfo.postal_code}
                  </p>
                  <p className="text-gray-600 text-sm">{legalInfo.country}</p>
                  {legalInfo.hosting_provider && (
                    <p className="text-gray-600 text-sm mt-2">
                      <strong>Hébergement:</strong> {legalInfo.hosting_provider} ({legalInfo.hosting_region})
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-700 mb-2">
                    <strong>Délégué à la Protection des Données (DPO)</strong>
                  </p>
                  <p className="text-gray-600 text-sm">dpo@afriwonder.app</p>
                  <p className="text-gray-600 text-sm">Pour toute question ou réclamation concernant vos données</p>
                </>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Conformité Internationale</h3>
            <p className="text-gray-700">
              AfriWonder respecte les normes de protection des données suivantes :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>RGPD (Europe)</li>
              <li>CCPA (Californie)</li>
              <li>Lois locales de protection des données en Afrique</li>
              <li>ISO 27001 (Gestion de la sécurité de l'information)</li>
            </ul>
          </section>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}