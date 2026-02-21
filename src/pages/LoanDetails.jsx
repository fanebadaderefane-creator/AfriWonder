import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';
import { MOCK_LOANS } from '@/data/microcreditMock';

export default function LoanDetails() {
  const [searchParams] = useSearchParams();
  const loanId = searchParams.get('id');
  const [user, setUser] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: async () => {
      try {
        const data = await api.microcredit.getById(loanId);
        if (data) return data;
      } catch (_e) {}
      const mock = MOCK_LOANS.find((l) => l.id === loanId);
      if (mock) {
        const totalToRepay = (mock.amount_requested ?? 0) * (1 + (mock.interest_rate ?? 0) / 100);
        return { ...mock, status: 'active', contributions: [], total_to_repay: Math.round(totalToRepay) };
      }
      return null;
    },
    enabled: !!loanId
  });

  const contributions = loan?.contributions ?? [];

  const queryClient = useQueryClient();
  const contributeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const amount = Number(contributionAmount);
      if (amount < 1000) {
        toast.error('Montant minimum: 1000 FCFA');
        return;
      }
      const phone = window.prompt('Entrez votre numéro Orange Money pour le paiement:');
      if (!phone?.trim()) {
        toast.error('Numéro Orange Money requis');
        return;
      }
      const result = await api.microcredit.contribute(loanId, { amount, phone: phone.trim() });
      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      return result;
    },
    onSuccess: (data) => {
      if (!data?.paymentUrl) {
        queryClient.invalidateQueries(['loan', loanId]);
        setContributionAmount('');
        toast.success('Contribution enregistrée.');
      }
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || e.apiMessage || e.message || 'Erreur');
    },
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!loan) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Prêt introuvable</div>;
  }

  const targetAmount = loan.amount_requested ?? loan.amount ?? 1;
  const progressPercent = ((loan.current_amount ?? 0) / targetAmount) * 100;
  const daysLeft = loan.deadline ? Math.ceil((new Date(loan.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const totalToRepay = loan.amount_requested * (1 + (loan.interest_rate || 0) / 100);
  const monthlyPayment = (totalToRepay / (loan.repayment_period_months || 12)).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">Détails du prêt</h1>
      </div>

      {/* Borrower Info */}
      <div className="bg-white p-4 border-b border-gray-100 flex gap-3">
        <img
          src={loan.borrower_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
          alt={loan.borrower_name}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h2 className="font-bold">{loan.borrower_name}</h2>
          <p className="text-xs text-gray-600">Score: {loan.credit_score}/100</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">{loan.current_amount?.toLocaleString()} / {loan.amount_requested?.toLocaleString()} FCFA</span>
          <span className="text-sm font-bold text-orange-600">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>{loan.lenders_count} contributeurs</span>
          <span>{daysLeft} jours</span>
        </div>
      </div>

      {/* Purpose & Details */}
      <div className="bg-white p-4 border-b border-gray-100">
        <h3 className="font-bold mb-2">Objectif</h3>
        <p className="text-sm text-gray-700 mb-4">{loan.business_plan}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs mb-1">Durée</p>
            <p className="font-bold">{loan.repayment_period_months} mois</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs mb-1">Taux</p>
            <p className="font-bold">{loan.interest_rate}%</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs mb-1">Paiement mensuel</p>
            <p className="font-bold">{monthlyPayment} FCFA</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs mb-1">Total à rembourser</p>
            <p className="font-bold">{loan.total_to_repay?.toLocaleString()} FCFA</p>
          </div>
        </div>
      </div>

      {/* Contributors */}
      <div className="bg-white p-4 border-b border-gray-100">
        <h3 className="font-bold mb-3">Contributeurs ({contributions.length})</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {contributions.map((contrib) => (
            <motion.div
              key={contrib.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
            >
              <span className="font-medium">{contrib.lender_name}</span>
              <span className="text-orange-600 font-bold">{contrib.amount?.toLocaleString()} FCFA</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contribute Form */}
      {loan.status === 'active' && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          <label className="block text-sm font-medium mb-2">Montant à contribuer (FCFA)</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Montant minimum: 1000"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => contributeMutation.mutate()}
              disabled={contributeMutation.isPending || !contributionAmount}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {contributeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

