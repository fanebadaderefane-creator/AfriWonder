import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, DollarSign, TrendingUp, BarChart3, Download, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BottomNav from '@/components/navigation/BottomNav';
import { MOCK_REVENUE_DATA, MOCK_TRANSACTIONS, COMMISSION_RATES } from '@/data/monetizationMock';
import { motion } from 'framer-motion';

export default function DeveloperRevenue() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // day, week, month, year
  const [selectedApp, setSelectedApp] = useState('all');

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

  // Calculer les stats depuis les transactions mockées
  const totalEarnings = MOCK_TRANSACTIONS.reduce((sum, txn) => sum + txn.developer_amount, 0);
  const totalCommission = MOCK_TRANSACTIONS.reduce((sum, txn) => sum + txn.commission_amount, 0);
  const totalGMV = MOCK_TRANSACTIONS.reduce((sum, txn) => sum + txn.amount, 0);
  const transactionCount = MOCK_TRANSACTIONS.length;

  const filteredTransactions = selectedApp === 'all' 
    ? MOCK_TRANSACTIONS 
    : MOCK_TRANSACTIONS.filter(txn => txn.app_id === selectedApp);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
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
            <h1 className="text-xl font-bold">Mes Revenus</h1>
            <p className="text-xs text-gray-500">Suivez vos gains et commissions</p>
          </div>
          <Link to={createPageUrl('DeveloperConsole')}>
            <Button size="sm" variant="outline">
              Console
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-700">
                  {totalEarnings.toLocaleString()} XOF
                </span>
              </div>
              <p className="text-xs text-gray-600">Revenus développeur</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#f97316]/10 to-[#ea580c]/10 border-[#f97316]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-[#f97316]" />
                <span className="text-2xl font-bold text-[#f97316]">
                  {totalGMV.toLocaleString()} XOF
                </span>
              </div>
              <p className="text-xs text-gray-600">GMV total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-2xl font-bold text-gray-900">
                  {totalCommission.toLocaleString()} XOF
                </span>
              </div>
              <p className="text-xs text-gray-600">Commission plateforme</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="text-2xl font-bold text-gray-900">
                  {transactionCount}
                </span>
              </div>
              <p className="text-xs text-gray-600">Transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedApp} onValueChange={setSelectedApp}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Toutes les apps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les apps</SelectItem>
              <SelectItem value="mini-app-8">Banque Mobile Mali</SelectItem>
              <SelectItem value="mini-app-1">Taxi Mali Express</SelectItem>
              <SelectItem value="mini-app-6">Boutique WhatsApp Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Graphique de revenus (simplifié) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Évolution des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day, index) => {
                const height = Math.random() * 60 + 20;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-[#f97316] to-[#ea580c] rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500">J{day}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Apps par revenus */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Apps par revenus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_REVENUE_DATA.top_earning_apps.map((app, index) => (
              <div key={app.app_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f97316] flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{app.app_name}</p>
                    <p className="text-xs text-gray-500">
                      GMV: {app.gmv.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {app.developer_earnings.toLocaleString()} XOF
                  </p>
                  <p className="text-xs text-gray-500">
                    Commission: {app.commission.toLocaleString()} XOF
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Historique des transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Historique des transactions</CardTitle>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Exporter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTransactions.map((txn) => (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-gray-100 pb-3 last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm">{txn.app_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +{txn.developer_amount.toLocaleString()} XOF
                      </p>
                      <p className="text-xs text-gray-500">
                        Commission {(txn.commission_rate * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">
                      Transaction: {txn.amount.toLocaleString()} XOF
                    </span>
                    <span className="text-[#f97316]">
                      -{txn.commission_amount.toLocaleString()} XOF commission
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bouton Retrait */}
        <Button className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white">
          <DollarSign className="w-4 h-4 mr-2" />
          Retirer mes revenus
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
