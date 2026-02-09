import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Gift, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const [_referralCode, _setReferralCode] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const user = await api.auth.me();
      const referrals = await api.entities.Referral.filter({
        referrer_id: user.id
      });

      const completed = referrals.filter(r => r.status === 'completed').length;
      const totalReward = referrals
        .filter(r => r.referrer_reward_claimed)
        .reduce((sum, r) => sum + (r.referral_reward || 0), 0);

      return {
        code: referrals[0]?.referral_code || 'AFRIWONDER' + user.id.slice(0, 6).toUpperCase(),
        totalReferrals: referrals.length,
        completedReferrals: completed,
        pendingReferrals: referrals.filter(r => r.status === 'pending').length,
        totalReward,
        referrals: referrals.slice(0, 10)
      };
    }
  });

  const copyCode = () => {
    navigator.clipboard.writeText(stats?.code || '');
    toast.success('Code copié!');
  };

  const shareVia = (platform) => {
    const text = `Rejoins AfriWonder avec mon code: ${stats?.code}`;
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`
    };
    window.open(urls[platform], '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto p-4 safe-area-pb"
    >
      <h1 className="text-3xl font-bold mb-8">Programme de parrainage</h1>

      {/* Stats */}
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
                  <p className="text-xs text-gray-600">Complé_tés</p>
                  <p className="text-2xl font-bold">{stats?.completedReferrals || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">En attente</p>
                  <p className="text-2xl font-bold">{stats?.pendingReferrals || 0}</p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Récompense totale</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(stats?.totalReward || 0).toLocaleString()} XOF
                  </p>
                </div>
                <Gift className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Referral Code */}
      <Card className="mb-8 border-orange-200">
        <CardHeader>
          <CardTitle>Mon code de parrainage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Partagez votre code unique pour gagner une récompense à chaque fois qu'un ami rejoint!
          </p>
          
          <div className="flex gap-2">
            <Input
              value={stats?.code || ''}
              readOnly
              className="text-center font-bold text-lg"
            />
            <Button
              onClick={copyCode}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Partager via</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => shareVia('whatsapp')}
                variant="outline"
                className="w-full"
              >
                WhatsApp
              </Button>
              <Button
                onClick={() => shareVia('twitter')}
                variant="outline"
                className="w-full"
              >
                Twitter
              </Button>
              <Button
                onClick={() => shareVia('facebook')}
                variant="outline"
                className="w-full"
              >
                Facebook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Mes parrainages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.referrals?.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                Aucun parrainage pour le moment. Commencez à partager!
              </p>
            ) : (
              stats?.referrals.map(referral => (
                <motion.div
                  key={referral.id}
                  whileHover={{ x: 5 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{referral.referred_email}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(referral.referred_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        referral.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {referral.status}
                    </Badge>
                    {referral.status === 'completed' && (
                      <p className="text-sm font-bold text-green-600 mt-1">
                        +{referral.referral_reward.toLocaleString()} XOF
                      </p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

