import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Share2, Users, Clock, Target,
  MapPin, CheckCircle, TrendingUp, Clock3
} from 'lucide-react';
import { MOCK_CAMPAIGNS } from '@/data/crowdfundingMock';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function CampaignDetails() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [showContributeSheet, setShowContributeSheet] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionMessage, setContributionMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('orange_money');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCampaignId(params.get('id'));
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      try {
        const data = await api.crowdfunding.getById(campaignId);
        if (data) return data;
      } catch (_e) {}
      const mock = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
      if (mock) return { ...mock, contributions: mock.contributions ?? [] };
      return null;
    },
    enabled: !!campaignId
  });

  const contributions = campaign?.contributions ?? [];

  const contributeMutation = useMutation({
    mutationFn: async (data) => {
      const amount = parseFloat(data.amount);
      if (!amount || amount < 100) throw new Error('Montant minimum 100 FCFA');
      const phone = data.phone || window.prompt('Numéro Orange Money pour le paiement:');
      if (!phone?.trim()) throw new Error('Numéro Orange Money requis');
      const result = await api.crowdfunding.contribute(campaignId, {
        amount,
        phone: phone.trim(),
        rewardTier: selectedReward
      });
      if (result?.paymentUrl) window.location.href = result.paymentUrl;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['campaign', campaignId]);
      if (!data?.paymentUrl) {
        toast.success('Merci pour votre contribution ! 🎉');
        setShowContributeSheet(false);
        setContributionAmount('');
        setContributionMessage('');
        setSelectedReward(null);
      }
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || e.apiMessage || e.message || 'Erreur');
    },
  });

  if (isLoading || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-_t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = Math.min(((campaign.current_amount ?? 0) / (campaign.goal_amount ?? 1)) * 100, 100);
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
  const contributorsCount = campaign.backers_count ?? contributions?.length ?? 0;

  const handleContribute = () => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!contributionAmount || parseFloat(contributionAmount) < 100) {
      toast.error('Montant minimum: 100 FCFA');
      return;
    }
    contributeMutation.mutate({
      amount: contributionAmount,
      message: contributionMessage
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Lien copié !');
              }}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative aspect-video">
        <img
          src={campaign.images?.[0] || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800'}
          alt={campaign.title}
          className="w-full h-full object-cover"
        />
        {campaign.is_verified && (
          <Badge className="absolute top-4 right-4 bg-blue-500 text-white border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Vérifié
          </Badge>
        )}
      </div>

      {/* Bandeau : campagne en attente d'approbation admin */}
      {(campaign.status === 'pending' || campaign.status === 'pending_approval') && (
        <div className="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Clock3 className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">En attente de validation</h3>
            <p className="text-sm text-gray-600 mt-1">
              Cette campagne n'est pas encore visible par le public. Un administrateur doit l'approuver avant que les contributeurs puissent participer. Vous serez notifié une fois la validation effectuée.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Title & Creator */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">{campaign.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <img
              src={campaign.creator_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
              alt={campaign.creator_name}
              className="w-8 h-8 rounded-full"
            />
            <span>Par <span className="font-medium">{campaign.creator_name}</span></span>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-3xl font-bold text-orange-600">
                {(campaign.current_amount ?? 0).toLocaleString()} FCFA
              </div>
              <div className="text-sm text-gray-600">
                collectés sur {(campaign.goal_amount ?? 0).toLocaleString()} FCFA
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">{progress.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">de l'objectif</div>
            </div>
          </div>

          <div className="w-full h-3 bg-white rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              <div>
                <div className="font-bold">{contributorsCount}</div>
                <div className="text-xs text-gray-600">contributeurs</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <div className="font-bold">{daysLeft > 0 ? daysLeft : 0}</div>
                <div className="text-xs text-gray-600">jours restants</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => setShowContributeSheet(true)}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-6 rounded-xl mb-6"
          disabled={campaign.status !== 'active' || daysLeft <= 0}
        >
          Contribuer maintenant
        </Button>

        {/* Tabs */}
        <Tabs defaultValue="story" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="story">Histoire</TabsTrigger>
            <TabsTrigger value="rewards">Récompenses</TabsTrigger>
            <TabsTrigger value="updates">Mises à jour</TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="space-y-4">
            {campaign.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{campaign.location}</span>
              </div>
            )}

            <div className="prose prose-sm">
              <p className="text-gray-700 whitespace-pre-line">{campaign.story || campaign.description}</p>
            </div>

            {campaign.benefits?.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-bold text-green-800 mb-2">Impact attendu</h3>
                <ul className="space-y-1">
                  {campaign.benefits.map((benefit, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {campaign.risks && (
              <div className="bg-yellow-50 rounded-xl p-4">
                <h3 className="font-bold text-yellow-800 mb-2">Risques et défis</h3>
                <p className="text-sm text-yellow-700">{campaign.risks}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="space-y-3">
            {campaign.reward_tiers?.length > 0 ? (
              campaign.reward_tiers.map((tier, index) => (
                <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-orange-500 text-lg">
                      {tier.amount.toLocaleString()} FCFA
                    </div>
                    <Badge variant="secondary">{tier.backers} contributeurs</Badge>
                  </div>
                  <h4 className="font-semibold mb-1">{tier.title}</h4>
                  <p className="text-sm text-gray-600">{tier.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Aucune récompense proposée</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="updates" className="space-y-3">
            {campaign.updates?.length > 0 ? (
              campaign.updates.map((update, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(update.date).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                  <h4 className="font-semibold mb-2">{update.title}</h4>
                  <p className="text-sm text-gray-700">{update.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Aucune mise à jour pour le moment</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recent Contributors */}
        <div className="mt-6">
          <h3 className="font-bold mb-3">Contributeurs récents</h3>
          <div className="space-y-2">
            {contributions.slice(0, 5).map((contrib) => (
              <div key={contrib.id} className="flex items-start gap-3 bg-white rounded-xl p-3">
                <img
                  src={contrib.contributor_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                  alt={contrib.contributor_name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="font-medium">{contrib.contributor_name}</div>
                  <div className="text-sm text-orange-500 font-semibold">
                    {contrib.amount.toLocaleString()} FCFA
                  </div>
                  {contrib.message && (
                    <p className="text-sm text-gray-600 mt-1">{contrib.message}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(contrib.created_date).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contribute Sheet */}
      <Sheet open={showContributeSheet} onOpenChange={setShowContributeSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Contribuer au projet</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {/* Quick amounts */}
            <div>
              <Label>Montant rapide</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[1000, 5000, 10000, 25000, 50000, 100000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setContributionAmount(amount.toString())}
                    className={cn(
                      "py-3 rounded-xl border-2 font-semibold transition-colors",
                      contributionAmount === amount.toString()
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {(amount / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <Label>Montant personnalisé</Label>
              <Input
                type="number"
                placeholder="Entrer le montant"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Rewards */}
            {campaign.reward_tiers?.length > 0 && (
              <div>
                <Label>Choisir une récompense (optionnel)</Label>
                <div className="space-y-2 mt-2">
                  {campaign.reward_tiers.map((tier, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedReward(tier.amount);
                        setContributionAmount(tier.amount.toString());
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border-2 transition-colors",
                        selectedReward === tier.amount
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200"
                      )}
                    >
                      <div className="font-bold text-orange-500">{tier.amount.toLocaleString()} FCFA</div>
                      <div className="text-sm font-medium">{tier.title}</div>
                      <div className="text-xs text-gray-600">{tier.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <Label>Message de soutien (optionnel)</Label>
              <Textarea
                placeholder="Partagez pourquoi vous soutenez ce projet..."
                value={contributionMessage}
                onChange={(e) => setContributionMessage(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Anonymous */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous" className="text-sm">
                Contribuer anonymement
              </Label>
            </div>

            {/* Payment method */}
            <div>
              <Label>Mode de paiement</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { id: 'orange_money', label: 'Orange Money', icon: '🟠' },
                  { id: 'wave', label: 'Wave', icon: '🌊' },
                  { id: 'mtn_money', label: 'MTN Money', icon: '🟡' },
                  { id: 'moov_money', label: 'Moov Money', icon: '🔵' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "py-3 rounded-xl border-2 font-medium transition-colors",
                      paymentMethod === method.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200"
                    )}
                  >
                    <div>{method.icon}</div>
                    <div className="text-sm">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleContribute}
              disabled={contributeMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 py-6"
            >
              {contributeMutation.isPending ? 'Traitement...' : `Contribuer ${contributionAmount ? parseFloat(contributionAmount).toLocaleString() + ' FCFA' : ''}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

