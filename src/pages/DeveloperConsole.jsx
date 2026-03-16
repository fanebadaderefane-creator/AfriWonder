import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Code, BarChart3, DollarSign, Settings, FileCode, Upload, CheckCircle, Clock, XCircle, TrendingUp, Zap, Rocket, Megaphone, GitBranch, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/navigation/BottomNav';
import { motion } from 'framer-motion';
import { DEVELOPER_PLANS, MOCK_REVENUE_DATA } from '@/data/monetizationMock';

export default function DeveloperConsole() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const getUser = async () => {
      try {
        const { api } = await import('@/api/expressClient');
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        // Redirect to home if not authenticated
        navigate(createPageUrl('Home'), { replace: true });
      }
    };
    getUser();
  }, [navigate]);

  // Mock data
  const mockApps = [
    {
      id: 'app-1',
      name: 'Mon App Test',
      status: 'published',
      version: '1.0.0',
      installs: 1250,
      revenue: 45000,
      lastUpdate: '2025-02-15',
    },
    {
      id: 'app-2',
      name: 'App en attente',
      status: 'pending',
      version: '0.1.0',
      installs: 0,
      revenue: 0,
      lastUpdate: '2025-02-18',
    },
  ];

  const [currentPlan, setCurrentPlan] = useState('starter'); // starter, pro, enterprise

  const stats = {
    totalApps: 2,
    publishedApps: 1,
    pendingApps: 1,
    totalInstalls: 1250,
    totalRevenue: MOCK_REVENUE_DATA.top_earning_apps.reduce((sum, app) => sum + app.developer_earnings, 0),
    monthlyRevenue: 120000,
    totalGMV: MOCK_REVENUE_DATA.top_earning_apps.reduce((sum, app) => sum + app.gmv, 0),
  };

  const getStatusBadge = (status) => {
    const badges = {
      published: <Badge className="bg-green-500 text-white border-0">Publié</Badge>,
      pending: <Badge className="bg-yellow-500 text-white border-0">En attente</Badge>,
      rejected: <Badge className="bg-red-500 text-white border-0">Rejeté</Badge>,
      draft: <Badge className="bg-gray-500 text-white border-0">Brouillon</Badge>,
    };
    return badges[status] || badges.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      published: <CheckCircle className="w-5 h-5 text-green-500" />,
      pending: <Clock className="w-5 h-5 text-yellow-500" />,
      rejected: <XCircle className="w-5 h-5 text-red-500" />,
      draft: <FileCode className="w-5 h-5 text-gray-500" />,
    };
    return icons[status] || icons.draft;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Console Développeur</h1>
            <p className="text-xs text-gray-500">Gérez vos mini-apps</p>
          </div>
          <Link to={createPageUrl('MiniAppsStore')}>
            <Button size="sm" variant="outline">
              Store
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Plan Actuel */}
        <Card className="bg-gradient-to-br from-[#2563eb]/10 to-[#1d4ed8]/10 border-[#2563eb]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Plan actuel</p>
                <p className="text-lg font-bold text-[#2563eb]">
                  {DEVELOPER_PLANS[currentPlan].name}
                </p>
              </div>
              <Badge className="bg-[#2563eb] text-white border-0">
                Commission {(DEVELOPER_PLANS[currentPlan].commission_rate * 100).toFixed(0)}%
              </Badge>
            </div>
            {currentPlan === 'starter' && (
              <Link to={createPageUrl('DeveloperSubscription')}>
                <Button size="sm" className="w-full mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Passer au Plan Pro
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Code className="w-5 h-5 text-[#2563eb]" />
                <span className="text-2xl font-bold">{stats.totalApps}</span>
              </div>
              <p className="text-xs text-gray-600">Mini-Apps</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-[#2563eb]" />
                <span className="text-2xl font-bold">{stats.totalInstalls.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-600">Installations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} XOF</span>
              </div>
              <p className="text-xs text-gray-600">Revenus totaux</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-[#2563eb]" />
                <span className="text-2xl font-bold">{stats.totalGMV.toLocaleString()} XOF</span>
              </div>
              <p className="text-xs text-gray-600">GMV total</p>
            </CardContent>
          </Card>
        </div>

        {/* Lien vers Revenus */}
        <Link to={createPageUrl('DeveloperRevenue')}>
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-700">Mes Revenus</p>
                  <p className="text-sm text-gray-600">Consultez vos gains détaillés</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Create App Button */}
        <Button
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          onClick={() => {
            // Ici on pourrait ouvrir un modal ou rediriger vers une page de création
            alert('Fonctionnalité de création à venir');
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer une nouvelle Mini-App
        </Button>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="apps">Mes Apps</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vue d'ensemble</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Apps publiées</span>
                  <span className="font-bold text-[#2563eb]">{stats.publishedApps}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">En attente de validation</span>
                  <span className="font-bold text-yellow-500">{stats.pendingApps}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Revenus ce mois</span>
                  <span className="font-bold text-green-600">{stats.monthlyRevenue.toLocaleString()} XOF</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">Taux commission</span>
                  <span className="font-bold text-[#2563eb]">
                    {(DEVELOPER_PLANS[currentPlan].commission_rate * 100).toFixed(0)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documentation SDK</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Intégrez le SDK AfriWonder dans votre mini-app pour accéder aux fonctionnalités de la plateforme.
                </p>
                <Button variant="outline" className="w-full">
                  <FileCode className="w-4 h-4 mr-2" />
                  Voir la documentation
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl('DeveloperRevenue')}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">Mes Revenus</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl('DeveloperSubscription')}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-[#2563eb]/10 to-[#1d4ed8]/10 border-[#2563eb]/30">
                  <CardContent className="p-4 text-center">
                    <Rocket className="w-6 h-6 text-[#2563eb] mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">Abonnements</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </TabsContent>

          {/* Apps Tab */}
          <TabsContent value="apps" className="space-y-4 mt-4">
            {mockApps.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{app.name}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-xs text-gray-500">Version {app.version}</p>
                      </div>
                      {getStatusIcon(app.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Installations</p>
                        <p className="font-bold text-[#2563eb]">{app.installs.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Revenus</p>
                        <p className="font-bold text-green-600">{app.revenue.toLocaleString()} XOF</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={createPageUrl('AppBoost')} state={{ appId: app.id }}>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Zap className="w-4 h-4 mr-1" />
                          Boost
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="flex-1">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Analytics
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        Paramètres
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* CPO 8.26 — Boost / visibilité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-purple-500" />
                  Boost visibilité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Mettez en avant une mini-app dans le Store pendant une période donnée (home du MiniAppsStore, carrousel « En vedette »).
                </p>
                {mockApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-sm">{app.name}</p>
                      <p className="text-xs text-gray-500">
                        Statut&nbsp;: {getStatusBadge(app.status)} • Version {app.version}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        alert(`Demande de boost envoyée pour ${app.name} (mock).`);
                      }}
                    >
                      <Rocket className="w-4 h-4 mr-1" />
                      Booster
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CPO 8.27–8.28 — Versions & mises à jour */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-500" />
                  Versions & mises à jour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Historique des versions publiées, en revue ou en brouillon pour chaque mini-app.
                </p>
                {mockApps.map((app) => (
                  <div key={app.id} className="border rounded-lg px-3 py-2 space-y-1">
                    <p className="font-medium text-sm">{app.name}</p>
                    <p className="text-xs text-gray-500">
                      Dernière version&nbsp;: {app.version} • Dernière mise à jour&nbsp;: {app.lastUpdate}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alert(`Ouverture du journal des versions pour ${app.name} (mock).`)}
                    >
                      <FileCode className="w-4 h-4 mr-1" />
                      Voir le journal des versions
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CPO 8.30 — Support technique mini-apps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-emerald-500" />
                  Support technique mini-apps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Ouvrez un ticket dédié pour un bug, une question d’API ou une revue de sécurité sur vos mini-apps AfriWonder.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    window.location.href = 'mailto:dev-support@afriwonder.com?subject=Support%20mini-app%20AfriWonder';
                  }}
                >
                  Contacter le support développeur
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compte développeur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom du développeur</label>
                  <p className="text-sm text-gray-600 mt-1">{user?.full_name || 'Non défini'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-600 mt-1">{user?.email || 'Non défini'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Statut vérification</label>
                  <div className="mt-1">
                    <Badge className="bg-yellow-500 text-white border-0">En attente</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Plan actuel</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="bg-[#2563eb] text-white border-0">
                      {DEVELOPER_PLANS[currentPlan].name}
                    </Badge>
                    <Link to={createPageUrl('DeveloperSubscription')}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Changer
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clé API</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Utilisez votre clé API pour authentifier les requêtes de votre mini-app.
                </p>
                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                  <code className="text-xs text-gray-700">afw_sk_live_••••••••••••••••</code>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Régénérer la clé
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
