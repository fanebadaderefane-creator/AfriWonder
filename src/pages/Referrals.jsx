import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Gift, Users, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const REWARD_LABELS = {
  early_supporter: 'Badge Early Supporter',
  visibility_boost: 'Boost visibilité',
  algorithm_priority: 'Priorité algorithme',
  special_badge: 'Badge spécial',
  fast_monetization: 'Accès monétisation rapide',
};

export default function ReferralsPage() {
  const [fallbackCode, setFallbackCode] = useState(null);

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => api.referrals.getStats(),
    retry: 1,
  });

  // Fallback: si stats sans code, essayer getCode() séparément
  useEffect(() => {
    if (!isLoading && !isError && stats && !stats?.code && !fallbackCode) {
      api.referrals.getCode()
        .then((code) => { if (code) setFallbackCode(code); })
        .catch(() => {});
    }
  }, [isLoading, isError, stats, fallbackCode]);

  const displayCode = stats?.code || fallbackCode || '';

  const copyCode = () => {
    navigator.clipboard.writeText(displayCode || '');
    toast.success(displayCode ? 'Code copié!' : 'Code non disponible');
  };

  const shareVia = (platform) => {
    const text = `Rejoins AfriWonder avec mon code: ${displayCode}. Tu peux gagner de l'argent en créant du contenu !`;
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
    };
    window.open(urls[platform], '_blank');
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${displayCode || ''}` : '';

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto p-4 flex flex-col justify-center items-center min-h-[200px] gap-4">
        <p className="text-blue-600">Impossible de charger les statistiques de parrainage.</p>
        <Button onClick={() => refetch()} variant="outline">Réessayer</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto p-4 safe-area-pb"
    >
      <h1 className="text-3xl font-bold mb-2">Programme de parrainage</h1>
      <p className="text-gray-600 mb-8">
        1 invité = badge • 5 = boost • 10 = priorité algo • 20 = badge spécial • 50 = monétisation rapide
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div whileHover={{ y: -5 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Parrainés</p>
                  <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Complétés</p>
                  <p className="text-2xl font-bold">{stats?.completedReferrals || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Récompenses</p>
                  <p className="text-2xl font-bold">{stats?.rewards?.length || 0}</p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Mon code</p>
                  <p className="text-lg font-bold text-blue-600 truncate max-w-[120px]">{displayCode || '-'}</p>
                </div>
                <Gift className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="mb-8 border-blue-200">
        <CardHeader>
          <CardTitle>Mon code de parrainage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Partagez votre code unique. Récompenses en visibilité (pas en argent) selon le nombre d'invités.
          </p>
          <div className="flex gap-2">
            <Input
              value={displayCode}
              readOnly
              placeholder={displayCode ? '' : 'Chargement...'}
              className="text-center font-bold text-lg"
            />
            <Button onClick={copyCode} className="bg-blue-600 hover:bg-blue-700">
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="text-sm" />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Lien copié!'); }}>
              Copier le lien
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Partager via</p>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => shareVia('whatsapp')} variant="outline" className="w-full">WhatsApp</Button>
              <Button onClick={() => shareVia('twitter')} variant="outline" className="w-full">Twitter</Button>
              <Button onClick={() => shareVia('facebook')} variant="outline" className="w-full">Facebook</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats?.rewards?.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Mes récompenses débloquées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.rewards.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">{REWARD_LABELS[r.reward_type] || r.reward_type}</span>
                  <Badge>À partir de {r.invites_count} invités</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mes parrainages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(stats?.referrals?.length ?? 0) === 0 ? (
              <p className="text-center text-gray-600 py-8">Aucun parrainage pour le moment. Commencez à partager!</p>
            ) : (
              (stats?.referrals ?? []).map((referral) => (
                <motion.div
                  key={referral.id}
                  whileHover={{ x: 5 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{referral.referred?.username || referral.referred?.email || 'Utilisateur'}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Badge className={referral.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}>
                    {referral.status}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
