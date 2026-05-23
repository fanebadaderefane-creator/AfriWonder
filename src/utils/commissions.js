/**
 * Utilitaires commissions AfriWonder — frontend.
 * Toujours utiliser l’API backend (source de vérité) pour afficher les frais et éviter les risques/litiges.
 */
import { api } from '@/api/expressClient';

let configCache = null;
let configCacheTime = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min

/**
 * Récupère la config des commissions (cache 5 min).
 * @returns {Promise<{ data: object, currency_default: string }>}
 */
export async function getCommissionConfig() {
  if (configCache && Date.now() - configCacheTime < CACHE_MS) {
    return configCache;
  }
  const res = await api.commissions.getConfig();
  configCache = res && typeof res === 'object' && !res.data ? { data: res, currency_default: 'XOF' } : (res?.data ? { data: res.data, currency_default: res.currency_default || 'XOF' } : res);
  configCacheTime = Date.now();
  return configCache;
}

/**
 * Calcule la répartition (plateforme / autre) pour affichage avant paiement.
 * @param {string} vertical - video_social|marketplace|services|transport|food|telemedicine|property|ticketing|bills|airtime|insurance
 * @param {string} rule - tips|live_gift|creator_subscription|seller|flash_sale|provider|ride|cancellation|restaurant|delivery_fee|consultation|pharmacy|agent_commission|sale|ticket|service_fee|transaction|recharge|brokerage|micro
 * @param {number} amountFcfa - montant en FCFA
 * @param {number} [deliveryFeeFcfa] - pour food + rule delivery_fee
 * @returns {Promise<{ platform?, seller?, creator?, provider?, driver?, organizer?, service_fee?, user_cashback?, ... }>}
 */
export async function getCommissionBreakdown(vertical, rule, amountFcfa, deliveryFeeFcfa = 0) {
  const result = await api.commissions.calculate(vertical, rule, amountFcfa, deliveryFeeFcfa);
  return result || {};
}

/**
 * Retourne le libellé du taux en % pour affichage (ex: 0.1 → "10 %").
 * @param {number} rate - taux décimal (0.1 = 10%)
 */
export function formatCommissionRate(rate) {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${Math.round(Number(rate) * 100)} %`;
}

/**
 * Formate un montant FCFA pour affichage.
 */
export function formatFcfa(amount) {
  if (amount == null || Number.isNaN(amount)) return '0';
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}
