import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DEFAULT_GIFTS = [
  { id: '1', name: 'Coeur', icon: '❤️', price: 100, animation: 'hearts', category: 'basic' },
  { id: '2', name: 'Rose', icon: '🌹', price: 200, animation: 'hearts', category: 'basic' },
  { id: '3', name: 'Étoile', icon: '⭐', price: 300, animation: 'stars', category: 'basic' },
  { id: '4', name: 'Diamant', icon: '💎', price: 500, animation: 'stars', category: 'premium' },
  { id: '5', name: 'Couronne', icon: '👑', price: 1000, animation: 'confetti', category: 'premium' },
  { id: '6', name: 'Fusée', icon: '🚀', price: 2000, animation: 'fireworks', category: 'vip' },
  { id: '7', name: 'Trophée', icon: '🏆', price: 3000, animation: 'confetti', category: 'vip' },
  { id: '8', name: 'Château', icon: '🏰', price: 5000, animation: 'fireworks', category: 'vip' }
];

export default function GiftSelector({ isOpen, onClose, liveId, creatorId, onGiftSent }) {
  const [selectedGift, setSelectedGift] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: gifts = DEFAULT_GIFTS } = useQuery({
    queryKey: ['gifts'],
    queryFn: async () => {
      const dbGifts = await api.entities.Gift.list();
      return dbGifts.length > 0 ? dbGifts : DEFAULT_GIFTS;
    }
  });

  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGift || !user) throw new Error('Erreur');

      // Create live gift transaction
      await api.entities.LiveGift.create({
        live_id: liveId,
        gift_id: selectedGift.id,
        gift_name: selectedGift.name,
        gift_icon: selectedGift.icon,
        gift_animation: selectedGift.animation,
        sender_id: user.id,
        sender_name: user.full_name,
        receiver_id: creatorId,
        amount: selectedGift.price,
        payment_method: paymentMethod,
        payment_status: 'completed'
      });

      // TODO: Implement transaction

      // Update creator's wallet
      const wallets = await api.payments.getWallet();
      if (wallets.length > 0) {
        await api.entities.Wallet.update(wallets[0].id, {
          balance: wallets[0].balance + (selectedGift.price * 0.7) // 70% pour le créateur
        });
      }

      return selectedGift;
    },
    onSuccess: (gift) => {
      toast.success(`🎁 ${gift.name} envoyé !`);
      onGiftSent?.(gift);
      setSelectedGift(null);
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi du cadeau');
    }
  });

  const paymentMethods = [
    { id: 'orange_money', name: 'Orange Money', color: 'bg-orange-500' },
    { id: 'wave', name: 'Wave', color: 'bg-blue-500' },
    { id: 'mtn_money', name: 'MTN Money', color: 'bg-yellow-500' },
    { id: 'moov_money', name: 'Moov Money', color: 'bg-green-500' }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-_t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Envoyer un cadeau
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Gift Selection */}
          <div>
            <h3 className="font-semibold mb-3">Choisir un cadeau</h3>
            <div className="grid grid-cols-4 gap-3">
              {gifts.map((gift) => (
                <motion.button
                  key={gift.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedGift(gift)}
                  className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all ${
                    selectedGift?.id === gift.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-3xl mb-1">{gift.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{gift.name}</span>
                  <span className="text-xs text-blue-600 font-bold mt-0.5">
                    {gift.price} F
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          {selectedGift && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-semibold mb-3">Mode de paiement</h3>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${method.color} mx-auto mb-2`} />
                    <div className="text-sm">{method.name}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Summary & Send */}
          {selectedGift && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedGift.icon}</span>
                  <div>
                    <div className="font-semibold">{selectedGift.name}</div>
                    <div className="text-sm text-gray-600">
                      {paymentMethods.find(m => m.id === paymentMethod)?.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedGift.price}
                  </div>
                  <div className="text-xs text-gray-500">FCFA</div>
                </div>
              </div>

              <Button
                onClick={() => sendGiftMutation.mutate()}
                disabled={sendGiftMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6"
              >
                {sendGiftMutation.isPending ? 'Envoi...' : '🎁 Envoyer le cadeau'}
              </Button>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}



