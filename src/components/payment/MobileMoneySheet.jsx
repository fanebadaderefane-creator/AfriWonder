import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Check, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const paymentProviders = [
  { 
    id: 'orange_money', 
    name: 'Orange Money', 
    color: 'bg-orange-500',
    prefix: '+221 77',
    countries: ['SN', 'CI', 'ML', 'BF', 'GN']
  },
  { 
    id: 'wave', 
    name: 'Wave', 
    color: 'bg-blue-500',
    prefix: '+221',
    countries: ['SN', 'CI', 'ML', 'BF']
  },
  { 
    id: 'mtn_money', 
    name: 'MTN MoMo', 
    color: 'bg-yellow-500',
    prefix: '+237',
    countries: ['CM', 'CI', 'GH', 'NG', 'UG']
  },
  { 
    id: 'moov_money', 
    name: 'Moov Money', 
    color: 'bg-purple-500',
    prefix: '+229',
    countries: ['BJ', 'CI', 'TG', 'NE']
  },
];

export default function MobileMoneySheet({ 
  isOpen, 
  onClose, 
  amount,
  currency = 'FCFA',
  onConfirm,
  type = 'payment' // 'payment' | 'deposit' | 'withdrawal'
}) {
  const [step, setStep] = useState('provider'); // 'provider' | 'phone' | 'confirm' | 'processing' | 'success' | 'error'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const titles = {
    payment: 'Payer',
    deposit: 'Recharger',
    withdrawal: 'Retirer'
  };

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
    setStep('phone');
  };

  const handleSubmitPhone = () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      setError('Numéro invalide');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setStep('processing');
    try {
      await onConfirm({
        provider: selectedProvider.id,
        phone: phoneNumber,
        amount
      });
      setStep('success');
    } catch (_err) {
      setError(err._message || 'Une erreur est survenue');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('provider');
    setSelectedProvider(null);
    setPhoneNumber('');
    setError('');
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-bold">
            {titles[type]} {amount?.toLocaleString()} {currency}
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === 'provider' && (
            <motion.div
              key="provider"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {paymentProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-orange-200 transition-all"
                >
                  <div className={`w-12 h-12 ${provider.color} rounded-full flex items-center justify-center`}>
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-800">{provider.name}</p>
                    <p className="text-xs text-gray-400">{provider.prefix}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 ${selectedProvider?.color} rounded-full flex items-center justify-center`}>
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold">{selectedProvider?.name}</span>
              </div>

              <div>
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={selectedProvider?.prefix}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-2 text-lg py-6 rounded-xl"
                />
                {error && (
                  <p className="text-red-500 text-sm mt-1">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('provider')}
                  className="flex-1 py-6 rounded-xl"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleSubmitPhone}
                  className="flex-1 py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
                >
                  Continuer
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant</span>
                  <span className="font-bold">{amount?.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Via</span>
                  <span className="font-medium">{selectedProvider?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Numéro</span>
                  <span className="font-medium">{phoneNumber}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-600 text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Transaction sécurisée et instantanée</span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('phone')}
                  className="flex-1 py-6 rounded-xl"
                >
                  Modifier
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 py-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  Confirmer
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <Loader2 className="w-16 h-16 mx-auto text-orange-500 animate-spin mb-4" />
              <p className="text-lg font-semibold text-gray-800">Traitement en cours...</p>
              <p className="text-gray-500 text-sm mt-2">
                Vérifiez votre téléphone pour confirmer
              </p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-white" />
              </div>
              <p className="text-xl font-bold text-gray-800 mb-2">Succès ! 🎉</p>
              <p className="text-gray-500">
                {amount?.toLocaleString()} {currency} {type === 'deposit' ? 'ajoutés' : type === 'withdrawal' ? 'retirés' : 'payés'}
              </p>
              <Button
                onClick={handleClose}
                className="mt-6 w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
              >
                Fermer
              </Button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <p className="text-xl font-bold text-gray-800 mb-2">Erreur</p>
              <p className="text-gray-500">{error}</p>
              <Button
                onClick={() => setStep('confirm')}
                className="mt-6 w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
              >
                Réessayer
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}