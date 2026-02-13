import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Megaphone, Check, X, Loader2, Eye, Image } from 'lucide-react';
import { toast } from 'sonner';

export default function AdsCampaignsPanel() {
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState({});

  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-ads-pending'],
    queryFn: () => api.ads.getPendingCampaigns(),
  });

  const approveMutation = useMutation({
    mutationFn: (campaignId) => api.ads.approveCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads-pending'] });
      toast.success('Campagne approuvée');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ campaignId, reason }) => api.ads.rejectCampaign(campaignId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads-pending'] });
      toast.success('Campagne rejetée');
      setRejectReason({});
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Megaphone className="w-5 h-5" />
          Campagnes publicitaires en attente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <p className="text-white/70">Aucune campagne en attente de validation</p>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{campaign.name}</h4>
                    <p className="text-white/60 text-sm">
                      {campaign.advertiser?.username || campaign.advertiser?.email} · {campaign.price_fcfa?.toLocaleString()} FCFA · {campaign.duration_days} jours
                    </p>
                    {campaign.creatives?.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {campaign.creatives.map((c) => (
                          <div key={c.id} className="flex items-center gap-1 text-white/70 text-sm">
                            {c.media_type === 'video' ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <Image className="w-4 h-4" />
                            )}
                            <span>{c.title || c.media_type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      placeholder="Raison rejet (optionnel)"
                      value={rejectReason[campaign.id] || ''}
                      onChange={(e) =>
                        setRejectReason((prev) => ({ ...prev, [campaign.id]: e.target.value }))
                      }
                      className="w-full sm:w-40 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-400 text-red-400 hover:bg-red-500/20"
                        disabled={rejectMutation.isPending}
                        onClick={() =>
                          rejectMutation.mutate({
                            campaignId: campaign.id,
                            reason: rejectReason[campaign.id],
                          })
                        }
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(campaign.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
