import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { Award, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const { token: tokenFromPath } = useParams();
  const tokenFromUrl = searchParams.get('token') || tokenFromPath || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const verify = async (t) => {
    const value = (t ?? token).trim();
    if (!value) {
      setError('Veuillez entrer un token de vérification.');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.certificates.verify(value);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Certificat non trouvé ou token invalide.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = tokenFromUrl?.trim();
    if (initial) {
      setToken(initial);
      verify(initial);
    }
  }, [tokenFromUrl]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-8 h-8 text-amber-500" />
          <h1 className="text-xl font-bold">Vérifier un certificat</h1>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Entrez le code de vérification du certificat (ou utilisez le lien partagé avec le token).
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Token de vérification"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            className="flex-1"
          />
          <Button onClick={() => verify()} disabled={loading}>
            {loading ? 'Vérification...' : 'Vérifier'}
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircle className="w-5 h-5" />
              Certificat valide
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Cours :</strong> {result.course?.title ?? '—'}</p>
              <p><strong>Attribué à :</strong> {result.user?.full_name || result.user?.username || '—'}</p>
              <p><strong>Délivré le :</strong> {result.issued_at ? new Date(result.issued_at).toLocaleDateString('fr-FR') : '—'}</p>
              <p className="text-xs text-gray-500 mt-2">Token : {result.verification_token}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
