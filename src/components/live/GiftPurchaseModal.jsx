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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-screen overflow-y-auto">
        {step === 'selection' && (
          <>
            <DialogHeader>
              <DialogTitle>Sélectionner un cadeau</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {giftsLoading ? (
                <div className="text-center py-8">Chargement des cadeaux...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {gifts?.map((gift) => (
                    <motion.div
                      key={gift.id}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedGift(gift)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedGift?.id === gift.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-3xl text-center mb-2">{gift.icon}</div>
                      <p className="font-semibold text-sm text-center">{gift.name}</p>
                      <p className="text-blue-600 font-bold text-center">
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
                    <label className="text-sm font-semibold block mb-2">Quantité</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                    />
                    <p className="text-sm text-blue-600 mt-1">
                      Total: {(selectedGift.price * quantity).toLocaleString()} XOF
                    </p>
                  </div>

                  <Button
                    onClick={() => setStep('message')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
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
              <DialogTitle>Ajouter un message</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Message (optionnel)</label>
                <textarea
                  placeholder="Laissez un message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border rounded-lg p-2 min-h-20"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{message.length}/100</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('selection')}
                  variant="outline"
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={() => setStep('payment')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
              <DialogTitle>Paiement</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">Montant à payer</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(selectedGift.price * quantity).toLocaleString()} XOF
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2">Méthode de paiement</label>
                <MobileMoneySelector
                  selectedMethod={selectedPayment}
                  onMethodChange={setSelectedPayment}
                />
              </div>

              {selectedPayment === 'orange_money' && (
                <div>
                  <label className="text-sm font-semibold block mb-2">Numéro de _téléphone</label>
                  <Input
                    placeholder="78 123 45 67"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setStep('message')}
                  variant="outline"
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={() => sendGiftMutation.mutate()}
                  disabled={
                    sendGiftMutation.isPending ||
                    (selectedPayment === 'orange_money' && !phoneNumber)
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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



