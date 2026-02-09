import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, Users, TrendingUp, Clock, Target, Plus, Brain
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import BottomNav from '../components/navigation/BottomNav';
const purposes = [
  { id: 'all', label: 'Tous', icon: '💰' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'urgence', label: 'Urgence', icon: '🚨' },
  { id: 'equipement', label: 'Équipement', icon: '🔧' }
];

export default function Microcredit() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: loansData, isLoading } = useQuery({
    queryKey: ['loans', selectedPurpose, sortBy],
    queryFn: async () => {
      const res = await api.microcredit.list({ status: 'active', limit: 100 });
      let allLoans = res?.loans ?? res?.data?.loans ?? (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
      
      if (selectedPurpose !== 'all') {
        allLoans = allLoans.filter(l => l.purpose === selectedPurpose);
      }
      
      if (sortBy === 'credit_score') {
        allLoans = [...allLoans].sort((a, b) => (b.credit_score ?? 0) - (a.credit_score ?? 0));
      } else if (sortBy === 'ending_soon') {
        allLoans = [...allLoans].sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
      } else if (sortBy === 'newest') {
        allLoans = [...allLoans].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
      
      return allLoans;
    }
  });

  const loans = Array.isArray(loansData) ? loansData : (loansData?.loans ?? []);

  const filteredLoans = loans.filter(l => 
    l.business_plan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.borrower_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressPercentage = (current, goal) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getDaysRemaining = (deadline) => {
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Microcrédit</h1>
          {user && (
            <Link to={createPageUrl('RequestLoan')} className="ml-auto">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-1" />
                Demander
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {purposes.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedPurpose(cat.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-w-20",
                selectedPurpose === cat.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <span className="text-lg">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">✨ Plus récents</SelectItem>
            <SelectItem value="credit_score">⭐ Meilleur score</SelectItem>
            <SelectItem value="ending_soon">⏰ Fin proche</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <div className="flex items-start gap-3">
          <Brain className="w-8 h-8 flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-1">🤖 Scoring AI avancé</h3>
            <p className="text-sm text-white/90">
              Analyse intelligente des profils. Taux de remboursement: 95%
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-orange-500">{loans.length}</div>
          <div className="text-xs text-gray-600">Projets actifs</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-500">
            {loans.reduce((acc, l) => acc + l.lenders_count, 0)}
          </div>
          <div className="text-xs text-gray-600">Prêteurs</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-500">5%</div>
          <div className="text-xs text-gray-600">Taux moyen</div>
        </div>
      </div>

      {/* Loans List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun projet trouvé</p>
          </div>
        ) : (
          filteredLoans.map((loan) => {
            const progress = getProgressPercentage(loan.current_amount, loan.amount_requested);
            const daysLeft = getDaysRemaining(loan.deadline);
            
            return (
              <Link
                key={loan.id}
                to={`${createPageUrl('LoanDetails')}?id=${loan.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Borrower */}
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src={loan.borrower_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                      alt={loan.borrower_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{loan.borrower_name}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {purposes.find(p => p.id === loan.purpose)?.icon} {purposes.find(p => p.id === loan.purpose)?.label}
                        </Badge>
                        {loan.credit_score && (
                          <Badge 
                            className={`text-xs text-white ${
                              loan.credit_score >= 75 ? 'bg-green-500' :
                              loan.credit_score >= 60 ? 'bg-yellow-500' :
                              'bg-orange-500'
                            }`}
                          >
                            {loan.credit_score >= 75 ? '✅' : loan.credit_score >= 60 ? '⚠️' : '❌'} {loan.credit_score}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business Plan */}
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{loan.business_plan}</p>

                  {/* Amount */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-orange-500">
                        {loan.current_amount.toLocaleString()} FCFA
                      </span>
                      <span className="text-gray-500">
                        sur {loan.amount_requested.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{loan.lenders_count} prêteurs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>{loan.interest_rate}% intérêt</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{loan.repayment_period_months} mois</span>
                    </div>
                  </div>

                  {daysLeft > 0 && daysLeft <= 7 && (
                    <div className="mt-2 text-xs text-red-500 font-medium">
                      ⏰ Plus que {daysLeft} jours
                    </div>
                  )}
                </motion.div>
              </Link>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}

