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
  { amount: 500, icon: Sparkles, label: '500 F', color: 'from-yellow-400 to-blue-500' },
  { amount: 1000, icon: Gift, label: '1K F', color: 'from-purple-400 to-pink-500' },
  { amount: 2500, icon: Crown, label: '2.5K F', color: 'from-blue-400 to-indigo-500' },
  { amount: 5000, icon: Gem, label: '5K F', color: 'from-blue-400 to-purple-500' },
];

const paymentMethods = [
  { id: 'orange_money', name: 'Orange Money', hint: 'Mobile money', icon: 'OM' },
  { id: 'wave', name: 'Wave', hint: 'Paiement rapide', icon: 'WV' },
  { id: 'mtn_money', name: 'MTN Money', hint: 'Portefeuille telecom', icon: 'MT' },
  { id: 'wallet', name: 'Mon Wallet', hint: 'Solde AfriWonder', icon: 'AW' },
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
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('amount'); // 'amount' | 'payment' | 'success'
  const [isLoading, setIsLoading] = useState(false);

  const finalAmount = selectedAmount || parseInt(customAmount) || 0;
  const needsPhone = selectedMethod === 'orange_money';
  const canSend = finalAmount >= 50 && (!needsPhone || (phone && phone.replace(/\D/g, '').length >= 8));

  const handleSendTip = async () => {
    if (!finalAmount || finalAmount < 50) return;
    if (needsPhone && !phone) return;
    
    setIsLoading(true);
    try {
      await onSendTip(finalAmount, selectedMethod, needsPhone ? { phone: phone.replace(/\D/g, '') } : {});
      setStep('success');
    } catch (err) {
      console.error('Tip failed:', err);
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} modal>
      <DialogContent className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b111d] p-0 text-white shadow-[0_30px_100px_rgba(2,6,23,0.44)] sm:max-w-md">
        <DialogTitle className="sr-only">
          {step === 'amount' ? 'Choisir un montant' : step === 'payment' ? 'Choisir le paiement' : 'Confirmation'}
        </DialogTitle>
        {step === 'amount' && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="bg-[linear-gradient(135deg,#10203d_0%,#153467_52%,#0b111d_100%)] p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/18 shadow-[0_18px_40px_rgba(2,6,23,0.25)]">
                  <AvatarImage src={creator?.avatar} />
                  <AvatarFallback className="bg-white/10 text-xl text-white">
                    {creator?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/48">Soutien</p>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">Soutenir @{creator?.name}</h3>
                  <p className="text-sm text-white/68">Envoyez un tip pour encourager ce createur.</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-medium text-white/72">
                  Paiement rapide
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-medium text-white/72">
                  Minimum 50 FCFA
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/54">Votre solde AfriWonder</span>
                  <span className="font-semibold text-white">{walletBalance.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
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
                        "rounded-[24px] border p-4 transition-all",
                        selectedAmount === tip.amount
                          ? "border-white/20 bg-white/[0.08] shadow-[0_14px_36px_rgba(2,6,23,0.18)]"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                      )}
                    >
                      <div className={cn(
                        "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br",
                        tip.color
                      )}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-white">{tip.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="relative mb-6">
                <Input
                  type="number"
                  placeholder="Montant personnalisé"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="h-14 rounded-2xl border-white/10 bg-white/[0.04] pl-10 pr-16 text-lg text-white placeholder:text-white/34"
                />
                <Coins className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-medium text-white/40">
                  FCFA
                </span>
              </div>

              <Button
                onClick={() => setStep('payment')}
                disabled={!finalAmount || finalAmount < 50}
                className="h-12 w-full rounded-2xl bg-white text-base font-medium text-slate-950 hover:bg-white/92"
              >
                Continuer · {finalAmount.toLocaleString()} FCFA
              </Button>

              <p className="mt-3 text-center text-xs text-white/40">
                Minimum 50 FCFA
              </p>
            </div>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="p-6"
          >
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center text-xl tracking-[-0.03em] text-white">Choisir le paiement</DialogTitle>
            </DialogHeader>

            <div className="mb-4 rounded-[22px] border border-blue-400/16 bg-blue-400/[0.08] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/64">Envoi à</span>
                <span className="truncate text-sm font-semibold text-white">@{creator?.name}</span>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              {paymentMethods.map((method) => (
                <motion.button
                  key={method.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-[24px] border p-4 text-left transition-all",
                    selectedMethod === method.id
                      ? "border-white/20 bg-white/[0.08]"
                      : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                  )}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/82">
                    {method.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-white">{method.name}</span>
                    <span className="block text-sm text-white/48">{method.hint}</span>
                  </span>
                  {method.id === 'wallet' && (
                    <span className="text-sm text-white/48">
                      {walletBalance.toLocaleString()} F
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            {needsPhone && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-white/72">Numero Orange Money</label>
                <Input
                  type="tel"
                  placeholder="77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/34"
                />
              </div>
            )}

            <div className="mb-6 rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
              <div className="flex justify-between items-center">
                <span className="text-white/56">Montant</span>
                <span className="text-lg font-bold text-white">{finalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('amount')}
                className="h-12 flex-1 rounded-2xl border-white/10 bg-transparent text-white/78 hover:bg-white/[0.05] hover:text-white"
              >
                Retour
              </Button>
              <Button
                onClick={handleSendTip}
                disabled={isLoading || !canSend}
                className="h-12 flex-1 rounded-2xl bg-white text-slate-950 hover:bg-white/92"
              >
                {isLoading ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </motion.div>
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
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500"
            >
              <Heart className="w-12 h-12 text-white fill-white" />
            </motion.div>

            <h3 className="mb-2 text-2xl font-bold text-white">Merci</h3>
            <p className="mb-6 text-white/56">
              Vous avez envoyé {finalAmount.toLocaleString()} FCFA à @{creator?.name}
            </p>

            <Button
              onClick={handleClose}
              className="h-12 w-full rounded-2xl bg-white text-slate-950 hover:bg-white/92"
            >
              Fermer
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}