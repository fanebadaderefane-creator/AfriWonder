import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import offlineCacheService from '@/services/offlineCache.service.js';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheNames, setCacheNames] = useState([]);
  const [downloadsCount, setDownloadsCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const load = async () => {
      if ('caches' in window) {
        const names = await caches.keys();
        setCacheNames(names);
      }
      const list = await offlineCacheService.listCachedDownloads().catch(() => []);
      setDownloadsCount(list.length);
    };
    load();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = () => window.location.reload();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 space-y-6"
    >
      <h1 className="text-3xl font-bold">Mode hors ligne</h1>

      <Card className={isOnline ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {isOnline ? (
              <Wifi className="w-8 h-8 text-green-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-amber-600" />
            )}
            <div className="flex-1">
              <p className="font-bold text-lg">
                {isOnline ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
              </p>
              <p className="text-sm text-gray-700">
                {isOnline
                  ? 'Toutes les fonctionnalités sont disponibles. Les contenus téléchargés restent lisibles hors ligne.'
                  : 'Les contenus déjà téléchargés sont disponibles. Téléchargez des vidéos depuis l’app pour les regarder sans connexion.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOnline && (
        <Card>
          <CardHeader>
            <CardTitle>Connexion revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-3">
              La synchronisation des données se fait automatiquement. Actualisez si besoin.
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser la page
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Contenu disponible hors ligne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Les vidéos que vous téléchargez depuis une lecture (bouton Télécharger) sont enregistrées
            dans le cache et consultables sans connexion. Gérer les téléchargements depuis la page
            <strong> Téléchargements</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {downloadsCount} contenu(s) téléchargé(s)
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {cacheNames.length} cache(s) actif(s)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disponible hors ligne</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: 'Vidéos téléchargées', desc: 'Regardez les vidéos enregistrées en cache' },
            { title: 'Pages en cache', desc: 'Navigation sur les pages déjà visitées' },
            { title: 'Données API récentes', desc: 'Dernières réponses API mises en cache' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
