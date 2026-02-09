import React, { useEffect, useState } from 'react';
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

export default function About() {
  const navigate = useNavigate();
  const [showRateDialog, setShowRateDialog] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 pb-20">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b-2 border-orange-500/20 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-orange-100"><ArrowLeft className="w-6 h-6 text-gray-700" /></Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">À propos</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex justify-center">
            <AfriWonderLogo size="lg" className="shadow-lg ring-4 ring-orange-200/50 rounded-3xl" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">AfriWonder</h2>
          <p className="text-orange-600/90 mt-1 font-medium">Version 1.0.0</p>
          <p className="text-sm text-gray-500 mt-2">Fabriqué avec ❤️ en Afrique</p>
        </div>

        <Card className="p-4 border-orange-100 shadow-sm">
          <h3 className="font-semibold mb-3 text-orange-600">Notre mission</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            AfriWonder est la première Super-app vidéo africaine connectant créateurs, commerçants et communauté, optimisée pour les faibles débits, disponible dans toutes les langues locales avec paiements mobiles intégrés.
            Notre mission est de démocratiser l'accès au numérique et de promouvoir l'économie locale à travers le contenu, le commerce et les services financiers.
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, value: '1M+', label: 'Utilisateurs' },
            { icon: Globe, value: '15', label: 'Pays' },
            { icon: Heart, value: '50M+', label: 'Interactions' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center border-orange-100 hover:border-orange-200 transition-colors">
              <stat.icon className="w-6 h-6 mx-auto text-orange-500 mb-2" />
              <p className="font-bold text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 space-y-3 border-orange-100 shadow-sm">
          <h3 className="font-semibold text-orange-600">Liens utiles</h3>
          {[
            { label: 'Conditions d\'utilisation', icon: Shield, action: () => navigate('/TermsOfService') },
            { label: 'Politique de confidentialité', icon: Shield, action: () => navigate('/PrivacyPolicy') },
            { label: 'Site web', icon: Globe, action: () => window.open(window.location.origin + '/', '_blank', 'noopener,noreferrer') },
            { label: 'Noter l\'application', icon: Star, action: () => setShowRateDialog(true) },
          ].map((link) => (
            <Button 
              key={link.label} 
              variant="ghost" 
              className="w-full justify-between hover:bg-orange-50 text-gray-800"
              onClick={link.action}
            >
              <span className="flex items-center gap-3"><link.icon className="w-4 h-4 text-orange-500" />{link.label}</span>
              <ExternalLink className="w-4 h-4 text-orange-500" />
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
              <Star className="w-5 h-5 text-orange-500" />
              Noter l'application
            </DialogTitle>
            <DialogDescription>
              La notation sera bientôt disponible sur le Play Store et l'App Store. Merci pour votre soutien !
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowRateDialog(false)} className="bg-gradient-to-r from-orange-500 to-red-500">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}