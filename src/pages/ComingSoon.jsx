/**
 * Page "Bientôt" — Modules Phase 2 non encore activés
 * Affichée quand un utilisateur accède à une URL Phase 2 désactivée (optionnel)
 */
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import BottomNav from '@/components/navigation/BottomNav';

export default function ComingSoon() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleName = searchParams.get('module') || 'Ce module';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 flex flex-col items-center justify-center px-6 pb-24">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Bientôt disponible</h1>
        <p className="text-white/70 mb-6">
          {moduleName} sera bientôt activé sur AfriWonder. Restez à l'écoute !
        </p>
        <Button
          onClick={() => navigate(createPageUrl('Home'))}
          className="bg-gradient-to-r from-orange-500 to-red-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
