import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Zap, TrendingUp, Bell, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/navigation/BottomNav';
import { BOOST_OPTIONS } from '@/data/monetizationMock';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AppBoost() {
  const location = useLocation();
  const navigate = useNavigate();
  const _appId = location.state?.appId || 'app-1';
  const [user, setUser] = useState(null);
  const [selectedBoost, setSelectedBoost] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { api } = await import('@/api/expressClient');
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate(createPageUrl('Home'), { replace: true });
      }
    };
    getUser();
  }, [navigate]);

  const handlePurchaseBoost = (boostId) => {
    // Ici on pourrait appeler l'API pour acheter le boost
    alert(`Achat du boost "${BOOST_OPTIONS[boostId].name}" - ${BOOST_OPTIONS[boostId].priceDisplay}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const boostIcons = {
    featured: <TrendingUp className="w-6 h-6" />,
    top_trending: <Zap className="w-6 h-6" />,
    push_notification: <Bell className="w-6 h-6" />,
    search_boost: <Search className="w-6 h-6" />,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Boost ma Mini-App</h1>
            <p className="text-xs text-gray-500">Augmentez votre visibilité</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <Card className="bg-gradient-to-br from-[#f97316]/10 to-[#ea580c]/10 border-[#f97316]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#f97316]" />
              <p className="font-bold text-[#f97316]">Pourquoi booster votre app ?</p>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Augmentez vos installations jusqu'à 300%</li>
              <li>• Apparaissez en premier dans les résultats</li>
              <li>• Touchez plus d'utilisateurs ciblés</li>
              <li>• Maximisez vos revenus</li>
            </ul>
          </CardContent>
        </Card>

        {/* Boost Options */}
        <div className="space-y-3">
          {Object.entries(BOOST_OPTIONS).map(([boostId, boost], index) => (
            <motion.div
              key={boostId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedBoost === boostId && "ring-2 ring-[#f97316]"
                )}
                onClick={() => setSelectedBoost(boostId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-white flex-shrink-0">
                      {boostIcons[boostId]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-lg">{boost.name}</h3>
                        <Badge className="bg-[#f97316] text-white border-0">
                          {boost.priceDisplay}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{boost.description}</p>
                      {boost.duration_days && (
                        <p className="text-xs text-gray-500">
                          Durée: {boost.duration_days} jour{boost.duration_days > 1 ? 's' : ''}
                        </p>
                      )}
                      {boost.price_per_1000 && (
                        <p className="text-xs text-gray-500">
                          Tarification: {boost.priceDisplay} pour 1000 notifications
                        </p>
                      )}
                    </div>
                    {selectedBoost === boostId && (
                      <Check className="w-6 h-6 text-[#f97316] flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Active Boosts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Boosts actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">Aucun boost actif</p>
              <p className="text-xs mt-1">Achetez un boost pour augmenter votre visibilité</p>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Button */}
        {selectedBoost && (
          <Button
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white"
            onClick={() => handlePurchaseBoost(selectedBoost)}
          >
            <Zap className="w-4 h-4 mr-2" />
            Acheter "{BOOST_OPTIONS[selectedBoost].name}" - {BOOST_OPTIONS[selectedBoost].priceDisplay}
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
