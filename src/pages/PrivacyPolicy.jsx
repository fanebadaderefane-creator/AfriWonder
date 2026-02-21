import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Clock, CheckCircle } from 'lucide-react';
import BottomNav from '../components/navigation/BottomNav';
import api from '../services/api';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [documentHistory, setDocumentHistory] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadPrivacyPolicy();
    checkAcceptance();
  }, []);

  const loadPrivacyPolicy = async () => {
    try {
      setLoading(true);
      const response = await api.get('/legal/documents/privacy_policy?language=fr');
      setDocument(response.data.data);
    } catch (error) {
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAcceptance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/legal/check-required');
      const required = response.data.data.documents.find(
        doc => doc.type === 'privacy_policy'
      );
      setHasAccepted(!required);
    } catch (error) {
      console.error('Error checking acceptance:', error);
    }
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Rediriger vers login
        navigate('/login');
        return;
      }

      await api.post('/legal/accept', {
        document_id: document.id,
        document_type: 'privacy_policy',
      });

      setHasAccepted(true);
      alert('Politique de confidentialité acceptée avec succès');
    } catch (error) {
      console.error('Error accepting policy:', error);
      alert('Erreur lors de l\'acceptation');
    } finally {
      setAccepting(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/legal/documents/privacy_policy/history?language=fr');
      setDocumentHistory(response.data.data);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadVersion = async (versionId) => {
    try {
      const response = await api.get(`/legal/documents/version/${versionId}`);
      setDocument(response.data.data);
      setShowHistory(false);
    } catch (error) {
      console.error('Error loading version:', error);
    }
  };

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

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
          <p className="text-gray-700">Politique de confidentialité non disponible</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 pb-20">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-orange-500/20 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-orange-100 text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent flex-1">
            Politique de confidentialité
          </h1>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={loadHistory}
            className="text-orange-600 hover:bg-orange-50"
          >
            <Clock className="w-4 h-4 mr-1" />
            Historique
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Version Info */}
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Version:</span>
                <span className="font-bold text-orange-600">{document.version}</span>
                {document.is_active && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                En vigueur depuis le {new Date(document.effective_date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            
            {hasAccepted ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Acceptée</span>
              </div>
            ) : (
              <Button 
                onClick={handleAccept}
                disabled={accepting}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {accepting ? 'Enregistrement...' : 'Accepter cette politique'}
              </Button>
            )}
          </div>
        </div>

        {/* History Modal */}
        {showHistory && (
          <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Historique des versions</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Fermer
              </Button>
            </div>
            
            <div className="space-y-2">
              {documentHistory.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => loadVersion(doc.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Version {doc.version}</span>
                        {doc.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{(doc.title || '').replace(/AfriConnect/gi, 'AfriWonder')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(doc.effective_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content — remplacer AfriConnect par AfriWonder pour cohérence de marque */}
        <div className="bg-white rounded-xl shadow-lg border border-orange-100 p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {(document.title || '').replace(/AfriConnect/gi, 'AfriWonder')}
            </h2>
          </div>

          {/* Content — charte graphique : dégradé orange-rouge pour titres et texte en gras */}
          <div 
            className="prose prose-sm max-w-none text-gray-700 legal-content"
            dangerouslySetInnerHTML={{ __html: (document.content || '').replace(/AfriConnect/g, 'AfriWonder').replace(/africonnect\./g, 'afriwonder.') }}
          />

          {/* Contact */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-3 text-orange-600">Contact</h3>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-5 h-5 text-orange-500" />
              <a href="mailto:fanebadaderefane@gmail.com" className="text-orange-600 font-medium hover:text-red-500 hover:underline">
                fanebadaderefane@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        {!hasAccepted && (
          <div className="mt-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Acceptation requise</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Pour continuer à utiliser AfriWonder, veuillez accepter notre politique de confidentialité mise à jour.
                </p>
                <Button 
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
                >
                  {accepting ? 'Enregistrement...' : 'J\'accepte la politique de confidentialité'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
