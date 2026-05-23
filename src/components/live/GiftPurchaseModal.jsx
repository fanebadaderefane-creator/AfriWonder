import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import OrangeMoneyIntegration from '../payment/OrangeMoneyIntegration';
import MobileMoneySelector from '../payment/MobileMoneySelector';
import { Textarea } from "@/components/ui/textarea";

export default function GiftPurchaseModal({ 
  isOpen, 
  receiverId, 
  liveId,
  onClose 
}) {
  const [step, setStep] = useState('selection'); // selection, message, payment
  const [selectedGift, setSelectedGift] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const queryClient = useQueryClient();

  const { data: gifts, _isLoading: giftsLoading } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => api.entities.Gift.filter({ is_active: true }),
    enabled: isOpen
  });

  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      const user = await api.auth.me();
      
      const totalAmount = selectedGift.price * quantity;
      const afriwonderFee = totalAmount * 0.1; // 10%
      const creatorEarnings = totalAmount * 0.9; // 90%

      // Traiter le paiement selon la méthode
      if (selectedPayment === 'orange_money') {
        await OrangeMoneyIntegration.initiatePayment({
          amount: totalAmount,
          phoneNumber,
          _description: `Cadeau ${selectedGift.name}`
        });
      } else {
        // Autres méthodes...
      }

      // Créer la transaction de cadeau
      const transaction = await api.entities.GiftTransaction.create({
        gift_id: selectedGift.id,
        gift_name: selectedGift.name,
        gift_icon: selectedGift.icon,
        sender_id: user.id,
        sender_name: user.full_name,
        sender_avatar: user.avatar || '',
        receiver_id: receiverId,
        receiver_name: '',
        amount: totalAmount,
        gift_count: quantity,
        afriwonder_commission: afriwonderFee,
        creator_earnings: creatorEarnings,
        context: liveId ? 'live' : 'profile',
        live_id: liveId,
        message,
        animation: selectedGift.animation
      });

      // Mettre à jour le wallet du créateur
      const wallets = await api.payments.getWallet();
      if (wallets?.length > 0) {
        await api.entities.Wallet.update(wallets[0].id, {
          available_balance: (wallets[0].available_balance || 0) + creatorEarnings
        });
      }

      // TODO: Create notification for gift sent

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
      toast.success('Cadeau envoyé avec succès! 🎁');
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi du cadeau');
      console.error(error);
    }
  });

  if (!isOpen) return null;

  const totalAmount = selectedGift ? selectedGift.price * quantity : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-screen max-w-md overflow-y-auto rounded-[32px] border border-white/10 bg-[#0b111d] text-white shadow-[0_30px_100px_rgba(2,6,23,0.44)]">
        {step === 'selection' && (
          <>
            <DialogHeader>
              <DialogTitle className="tracking-[-0.03em] text-white">Selectionner un cadeau</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {giftsLoading ? (
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] py-8 text-center text-white/56">Chargement des cadeaux...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {gifts?.map((gift) => (
                    <motion.div
                      key={gift.id}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedGift(gift)}
                      className={`cursor-pointer rounded-[24px] border p-4 transition-all ${
                        selectedGift?.id === gift.id
                          ? 'border-white/20 bg-white/[0.08]'
                          : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="text-3xl text-center mb-2">{gift.icon}</div>
                      <p className="text-center text-sm font-semibold text-white">{gift.name}</p>
                      <p className="text-center font-bold text-white/72">
                        {gift.price.toLocaleString()} XOF
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {selectedGift && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/72">Quantite</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="rounded-2xl border-white/10 bg-white/[0.04] text-white"
                    />
                    <p className="mt-1 text-sm text-white/56">
                      Total: {totalAmount.toLocaleString()} XOF
                    </p>
                  </div>

                  <Button
                    onClick={() => setStep('message')}
                    className="h-12 w-full rounded-2xl bg-white text-slate-950 hover:bg-white/92"
                  >
                    Continuer
                  </Button>
                </motion.div>
              )}
            </div>
          </>
        )}

        {step === 'message' && (
          <>
            <DialogHeader>
              <DialogTitle className="tracking-[-0.03em] text-white">Ajouter un message</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/72">Message (optionnel)</label>
                <Textarea
                  placeholder="Laissez un message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[112px] rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/34"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-white/40">{message.length}/100</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('selection')}
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl border-white/10 bg-transparent text-white/78 hover:bg-white/[0.05] hover:text-white"
                >
                  Retour
                </Button>
                <Button
                  onClick={() => setStep('payment')}
                  className="h-12 flex-1 rounded-2xl bg-white text-slate-950 hover:bg-white/92"
                >
                  Paiement
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle className="tracking-[-0.03em] text-white">Paiement</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <p className="text-sm text-white/56">Montant a payer</p>
                <p className="text-2xl font-bold text-white">
                  {totalAmount.toLocaleString()} XOF
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/72">Methode de paiement</label>
                <MobileMoneySelector
                  selectedMethod={selectedPayment}
                  onMethodChange={setSelectedPayment}
                />
              </div>

              {selectedPayment === 'orange_money' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/72">Numero de telephone</label>
                  <Input
                    placeholder="78 123 45 67"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/34"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setStep('message')}
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl border-white/10 bg-transparent text-white/78 hover:bg-white/[0.05] hover:text-white"
                >
                  Retour
                </Button>
                <Button
                  onClick={() => sendGiftMutation.mutate()}
                  disabled={
                    sendGiftMutation.isPending ||
                    (selectedPayment === 'orange_money' && !phoneNumber)
                  }
                  className="h-12 flex-1 rounded-2xl bg-white text-slate-950 hover:bg-white/92"
                >
                  {sendGiftMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer le cadeau
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}



