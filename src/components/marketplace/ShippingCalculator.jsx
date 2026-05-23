import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck } from 'lucide-react';

export default function ShippingCalculator({ 
  weight = 1,
  zone,
  onShippingCalculated
}) {
  const [selectedZone, setSelectedZone] = useState(zone || 'national');

  const { data: shippingRates } = useQuery({
    queryKey: ['shipping-rates', selectedZone],
    queryFn: () => api.entities.ShippingRate.filter({ 
      zone: selectedZone,
      is_active: true
    })
  });

  const rate = shippingRates?.[0];

  React.useEffect(() => {
    if (rate && weight) {
      const shippingFee = rate.base_rate + (weight > 1 ? (weight - 1) * rate.per_kg_rate : 0);
      onShippingCalculated?.({
        fee: shippingFee,
        estimatedDays: rate.estimated_days,
        carrier: 'standard'
      });
    }
  }, [rate, weight, onShippingCalculated]);

  const shippingFee = rate ? rate.base_rate + (weight > 1 ? (weight - 1) * rate.per_kg_rate : 0) : 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div>
        <label className="text-sm font-semibold block mb-2">Zone de livraison</label>
        <Select value={selectedZone} onValueChange={setSelectedZone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dakar">Dakar</SelectItem>
            <SelectItem value="banlieue">Banlieue</SelectItem>
            <SelectItem value="provinces">Provinces</SelectItem>
            <SelectItem value="national">National</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rate && (
        <div className="bg-white rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-semibold">Détails livraison</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tarif de base</span>
            <span className="font-semibold">{rate.base_rate.toLocaleString()} XOF</span>
          </div>
          {weight > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kg supplémentaires ({weight - 1}kg)</span>
              <span className="font-semibold">{((weight - 1) * rate.per_kg_rate).toLocaleString()} XOF</span>
            </div>
          )}
          <div className="border-_t pt-2 flex justify-between">
            <span className="font-bold">Frais de livraison</span>
            <span className="font-bold text-orange-600">{shippingFee.toLocaleString()} XOF</span>
          </div>
          <div className="text-xs text-gray-500">
            ⏱️ Livraison en {rate.estimated_days} jour(s)
          </div>
        </div>
      )}
    </div>
  );
}


