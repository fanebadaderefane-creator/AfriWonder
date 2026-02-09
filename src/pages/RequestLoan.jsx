import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function RequestLoan() {
  const [user, setUser] = useState(null);
  const [loanData, setLoanData] = useState({
    amount_requested: 0,
    purpose: 'business',
    business_plan: '',
    repayment_period_months: 12,
    interest_rate: 5,
    collateral: '',
    deadline: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        window.location.href = '/';
      }
    };
    getUser();
  }, []);

  const requestLoanMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous d\'abord');
        return;
      }
      return await api.microcredit.createRequest({
        amount: loanData.amount_requested,
        purpose: loanData.purpose,
        repaymentPeriod: loanData.repayment_period_months,
        interestRate: loanData.interest_rate,
        business_plan: loanData.business_plan || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Demande envoyée! Elle sera visible par les prêteurs.');
      setTimeout(() => {
        window.location.href = '/Microcredit';
      }, 1500);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error?.message || e.apiMessage || e.message || 'Erreur');
    },
  });

  const monthlyPayment = loanData.amount_requested / loanData.repayment_period_months;
  const totalToRepay = loanData.amount_requested * (1 + loanData.interest_rate / 100);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Demander un prêt</h1>
      </div>

      {/* Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4 rounded">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Besoin de financement?</p>
            <p className="text-blue-700 text-xs mt-1">Remplissez ce formulaire pour accéder à des microcrédits d'autres utilisateurs.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Loan Amount */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Montant du prêt</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Montant souhaité (FCFA) *</label>
            <Input
              type="number"
              placeholder="Ex: 500000"
              value={loanData.amount_requested}
              onChange={(e) => setLoanData({...loanData, amount_requested: Number(e.target.value)})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Durée de remboursement (mois)</label>
            <Input
              type="number"
              value={loanData.repayment_period_months}
              onChange={(e) => setLoanData({...loanData, repayment_period_months: Number(e.target.value)})}
              min="1"
              max="60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Taux d'intérêt (%)</label>
            <Input
              type="number"
              value={loanData.interest_rate}
              onChange={(e) => setLoanData({...loanData, interest_rate: Number(e.target.value)})}
              min="1"
              max="30"
              step="0.5"
            />
          </div>

          {/* Calculation */}
          <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
            <p className="text-gray-600">
              Paiement mensuel: <span className="font-bold text-orange-600">{monthlyPayment.toFixed(0)} FCFA</span>
            </p>
            <p className="text-gray-600">
              Total à rembourser: <span className="font-bold text-orange-600">{totalToRepay.toFixed(0)} FCFA</span>
            </p>
          </div>
        </div>

        {/* Purpose */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Objectif du prêt</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Raison du prêt</label>
            <select
              value={loanData.purpose}
              onChange={(e) => setLoanData({...loanData, purpose: e.target.value})}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="business">Développement commercial</option>
              <option value="education">Éducation</option>
              <option value="sante">Santé</option>
              <option value="agriculture">Agriculture</option>
              <option value="urgence">Urgence</option>
              <option value="equipement">Équipement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Plan d'affaires / Description du projet *</label>
            <Textarea
              placeholder="Expliquez votre projet en détail..."
              value={loanData.business_plan}
              onChange={(e) => setLoanData({...loanData, business_plan: e.target.value})}
              className="h-24"
            />
          </div>
        </div>

        {/* Guarantees */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Garanties</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Garanties offertes</label>
            <Textarea
              placeholder="Décrivez les garanties (propriété, revenus, etc.)"
              value={loanData.collateral}
              onChange={(e) => setLoanData({...loanData, collateral: e.target.value})}
              className="h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date limite pour collecter les fonds</label>
            <Input
              type="date"
              value={loanData.deadline}
              onChange={(e) => setLoanData({...loanData, deadline: e.target.value})}
            />
          </div>
        </div>

        {/* Important */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <p className="text-xs text-amber-800">
            <strong>Important:</strong> Fournissez des informations exactes et honnêtes. Les fausses déclarations peuvent entraîner le rejet de votre demande et des conséquences légales.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <Button
          onClick={() => requestLoanMutation.mutate()}
          disabled={requestLoanMutation.isPending || !loanData.amount_requested || !loanData.business_plan}
          className="w-full bg-green-500 hover:bg-green-600 h-12"
        >
          {requestLoanMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Soumettre la demande
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

