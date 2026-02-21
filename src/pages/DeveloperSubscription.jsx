import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Check, Zap, Crown, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/navigation/BottomNav';
import { DEVELOPER_PLANS } from '@/data/monetizationMock';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function DeveloperSubscription() {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('pro');

  useEffect(() => {
    const getUser = async () => {
      try {
        const { api } = await import('@/api/expressClient');
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        window.location.href = createPageUrl('Home');
      }
    };
    getUser();
  }, []);

  const handleSubscribe = (planId) => {
    // Ici on pourrait appeler l'API pour souscrire
    alert(`Souscription au plan ${DEVELOPER_PLANS[planId].name} - ${DEVELOPER_PLANS[planId].priceDisplay}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const planIcons = {
    starter: <Zap className="w-6 h-6" />,
    pro: <Rocket className="w-6 h-6" />,
    enterprise: <Crown className="w-6 h-6" />,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Abonnements Développeur</h1>
            <p className="text-xs text-gray-500">Choisissez votre plan</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <Card className="bg-[#f97316]/10 border-[#f97316]/30">
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">
              💡 <strong>Pourquoi passer au Plan Pro ?</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>• Commission réduite de 10% à 8%</li>
              <li>• Analytics avancés pour optimiser vos revenus</li>
              <li>• Support prioritaire</li>
              <li>• Retrait quotidien de vos revenus</li>
            </ul>
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="space-y-4">
          {Object.values(DEVELOPER_PLANS).map((plan, index) => {
            const isPopular = plan.id === 'pro';
            const isSelected = selectedPlan === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all",
                    isSelected && "ring-2 ring-[#f97316] shadow-lg",
                    isPopular && "border-[#f97316]"
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          plan.id === 'starter' && "bg-gray-100 text-gray-600",
                          plan.id === 'pro' && "bg-[#f97316] text-white",
                          plan.id === 'enterprise' && "bg-purple-100 text-purple-600"
                        )}>
                          {planIcons[plan.id]}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <p className="text-sm text-gray-500">{plan.priceDisplay}</p>
                        </div>
                      </div>
                      {isPopular && (
                        <Badge className="bg-[#f97316] text-white border-0">Populaire</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-[#f97316]">
                          Commission {(plan.commission_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Vous gardez {((1 - plan.commission_rate) * 100).toFixed(0)}% de chaque transaction
                      </p>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {plan.id === 'starter' ? (
                      <Badge variant="outline" className="w-full justify-center py-2">
                        Plan actuel
                      </Badge>
                    ) : (
                      <Button
                        className={cn(
                          "w-full",
                          isSelected 
                            ? "bg-[#f97316] hover:bg-[#ea580c] text-white" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubscribe(plan.id);
                        }}
                      >
                        {plan.id === 'pro' ? 'Passer au Plan Pro' : 'Contacter pour Enterprise'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Comparaison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparaison des plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Fonctionnalité</th>
                    <th className="text-center py-2">Starter</th>
                    <th className="text-center py-2">Pro</th>
                    <th className="text-center py-2">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Commission</td>
                    <td className="text-center">10%</td>
                    <td className="text-center text-[#f97316] font-bold">8%</td>
                    <td className="text-center text-purple-600 font-bold">5%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Mini-apps</td>
                    <td className="text-center">1</td>
                    <td className="text-center text-[#f97316] font-bold">Illimité</td>
                    <td className="text-center text-purple-600 font-bold">Illimité</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Analytics</td>
                    <td className="text-center">Basique</td>
                    <td className="text-center text-[#f97316] font-bold">Avancé</td>
                    <td className="text-center text-purple-600 font-bold">Premium</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Support</td>
                    <td className="text-center">Email</td>
                    <td className="text-center text-[#f97316] font-bold">Prioritaire</td>
                    <td className="text-center text-purple-600 font-bold">Dédié</td>
                  </tr>
                  <tr>
                    <td className="py-2">Retrait</td>
                    <td className="text-center">Hebdomadaire</td>
                    <td className="text-center text-[#f97316] font-bold">Quotidien</td>
                    <td className="text-center text-purple-600 font-bold">Instantané</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
