import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Shield,
  ShoppingCart,
  CreditCard,
  Mic,
  DollarSign,
  Settings,
  Eye,
  FileText,
  Zap,
  Activity,
} from 'lucide-react';

export default function AIEnginePanel() {
  const [stats, setStats] = useState(null);
  const [features, setFeatures] = useState([]);
  const [models, setModels] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, featuresRes, modelsRes] = await Promise.all([
        api.admin.getAIEngineStats(),
        api.admin.getAIFeatures(),
        api.admin.getAIModels(),
      ]);

      setStats(statsRes.data || statsRes);
      setFeatures(featuresRes.data || featuresRes);
      setModels(modelsRes.data || modelsRes);
    } catch (error) {
      console.error('Error loading AI Engine data:', error);
      // Fallback mock data
      setStats({
        totalPredictions: 15800000,
        avgPrecision: 91.3,
        avgLatency: 45,
        totalModels: 12,
        totalRecommendations: 0,
      });
      setFeatures([
        {
          id: 'product_recommendation',
          name: 'Product Recommendation',
          icon: 'shopping-cart',
          description: 'Recommandations personnalisées basées sur historique et préférences',
          status: 'active',
          precision: 94,
        },
        {
          id: 'ad_optimization',
          name: 'Ad Optimization',
          icon: 'trending-up',
          description: 'Optimisation automatique des publicités pour meilleur ROI',
          status: 'active',
          precision: 89,
        },
        {
          id: 'microcredit_scoring',
          name: 'Microcredit Scoring',
          icon: 'credit-card',
          description: 'Score de crédit basé sur comportement transactionnel',
          status: 'active',
          precision: 91,
        },
        {
          id: 'fraud_detection',
          name: 'Fraud Detection',
          icon: 'shield',
          description: 'Détection temps réel des transactions suspectes',
          status: 'active',
          precision: 97,
        },
        {
          id: 'live_moderation',
          name: 'Live Moderation',
          icon: 'mic',
          description: 'Modération automatique du contenu live',
          status: 'active',
          precision: 85,
        },
        {
          id: 'dynamic_pricing',
          name: 'Dynamic Pricing',
          icon: 'dollar-sign',
          description: 'Ajustement dynamique des prix selon demande et concurrence',
          status: 'beta',
          precision: 82,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getIcon = (iconName) => {
    const icons = {
      'shopping-cart': ShoppingCart,
      'trending-up': TrendingUp,
      'credit-card': CreditCard,
      shield: Shield,
      mic: Mic,
      'dollar-sign': DollarSign,
    };
    const Icon = icons[iconName] || Brain;
    return <Icon className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-white/10 rounded-xl"></div>
          <div className="h-64 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AfriWonder AI</h2>
              <p className="text-white/70">Moteur d'intelligence central</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
            <Activity className="w-3 h-3 mr-1" />
            Système Actif
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
            <p className="text-white/60 text-sm mb-1">Prédictions</p>
            <p className="text-2xl font-bold text-white">{formatNumber(stats?.totalPredictions || 0)}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
            <p className="text-white/60 text-sm mb-1">Précision</p>
            <p className="text-2xl font-bold text-white">{stats?.avgPrecision || 0}%</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
            <p className="text-white/60 text-sm mb-1">Latence</p>
            <p className="text-2xl font-bold text-white">{stats?.avgLatency || 0}ms</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
            <p className="text-white/60 text-sm mb-1">Modèles</p>
            <p className="text-2xl font-bold text-white">{stats?.totalModels || 0}</p>
          </div>
        </div>
      </div>

      {/* AI Powered Banner */}
      <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-white/10">
        <div className="p-4 flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-white font-semibold">AI Powered</p>
            <p className="text-white/70 text-sm">
              Recommandations, scoring, détection fraude - Tout est optimisé par l'IA
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600/30">
            <Eye className="w-4 h-4 mr-2" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="data-[state=active]:bg-purple-600/30">
            <TrendingUp className="w-4 h-4 mr-2" />
            Recommandations
          </TabsTrigger>
          <TabsTrigger value="scoring" className="data-[state=active]:bg-purple-600/30">
            <CreditCard className="w-4 h-4 mr-2" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="fraud" className="data-[state=active]:bg-purple-600/30">
            <Shield className="w-4 h-4 mr-2" />
            Fraude
          </TabsTrigger>
          <TabsTrigger value="moderation" className="data-[state=active]:bg-purple-600/30">
            <Shield className="w-4 h-4 mr-2" />
            Modération
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Fonctionnalités IA */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Fonctionnalités IA</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <Card
                  key={feature.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          {getIcon(feature.icon)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{feature.name}</h4>
                          <Badge
                            className={`mt-1 ${
                              feature.status === 'active'
                                ? 'bg-green-500/20 text-green-300 border-green-500/50'
                                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                            }`}
                          >
                            {feature.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm mb-3">{feature.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">Précision</span>
                      <span className="text-white font-semibold">{feature.precision}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${feature.precision}%` }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Recommandations récentes</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Scores de crédit</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Détections de fraude</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 text-center text-white/60">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Modération automatique</p>
              <p className="text-sm mt-2">Fonctionnalité en développement</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          <Eye className="w-4 h-4 mr-2" />
          Voir mes recommandations
        </Button>
        <Button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
          <FileText className="w-4 h-4 mr-2" />
          Mon score de crédit
        </Button>
      </div>
    </div>
  );
}
