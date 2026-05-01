/**
 * Client QR Pay — paiements P2P et marchand via QR code.
 *
 * Côté A (bénéficiaire) : générer un QR → afficher sur son téléphone.
 * Côté B (payeur) : scanner le QR → valider → débit du wallet.
 *
 * Backend : `backend/src/routes/paymentRequest.routes.ts`.
 */
import apiClient from './client';

export interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  qr_token: string;
  expires_at: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  from_user_id?: string;
  paid_by_id?: string | null;
  paid_at?: string | null;
  description?: string | null;
}

export const paymentRequestApi = {
  /**
   * Créer une demande de paiement. Retourne `qr_token` à encoder dans le QR.
   * `ttl_sec` par défaut 15 min, max 24 h recommandé.
   */
  async create(amount: number, currency: string = 'XOF', ttl_sec?: number): Promise<PaymentRequest> {
    const { data } = await apiClient.post('/payment-request', { amount, currency, ttl_sec });
    return data?.data;
  },

  /**
   * Payer une demande scannée. Le débit est atomique (wallet + ledger + notif).
   */
  async pay(qrToken: string): Promise<{ success: boolean; status?: string; error?: string }> {
    const { data } = await apiClient.post('/payment-request/pay', { qr_token: qrToken });
    return data?.data ?? { success: false };
  },

  /**
   * Détail d'une demande (pour afficher montant + destinataire avant validation).
   * Peut être appelé sans auth si besoin (scan direct).
   */
  async getByToken(qrToken: string): Promise<PaymentRequest | null> {
    try {
      const { data } = await apiClient.get(`/payment-request/${encodeURIComponent(qrToken)}`);
      return data?.data ?? null;
    } catch {
      return null;
    }
  },
};

export default paymentRequestApi;
