import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import StripeIntegration from './StripeIntegration';

export default function StripeCheckout({ 
  items,
  totalAmount,
  onSuccess,
  onCancel
}) {
  const [email, setEmail] = useState('');
  const [_isLoading, _setIsLoading] = useState(false);
  const _queryClient = useQueryClient();

  const checkoutMutation = useMutation({
    mutationFn: async (_checkoutData) => {
      const user = await api.auth.me();

      // Créer une session Stripe
      const session = await StripeIntegration.createCheckoutSession({
        items,
        customer_email: email || user.email,
        _success_url: `${window.location.origin}/orders?success=true`,
        _cancel_url: `${window.location.origin}/cart`,
        _metadata: {
          user_id: user.id,
          order_date: new Date().toISOString()
        }
      });

      // Créer une CheckoutSession en base de données
      const dbSession = await api.entities.CheckoutSession.create({
        user_id: user.id,
        stripe_session_id: session.sessionId,
        items,
        total_amount: totalAmount,
        customer_email: email || user.email,
        payment_status: 'pending'
      });

      return { 
        sessionId: session.sessionId,
        dbSessionId: dbSession.id,
        checkoutUrl: session.url 
      };
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.success('Session de paiement créée');
        onSuccess?.(data);
      }
    },
    onError: (error) => {
      toast.error('Erreur lors du paiement');
      console.error(error);
    }
  });

  const handleCheckout = async () => {
    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }
    checkoutMutation.mutate({});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold mb-4">Paiement Sécurisé</h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-semibold block mb-2">Email</label>
          <Input
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={checkoutMutation.isPending}
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Sous-total</span>
            <span className="font-semibold">{totalAmount.toLocaleString()} XOF</span>
          </div>
          <div className="border-_t pt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-600">{totalAmount.toLocaleString()} XOF</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Vous serez redirigé vers Stripe pour le paiement sécurisé par carte bancaire.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          onClick={handleCheckout}
          disabled={checkoutMutation.isPending || !email}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          size="lg"
        >
          {checkoutMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            'Procéder au paiement Stripe'
          )}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full"
          disabled={checkoutMutation.isPending}
        >
          Annuler
        </Button>
      </div>
    </motion.div>
  );
}


