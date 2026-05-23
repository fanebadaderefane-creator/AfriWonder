import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { formatCommissionRate, formatFcfa } from '@/utils/commissions';
import { Shield, Info } from 'lucide-react';

const VERTICAL_LABELS = {
  marketplace: { label: 'Marketplace', rateKey: 'seller_commission_default_pct', defaultRule: 'seller' },
  ticketing: { label: 'Billetterie', rateKey: 'ticket_platform_pct', defaultRule: 'ticket' },
  transport: { label: 'Transport', rateKey: 'ride_platform_pct', defaultRule: 'ride' },
  food: { label: 'Livraison repas', rateKey: 'restaurant_commission_default_pct', defaultRule: 'restaurant' },
  telemedicine: { label: 'Télémedecine', rateKey: 'consultation_platform_pct', defaultRule: 'consultation' },
  services: { label: 'Services pro', rateKey: 'provider_commission_default_pct', defaultRule: 'provider' },
  bills: { label: 'Factures', rateKey: 'transaction_fee_default_pct', defaultRule: 'transaction' },
  airtime: { label: 'Recharge crédit', rateKey: 'operator_commission_pct', defaultRule: 'recharge' },
  insurance: { label: 'Assurance', rateKey: 'brokerage_commission_default_pct', defaultRule: 'brokerage' },
  video_social: { label: 'Tips / Cadeaux', rateKey: 'tips_platform_pct', defaultRule: 'tips' },
};

/**
 * Affiche le taux de commission (source backend) pour éviter les litiges.
 * @param {string} vertical - clé du vertical (marketplace, ticketing, transport, food, etc.)
 * @param {number} [amountFcfa] - si fourni, appelle /calculate et affiche les frais estimés
 * @param {string} [rule] - règle pour le calcul (seller, ticket, ride, restaurant, etc.)
 * @param {string} [className] - classes CSS
 * @param {boolean} [compact] - affichage compact (une ligne)
 */
export default function CommissionNotice({ vertical, amountFcfa, rule, className = '', compact = false }) {
  const meta = VERTICAL_LABELS[vertical];
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['commissions-config'],
    queryFn: () => api.commissions.getConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const verticals = config?.data ?? config;
  const rate = meta && verticals?.[vertical]?.[meta.rateKey];
  const rateLabel = rate != null ? formatCommissionRate(rate) : null;

  const calcRule = rule || meta?.defaultRule;
  const { data: breakdown } = useQuery({
    queryKey: ['commissions-calc', vertical, calcRule, amountFcfa],
    queryFn: () => api.commissions.calculate(vertical, calcRule, amountFcfa || 0),
    enabled: !!(vertical && calcRule && amountFcfa != null && amountFcfa > 0),
    staleTime: 2 * 60 * 1000,
  });

  const platformAmount = breakdown?.platform ?? breakdown?.service_fee;

  if (configLoading || !rateLabel) return null;

  if (compact) {
    return (
      <p className={`text-xs text-gray-500 ${className}`}>
        <Shield className="w-3 h-3 inline mr-1" />
        Commission plateforme {rateLabel} (AfriWonder)
        {platformAmount != null && platformAmount > 0 && (
          <> — Frais estimés : {formatFcfa(platformAmount)}</>
        )}
      </p>
    );
  }

  return (
    <div className={`flex items-start gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3 ${className}`}>
      <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-gray-700">Transparence des frais</p>
        <p>
          Commission plateforme AfriWonder : <strong>{rateLabel}</strong>
          {meta?.label && <> pour {meta.label}</>}.
          {platformAmount != null && platformAmount > 0 && (
            <> Frais estimés pour ce montant : <strong>{formatFcfa(platformAmount)}</strong>.</>
          )}
          {' '}Les montants définitifs sont calculés au moment du paiement (backend).
        </p>
      </div>
    </div>
  );
}
