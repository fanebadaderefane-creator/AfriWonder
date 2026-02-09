import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function CouponApplier({ 
  cartTotal,
  onCouponApplied,
  appliedCoupon = null,
  onRemoveCoupon
}) {
  const [couponCode, setCouponCode] = useState('');
  const [showApplied, setShowApplied] = useState(!!appliedCoupon);

  const validateCoupon = useMutation({
    mutationFn: async (code) => {
      const coupons = await api.entities.Coupon.filter({ 
        code: code.toUpperCase(),
        is_active: true
      });

      if (!coupons || coupons.length === 0) {
        throw new Error('Code coupon invalide');
      }

      const coupon = coupons[0];
      const now = new Date();

      if (coupon.start_date && new Date(coupon.start_date) > now) {
        throw new Error('Ce coupon n\'est pas encore actif');
      }

      if (coupon.end_date && new Date(coupon.end_date) < now) {
        throw new Error('Ce coupon a expiré');
      }

      if (coupon.usage_limit && coupon.current_usage >= coupon.usage_limit) {
        throw new Error('Ce coupon a atteint sa limite d\'utilisation');
      }

      if (cartTotal < coupon.min_purchase) {
        throw new Error(`Montant minimum requis: ${coupon.min_purchase.toLocaleString()} XOF`);
      }

      // Calculer la réduction
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round((cartTotal * coupon.discount_value) / 100);
        if (coupon.max_discount) {
          discountAmount = Math.min(discountAmount, coupon.max_discount);
        }
      } else {
        discountAmount = coupon.discount_value;
      }

      return {
        ...coupon,
        discountAmount,
        finalAmount: Math.max(0, cartTotal - discountAmount)
      };
    },
    onSuccess: (coupon) => {
      onCouponApplied(coupon);
      setShowApplied(true);
      setCouponCode('');
      toast.success(`Coupon appliqué: -${coupon.discountAmount.toLocaleString()} XOF`);
    },
    onError: (error) => {
      toast.error(error._message);
    }
  });

  const handleApply = async () => {
    if (!couponCode.trim()) {
      toast.error('Veuillez entrer un code coupon');
      return;
    }
    validateCoupon.mutate(couponCode.toUpperCase());
  };

  const handleRemove = () => {
    onRemoveCoupon?.();
    setShowApplied(false);
    setCouponCode('');
  };

  if (showApplied && appliedCoupon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">{appliedCoupon.code}</p>
              <p className="text-sm text-green-700">
                -{appliedCoupon.discountAmount?.toLocaleString()} XOF
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800 font-medium"
          >
            ✕
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <Input
          placeholder="Code coupon"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          disabled={validateCoupon.isPending}
          className="flex-1"
        />
        <Button
          onClick={handleApply}
          disabled={validateCoupon.isPending || !couponCode}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {validateCoupon.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Appliquer'
          )}
        </Button>
      </div>
    </div>
  );
}


