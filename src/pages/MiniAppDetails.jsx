import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Star, Download, Shield, Check, X, ShieldCheck, MapPin, Bell, Wallet, Camera, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomNav from '@/components/navigation/BottomNav';
import { MOCK_MINI_APPS } from '@/data/miniAppsMock';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PERMISSION_ICONS = {
  location: MapPin,
  wallet: Wallet,
  camera: Camera,
  notifications: Bell,
  storage: Database,
};

const PERMISSION_LABELS = {
  location: 'Géolocalisation',
  wallet: 'Portefeuille',
  camera: 'Caméra',
  notifications: 'Notifications',
  storage: 'Stockage',
};

export default function MiniAppDetails() {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('id');
  const [isInstalled, setIsInstalled] = useState(false);

  const app = MOCK_MINI_APPS.find(a => a.id === appId);

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Mini-app introuvable</p>
          <Link to={createPageUrl('MiniAppsStore')}>
            <Button className="mt-4">Retour au Store</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleInstall = () => {
    setIsInstalled(true);
    // Ici on pourrait appeler l'API pour installer la mini-app
  };

  const handleUninstall = () => {
    setIsInstalled(false);
    // Ici on pourrait appeler l'API pour désinstaller la mini-app
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">{app.name}</h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#f97316] to-[#ea580c] p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
            {app.icon.startsWith('http') ? (
              <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">{app.icon}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{app.name}</h2>
            <p className="text-orange-100 text-sm">{app.developer.name}</p>
            {app.developer.verified && (
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs">Développeur vérifié</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-white" />
            <span className="font-bold">{app.rating}</span>
            <span className="text-orange-100">({app.reviews_count} avis)</span>
          </div>
          <span className="text-orange-100">•</span>
          <span>{app.installs.toLocaleString()} installations</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Install Button */}
        <div>
          {isInstalled ? (
            <Button
              onClick={handleUninstall}
              className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              <X className="w-4 h-4 mr-2" />
              Désinstaller
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Installer
            </Button>
          )}
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">Description</h3>
            <p className="text-sm text-gray-700">{app.description}</p>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-[#f97316]" />
              <h3 className="font-bold">Permissions requises</h3>
            </div>
            <div className="space-y-2">
              {app.permissions.map(perm => {
                const Icon = PERMISSION_ICONS[perm];
                return (
                  <div key={perm} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {Icon && <Icon className="w-5 h-5 text-[#f97316]" />}
                    <span className="text-sm text-gray-700">{PERMISSION_LABELS[perm] || perm}</span>
                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ces permissions sont nécessaires pour le bon fonctionnement de l'application. 
              Toutes les données sont sécurisées et ne sont pas partagées avec des tiers.
            </p>
          </CardContent>
        </Card>

        {/* Screenshots */}
        {app.screenshots && app.screenshots.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">Captures d'écran</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {app.screenshots.map((screenshot, index) => (
                  <div key={index} className="flex-shrink-0 w-48 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-medium">{app.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Développeur</span>
                <span className="font-medium">{app.developer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Catégorie</span>
                <Badge className="bg-[#f97316] text-white border-0">{app.category}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix</span>
                <span className="font-medium text-green-600">{app.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dernière mise à jour</span>
                <span className="font-medium">
                  {new Date(app.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Avis ({app.reviews_count})</h3>
              <Button variant="ghost" size="sm" className="text-[#f97316]">
                Voir tous
              </Button>
            </div>
            <div className="space-y-3">
              {/* Mock reviews */}
              {[
                { user: 'Amadou D.', rating: 5, comment: 'Très pratique, je l\'utilise tous les jours !', date: 'Il y a 2 jours' },
                { user: 'Fatou S.', rating: 4, comment: 'Bon service mais quelques bugs mineurs.', date: 'Il y a 1 semaine' },
                { user: 'Ibrahim T.', rating: 5, comment: 'Parfait pour mes besoins. Je recommande !', date: 'Il y a 2 semaines' },
              ].map((review, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{review.user}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-3 h-3",
                            i < review.rating ? "fill-[#f97316] text-[#f97316]" : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{review.comment}</p>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
