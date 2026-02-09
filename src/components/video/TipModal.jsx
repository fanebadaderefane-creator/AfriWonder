import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Heart, Sparkles, Gift, Crown, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const tipAmounts = [
  { amount: 100, icon: Heart, label: '100 F', color: 'from-pink-400 to-rose-500' },
  { amount: 500, icon: Sparkles, label: '500 F', color: 'from-yellow-400 to-orange-500' },
  { amount: 1000, icon: Gift, label: '1K F', color: 'from-purple-400 to-pink-500' },
  { amount: 2500, icon: Crown, label: '2.5K F', color: 'from-amber-400 to-yellow-500' },
  { amount: 5000, icon: Gem, label: '5K F', color: 'from-blue-400 to-purple-500' },
];

const paymentMethods = [
  { id: 'orange_money', name: 'Orange Money', color: 'bg-orange-500', icon: '🟠' },
  { id: 'wave', name: 'Wave', color: 'bg-blue-500', icon: '🔵' },
  { id: 'mtn_money', name: 'MTN Money', color: 'bg-yellow-500', icon: '🟡' },
  { id: 'wallet', name: 'Mon Wallet', color: 'bg-gradient-to-r from-orange-500 to-red-500', icon: '💰' },
];

export default function TipModal({ 
  isOpen, 
  onClose, 
  creator, 
  onSendTip,
  walletBalance = 0 
}) {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('wallet');
  const [step, setStep] = useState('amount'); // 'amount' | 'payment' | 'success'
  const [isLoading, setIsLoading] = useState(false);

  const finalAmount = selectedAmount || parseInt(customAmount) || 0;

  const handleSendTip = async () => {
    if (!finalAmount || finalAmount < 50) return;
    
    setIsLoading(true);
    try {
      await onSendTip(finalAmount, selectedMethod);
      setStep('success');
    } catch (_error) {
      console.error('Tip failed:', error);
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setStep('amount');
    setSelectedAmount(null);
    setCustomAmount('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {step === 'amount' ? 'Choisir un montant' : step === 'payment' ? 'Choisir le paiement' : 'Confirmation'}
        </DialogTitle>
        {step === 'amount' && (
          <>
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-4 border-white/30">
                  <AvatarImage src={creator?.avatar} />
                  <AvatarFallback className="bg-white/20 text-white text-xl">
                    {creator?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">Soutenir @{creator?.name}</h3>
                  <p className="text-white/80 text-sm">Envoyez un tip pour montrer votre amour ❤️</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Preset amounts */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {tipAmounts.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <motion.button
                      key={tip.amount}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedAmount(tip.amount);
                        setCustomAmount('');
                      }}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all",
                        selectedAmount === tip.amount
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-100 hover:border-orange-200"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full bg-gradient-to-br mx-auto mb-2 flex items-center justify-center",
                        tip.color
                      )}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-gray-800">{tip.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Custom amount */}
              <div className="relative mb-6">
                <Input
                  type="number"
                  placeholder="Montant personnalisé"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="pl-10 pr-16 py-6 text-lg rounded-xl border-2 border-gray-100 focus:border-orange-500"
                />
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  FCFA
                </span>
              </div>

              {/* Continue button */}
              <Button
                onClick={() => setStep('payment')}
                disabled={!finalAmount || finalAmount < 50}
                className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                Continuer · {finalAmount.toLocaleString()} FCFA
              </Button>

              <p className="text-center text-gray-400 text-xs mt-3">
                Minimum 50 FCFA
              </p>
            </div>
          </>
        )}

        {step === 'payment' && (
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center text-xl">Choisir le paiement</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <motion.button
                  key={method.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all",
                    selectedMethod === method.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-100 hover:border-orange-200"
                  )}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="font-semibold flex-1 text-left">{method.name}</span>
                  {method.id === 'wallet' && (
                    <span className="text-gray-400 text-sm">
                      {walletBalance.toLocaleString()} F
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Montant</span>
                <span className="font-bold text-lg">{finalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('amount')}
                className="flex-1 py-6 rounded-xl"
              >
                Retour
              </Button>
              <Button
                onClick={handleSendTip}
                disabled={isLoading}
                className="flex-1 py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
              >
                {isLoading ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
            >
              <Heart className="w-12 h-12 text-white fill-white" />
            </motion.div>

            <h3 className="text-2xl font-bold mb-2">Merci ! 🎉</h3>
            <p className="text-gray-500 mb-6">
              Vous avez envoyé {finalAmount.toLocaleString()} FCFA à @{creator?.name}
            </p>

            <Button
              onClick={handleClose}
              className="w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
            >
              Fermer
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}