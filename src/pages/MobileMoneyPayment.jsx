import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Phone } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function MobileMoneyPayment() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('amount'); // 'amount' | 'method' | 'confirm' | 'processing'
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(''); // 'orange_money' | 'wave'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [_reference, setReference] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate]);

  const handleInitiatePayment = async () => {
    if (!amount || parseFloat(amount) < 100) {
      toast.error('Montant minimum: 100 FCFA');
      return;
    }

    if (!method) {
      toast.error('Sélectionnez un moyen de paiement');
      return;
    }

    if (!phoneNumber) {
      toast.error('Entrez votre numéro de téléphone');
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    setLoading(true);
    const txRef = `wallet_${user.id}_${Date.now()}`;
    setReference(txRef);

    try {
      setStep('processing');
      const returnUrl = `${window.location.origin}${createPageUrl('Wallet')}?topup=success&ref=${encodeURIComponent(txRef)}`;
      const amountValue = parseFloat(amount);
      let paymentResult = null;

      if (method === 'orange_money') {
        paymentResult = await api.payments.initiateOrangeMoney(txRef, amountValue, phoneNumber, returnUrl, txRef);
      } else if (method === 'wave') {
        paymentResult = await api.payments.initiateWavePayment(txRef, amountValue, returnUrl, 'XOF');
      }

      if (!paymentResult?.paymentUrl) {
        throw new Error('URL de paiement introuvable');
      }
      window.location.assign(paymentResult.paymentUrl);
    } catch (_error) {
      toast.error(_error?.response?.data?.message || _error?.message || 'Erreur lors de l\'initiation du paiement');
      setLoading(false);
      setStep('confirm');
    }
  };

  const paymentMethods = [
    {
      id: 'orange_money',
      name: 'Orange Money',
      icon: '🟠',
      description: 'Paiement instantané',
      countries: ['SN', 'CM', 'CG', 'BJ', 'ML']
    },
    {
      id: 'wave',
      name: 'Wave',
      icon: '💳',
      description: 'Transfert d\'argent mobile',
      countries: ['SN', 'ML', 'BJ', 'CG', 'CD']
    }
  ];

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(createPageUrl('Wallet'))} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Recharger le portefeuille</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Step: Amount */}
        {step === 'amount' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-600">
                Montant à recharger
              </label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-2xl font-bold text-orange-500">₣</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl font-bold border-0 bg-transparent focus:ring-0"
                  min="100"
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="bg-white rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Montants rapides</p>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((qAmount) => (
                  <button
                    key={qAmount}
                    onClick={() => setAmount(qAmount.toString())}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      amount === qAmount.toString()
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {qAmount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep('method')}
              disabled={!amount || parseFloat(amount) < 100}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white h-12 rounded-xl"
            >
              Continuer
            </Button>
          </div>
        )}

        {/* Step: Payment Method */}
        {step === 'method' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-200">
              <p className="text-sm font-medium text-gray-700">
                Montant: <span className="font-bold text-orange-600">{parseFloat(amount).toLocaleString()} FCFA</span>
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-600">
                Choisir un moyen de paiement
              </label>
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    method === pm.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{pm.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{pm.name}</p>
                      <p className="text-xs text-gray-500">{pm.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      method === pm.id ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                    }`} />
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-600">
                Numéro de téléphone
              </label>
              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="+221 7X XXX XXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="border-0 bg-transparent focus:ring-0 text-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('amount')}
                className="flex-1 h-12 rounded-xl"
              >
                Retour
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!method || !phoneNumber}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 rounded-xl"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg">Récapitulatif</h2>
              
              <div className="space-y-3 border-t border-b py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant</span>
                  <span className="font-semibold">{parseFloat(amount).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Moyen</span>
                  <span className="font-semibold">{paymentMethods.find(p => p.id === method)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Téléphone</span>
                  <span className="font-semibold">{phoneNumber}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Vous serez redirigé vers {paymentMethods.find(p => p.id === method)?.name} pour confirmer le paiement.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('method')}
                className="flex-1 h-12 rounded-xl"
              >
                Retour
              </Button>
              <Button
                onClick={handleInitiatePayment}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white h-12 rounded-xl"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer maintenant'}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Traitement en cours...</h2>
            <p className="text-center text-gray-500">
              Vous serez redirigé vers {paymentMethods.find(p => p.id === method)?.name}<br />
              Ne fermez pas cette page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
