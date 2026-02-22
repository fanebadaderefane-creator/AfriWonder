import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Heart, Globe, Users, Shield, ExternalLink, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/navigation/BottomNav';
import AfriWonderLogo from '@/components/common/AfriWonderLogo';

function formatStat(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function About() {
  const navigate = useNavigate();
  const [showRateDialog, setShowRateDialog] = useState(false);
  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.platform.getStats(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50/30 pb-20">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-blue-500/20 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" aria-label="Retour"><ArrowLeft className="w-6 h-6" /></Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">À propos</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex justify-center">
            <AfriWonderLogo size="lg" className="shadow-lg ring-4 ring-blue-200/50 rounded-3xl" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AfriWonder</h2>
          <p className="text-blue-600/90 mt-1 font-medium">Version 1.0.0</p>
          <p className="text-sm text-gray-500 mt-2">Fabriqué avec ❤️ en Afrique</p>
        </div>

        <Card className="p-4 border-blue-100 shadow-sm">
          <h3 className="font-semibold mb-3 text-blue-600">Notre mission</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            AfriWonder est la première Super-app vidéo africaine connectant créateurs, commerçants et communauté, optimisée pour les faibles débits, disponible dans toutes les langues locales avec paiements mobiles intégrés.
            Notre mission est de démocratiser l'accès au numérique et de promouvoir l'économie locale à travers le contenu, le commerce et les services financiers.
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, value: formatStat(platformStats?.totalUsers ?? 0), label: 'Utilisateurs' },
            { icon: Globe, value: '15', label: 'Pays' },
            { icon: Heart, value: formatStat(platformStats?.totalVideos ?? 0), label: 'Vidéos' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center border-blue-100 hover:border-blue-200 transition-colors">
              <stat.icon className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 space-y-3 border-blue-100 shadow-sm">
          <h3 className="font-semibold text-blue-600">Liens utiles</h3>
          {[
            { label: 'Conditions d\'utilisation', icon: Shield, action: () => navigate('/TermsOfService') },
            { label: 'Politique de confidentialité', icon: Shield, action: () => navigate('/PrivacyPolicy') },
            { label: 'Site web', icon: Globe, action: () => window.open(window.location.origin + '/', '_blank', 'noopener,noreferrer') },
            { label: 'Noter l\'application', icon: Star, action: () => setShowRateDialog(true) },
          ].map((link) => (
            <Button 
              key={link.label} 
              variant="ghost" 
              className="w-full justify-between hover:bg-blue-50 text-gray-800"
              onClick={link.action}
            >
              <span className="flex items-center gap-3"><link.icon className="w-4 h-4 text-blue-600" />{link.label}</span>
              <ExternalLink className="w-4 h-4 text-blue-600" />
            </Button>
          ))}
        </Card>

        <p className="text-center text-xs text-gray-500 pt-4">
          © 2026 AfriWonder. Tous droits réservés.
        </p>
      </div>
      <BottomNav />

      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Noter l'application
            </DialogTitle>
            <DialogDescription>
              La notation sera bientôt disponible sur le Play Store et l'App Store. Merci pour votre soutien !
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowRateDialog(false)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}