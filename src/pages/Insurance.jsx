import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Heart, Car, Home,
  Plane, Users, FileText, CheckCircle, Clock
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';

const MOCK_POLICIES = [
  { id: 1, type: 'Santé', provider: 'NSIA Assurances', status: 'active', nextPayment: '15 Mars 2027', premium: 5000 },
  { id: 2, type: 'Auto', provider: 'Sunu Assurances', status: 'active', nextPayment: '22 Mars 2027', premium: 15000 },
];

export default function Insurance() {
  const [selectedType, setSelectedType] = useState('health');
  const [myPolicies, setMyPolicies] = useState(MOCK_POLICIES);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.insurance.policies.listMy()
      .then((list) => {
        if (cancelled) return;
        if (Array.isArray(list) && list.length) setMyPolicies(list.map((p) => ({
          id: p.id,
          type: p.policy_type,
          provider: p.provider,
          status: p.status === 'active' ? 'active' : 'pending',
          nextPayment: p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString('fr-FR') : '—',
          premium: p.premium_amount,
        })));
      })
      .catch(() => { if (!cancelled) setMyPolicies(MOCK_POLICIES); })
      .finally(() => { if (!cancelled) setLoadingPolicies(false); });
    return () => { cancelled = true; };
  }, []);

  const insuranceTypes = [
    { id: 'health', name: 'Santé', icon: Heart, color: 'from-red-500 to-pink-500', price: '5,000 FCFA/mois' },
    { id: 'vehicle', name: 'Auto/Moto', icon: Car, color: 'from-blue-500 to-cyan-500', price: '15,000 FCFA/mois' },
    { id: 'property', name: 'Habitation', icon: Home, color: 'from-purple-500 to-indigo-500', price: '8,000 FCFA/mois' },
    { id: 'travel', name: 'Voyage', icon: Plane, color: 'from-green-500 to-teal-500', price: '3,000 FCFA/trajet' },
    { id: 'life', name: 'Vie', icon: Users, color: 'from-orange-500 to-red-500', price: '10,000 FCFA/mois' },
    { id: 'micro', name: 'Micro-assurance', icon: Shield, color: 'from-yellow-500 to-orange-500', price: '1,500 FCFA/mois' },
  ];

  const providers = [
    { id: 1, name: 'NSIA Assurances', logo: '🛡️', rating: 4.7, policies: 12500 },
    { id: 2, name: 'Sunu Assurances', logo: '🏛️', rating: 4.6, policies: 10200 },
    { id: 3, name: 'Allianz', logo: '⚡', rating: 4.8, policies: 15000 },
    { id: 4, name: 'AXA', logo: '🔷', rating: 4.5, policies: 8500 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Assurances</h1>
          <Button variant="ghost" size="icon" className="text-white"><FileText className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="p-4 pb-24 space-y-6">
        {(loadingPolicies || myPolicies.length > 0) && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Mes assurances</h2>
            {loadingPolicies && <p className="text-gray-400 py-2">Chargement...</p>}
            {!loadingPolicies && <div className="space-y-3">
              {myPolicies.map((policy) => (
                <Card key={policy.id} className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">{policy.type}</h3>
                        <p className="text-xs text-gray-400">{policy.provider}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-400/30"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Prochain paiement: {policy.nextPayment}</span>
                      </div>
                      <p className="font-bold text-white">{policy.premium.toLocaleString()} FCFA</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>}
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Types d'assurance</h2>
          <div className="grid grid-cols-2 gap-3">
            {insuranceTypes.map((type) => {
              const Icon = type.icon;
              return (
                <motion.button key={type.id} whileTap={{ scale: 0.95 }} onClick={() => setSelectedType(type.id)} className={`p-4 rounded-xl ${selectedType === type.id ? `bg-gradient-to-br ${type.color} shadow-lg` : 'bg-white/10 hover:bg-white/15'} text-white text-center transition-all border border-white/20`}>
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-semibold mb-1">{type.name}</p>
                  <p className="text-xs opacity-80">{type.price}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader><CardTitle className="text-white">Assurance Santé</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">Couverture incluse:</h3>
              <ul className="space-y-2">
                {['Consultations médicales illimitées', 'Hospitalisation 100%', 'Médicaments remboursés à 80%', 'Analyses et examens', 'Dentaire et optique'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle className="w-4 h-4 text-green-400" />{item}</li>
                ))}
              </ul>
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500">Souscrire maintenant</Button>
          </CardContent>
        </Card>
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Compagnies d'assurance</h2>
          <div className="space-y-3">
            {providers.map((provider) => (
              <motion.div key={provider.id} whileHover={{ scale: 1.02 }} className="p-4 bg-white/10 backdrop-blur-md border-white/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">{provider.logo}</div>
                  <div>
                    <p className="font-semibold text-white">{provider.name}</p>
                    <p className="text-xs text-gray-400">{provider.policies.toLocaleString()} polices actives</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1"><span className="text-yellow-400">⭐</span><span className="text-white font-semibold text-sm">{provider.rating}</span></div>
                  <Button size="sm" variant="outline" className="text-xs">Voir offres</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-400/30">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <h3 className="font-bold text-white mb-2">Déclarer un sinistre</h3>
            <p className="text-sm text-gray-300 mb-4">Besoin d'assistance ? Déclarez votre sinistre en ligne</p>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500">Déclarer un sinistre</Button>
          </CardContent>
        </Card>

        <CommissionNotice vertical="insurance" compact />
      </div>
      <BottomNav />
    </div>
  );
}
