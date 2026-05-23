import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function OrangeMoneyIntegration({ amount, orderId, onSuccess }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!phone || phone.length < 8) {
      toast.error('Numéro de téléphone invalide');
      return;
    }

    try {
      setLoading(true);
      const result = await api.payments.initiateOrangeMoney(
        orderId,
        amount,
        phone,
        window.location.origin + '/payment/callback'
      );

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      }
    } catch (_error) {
      toast.error('Erreur lors de l\'initialisation du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Numéro Orange Money
        </label>
        <Input
          type="tel"
          placeholder="77 XX XX XX XX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
        />
      </div>

      <Button 
        onClick={handlePayment} 
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600"
      >
        {loading ? 'Traitement...' : `Payer ${amount.toLocaleString()} FCFA`}
      </Button>
    </div>
  );
}
