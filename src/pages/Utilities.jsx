import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Smartphone, Zap, Droplet, Wifi,
  Tv, DollarSign, Clock, CheckCircle
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'Recharge Orange', amount: 5000, date: '10 min', status: 'completed' },
  { id: 2, type: 'Facture SENELEC', amount: 15000, date: '2 heures', status: 'completed' },
  { id: 3, type: 'Internet MTN', amount: 10000, date: 'Hier', status: 'pending' },
];

export default function Utilities() {
  const [selectedService, setSelectedService] = useState('airtime');
  const [recentTransactions, setRecentTransactions] = useState(MOCK_TRANSACTIONS);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.utilities.airtime.listMy({ limit: 5 }),
      api.utilities.bills.listMy({ limit: 5 }),
    ]).then(([air, bills]) => {
      if (cancelled) return;
      const a = (air?.recharges ?? []).map((r, i) => ({ id: r.id || `a-${i}`, type: `Recharge ${r.operator}`, amount: r.amount, date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '—', status: r.status === 'completed' ? 'completed' : 'pending' }));
      const b = (bills?.payments ?? []).map((r, i) => ({ id: r.id || `b-${i}`, type: `${r.bill_type} - ${r.provider}`, amount: r.amount, date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '—', status: r.status === 'completed' ? 'completed' : 'pending' }));
      const combined = [...a, ...b].sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 10);
      if (combined.length) setRecentTransactions(combined);
    }).catch(() => { if (!cancelled) setRecentTransactions(MOCK_TRANSACTIONS); }).finally(() => { if (!cancelled) setLoadingTx(false); });
    return () => { cancelled = true; };
  }, []);

  const services = [
    { id: 'airtime', name: 'Recharge téléphone', icon: Smartphone, color: 'from-blue-500 to-purple-500', desc: 'Orange, MTN, Moov, Airtel' },
    { id: 'electricity', name: 'Électricité', icon: Zap, color: 'from-yellow-500 to-orange-500', desc: 'SENELEC, CIE, SBEE' },
    { id: 'water', name: 'Eau', icon: Droplet, color: 'from-cyan-500 to-blue-500', desc: 'SDE, SODECI, SONEB' },
    { id: 'internet', name: 'Internet', icon: Wifi, color: 'from-purple-500 to-pink-500', desc: 'Orange, MTN, Free' },
    { id: 'tv', name: 'TV/Abonnements', icon: Tv, color: 'from-red-500 to-pink-500', desc: 'Canal+, StarTimes' },
  ];

  const operators = {
    airtime: [
      { name: 'Orange', logo: '🟠', bonus: '+10%' },
      { name: 'MTN', logo: '🟡', bonus: '+5%' },
      { name: 'Moov', logo: '🔵', bonus: '+8%' },
      { name: 'Airtel', logo: '🔴', bonus: '+7%' },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Services & Factures</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Clock className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-gray-300">Économisé ce mois</p>
              <p className="text-xl font-bold text-white">2,500 FCFA</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-gray-300">Transactions</p>
              <p className="text-xl font-bold text-white">24</p>
            </CardContent>
          </Card>
        </div>

        {/* Services */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Choisissez un service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <motion.button
                  key={service.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                    selectedService === service.id
                      ? `bg-gradient-to-r ${service.color} shadow-lg`
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedService === service.id ? 'bg-white/20' : 'bg-white/10'
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{service.name}</p>
                      <p className="text-xs text-gray-300">{service.desc}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </CardContent>
        </Card>

        {/* Operators (for airtime) */}
        {selectedService === 'airtime' && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Opérateurs disponibles</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {operators.airtime.map((operator, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center border border-white/10"
                >
                  <div className="text-4xl mb-2">{operator.logo}</div>
                  <p className="font-semibold text-white mb-1">{operator.name}</p>
                  <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                    Bonus {operator.bonus}
                  </Badge>
                </motion.button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Amount Input */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Numéro de téléphone</label>
              <input
                type="tel"
                placeholder="+221 XX XXX XX XX"
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Montant (FCFA)</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1000, 2000, 5000, 10000, 15000, 20000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    {amount.toLocaleString()}
                  </Button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Ou entrez un montant"
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 outline-none focus:border-blue-400"
              />
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              Recharger maintenant
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingTx && <p className="text-center text-gray-400 py-2">Chargement...</p>}
            {!loadingTx && recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.status === 'completed' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <CheckCircle className={`w-5 h-5 ${
                      transaction.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{transaction.type}</p>
                    <p className="text-xs text-gray-400">{transaction.date}</p>
                  </div>
                </div>
                <p className="font-bold text-white">{transaction.amount.toLocaleString()} FCFA</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <CommissionNotice vertical="bills" compact />
          <CommissionNotice vertical="airtime" compact />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
