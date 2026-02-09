import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { X, Settings, Cookie, Shield } from 'lucide-react';
import api from '@/services/api';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
    social_media: false,
  });

  useEffect(() => {
    checkCookieConsent();
  }, []);

  const checkCookieConsent = async () => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consent = localStorage.getItem('cookie_consent');
    
    if (!consent) {
      // Délai de 1 seconde avant d'afficher la bannière
      setTimeout(() => {
        setVisible(true);
      }, 1000);
    }
  };

  const handleAcceptAll = async () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
      social_media: true,
    };
    
    await savePreferences(allAccepted);
  };

  const handleRejectNonEssential = async () => {
    const onlyEssential = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
      social_media: false,
    };
    
    await savePreferences(onlyEssential);
  };

  const handleSaveCustom = async () => {
    await savePreferences(preferences);
  };

  const savePreferences = async (prefs) => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        // Utilisateur connecté
        await api.post('/privacy/cookies/consent', prefs);
      } else {
        // Invité - générer un session_id
        const sessionId = getOrCreateSessionId();
        await api.post('/privacy/cookies/guest-consent', {
          session_id: sessionId,
          ...prefs,
        });
      }
      
      // Sauvegarder localement
      localStorage.setItem('cookie_consent', JSON.stringify(prefs));
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
      
      // Appliquer les préférences
      applyCookiePreferences(prefs);
      
      setVisible(false);
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving cookie preferences:', error);
      // Sauvegarder quand même localement
      localStorage.setItem('cookie_consent', JSON.stringify(prefs));
      setVisible(false);
    }
  };

  const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guest_session_id', sessionId);
    }
    return sessionId;
  };

  const applyCookiePreferences = (prefs) => {
    // Bloquer/Débloquer Google Analytics
    if (prefs.analytics && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    } else if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }

    // Bloquer/Débloquer Marketing
    if (prefs.marketing && window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted'
      });
    } else if (window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'denied'
      });
    }

    // TODO: Ajouter d'autres services de tracking selon vos besoins
  };

  const togglePreference = (key) => {
    if (key === 'essential') return; // Ne peut pas désactiver les essentiels
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-orange-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Cookie className="w-6 h-6" />
            <h2 className="text-lg font-bold">Gestion des Cookies</h2>
          </div>
          <button 
            onClick={() => setVisible(false)}
            className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!showSettings ? (
            <>
              <div className="flex items-start gap-3">
                <Shield className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Nous respectons votre vie privée</h3>
                  <p className="text-gray-600 text-sm">
                    AfriWonder utilise des cookies pour améliorer votre expérience, analyser notre trafic et personnaliser le contenu. 
                    Certains cookies sont essentiels au fonctionnement du site, tandis que d'autres nécessitent votre consentement.
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Types de cookies :</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• <strong>Essentiels</strong> : Nécessaires au fonctionnement du site</li>
                  <li>• <strong>Analytiques</strong> : Nous aident à comprendre comment vous utilisez le site</li>
                  <li>• <strong>Marketing</strong> : Utilisés pour personnaliser la publicité</li>
                  <li>• <strong>Fonctionnels</strong> : Mémorisent vos préférences</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={handleAcceptAll}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
                >
                  Accepter tout
                </Button>
                <Button 
                  onClick={handleRejectNonEssential}
                  variant="outline"
                  className="flex-1 border-2 border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold"
                >
                  Refuser non essentiels
                </Button>
                <Button 
                  onClick={() => setShowSettings(true)}
                  variant="ghost"
                  className="flex-1 text-gray-700 hover:bg-gray-100 font-semibold"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Personnaliser
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center pt-2">
                En cliquant sur "Accepter tout", vous acceptez notre{' '}
                <Link to="/PrivacyPolicy" className="text-orange-600 hover:underline font-medium" onClick={() => setVisible(false)}>Politique de confidentialité</Link>
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 mb-4">Personnaliser les préférences</h3>
              
              <div className="space-y-3">
                {/* Essential */}
                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900">Cookies essentiels</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Nécessaires au fonctionnement du site. Ne peuvent pas être désactivés.
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-6 bg-orange-500 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <CookieToggle
                  title="Cookies analytiques"
                  description="Nous aident à comprendre comment vous utilisez le site pour l'améliorer."
                  enabled={preferences.analytics}
                  onChange={() => togglePreference('analytics')}
                />

                {/* Marketing */}
                <CookieToggle
                  title="Cookies marketing"
                  description="Utilisés pour personnaliser les publicités selon vos intérêts."
                  enabled={preferences.marketing}
                  onChange={() => togglePreference('marketing')}
                />

                {/* Functional */}
                <CookieToggle
                  title="Cookies fonctionnels"
                  description="Mémorisent vos préférences (langue, région, etc.)."
                  enabled={preferences.functional}
                  onChange={() => togglePreference('functional')}
                />

                {/* Social Media */}
                <CookieToggle
                  title="Cookies réseaux sociaux"
                  description="Permettent le partage sur les réseaux sociaux."
                  enabled={preferences.social_media}
                  onChange={() => togglePreference('social_media')}
                />
              </div>

              <div className="flex gap-3 pt-6">
                <Button 
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button 
                  onClick={handleSaveCustom}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
                >
                  Enregistrer mes choix
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CookieToggle({ title, description, enabled, onChange }) {
  return (
    <div className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
      <div className="flex-1">
        <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>
      <button
        onClick={onChange}
        className="ml-4"
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
