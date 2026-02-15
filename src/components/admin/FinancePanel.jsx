import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Wallet, AlertTriangle, Lock, Unlock, Radio, ChevronLeft, ChevronRight, Copy, Banknote, Check, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function FinancePanel() {
  const queryClient = useQueryClient();
  const [freezeWalletId, setFreezeWalletId] = useState('');
  const [liveRevenuePage, setLiveRevenuePage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [processForm, setProcessForm] = useState({ id: null, transaction_reference: '', notes: '' });
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [commissionForm, setCommissionForm] = useState({
    marketplaceSellerPct: '10',
    servicesProviderPct: '17.5',
  });

  const { data: finance, isLoading } = useQuery({
    queryKey: ['admin-finance-dashboard'],
    queryFn: () => api.admin.getFinanceDashboard(),
  });
  const { data: commissionCfg } = useQuery({
    queryKey: ['admin-commissions-config'],
    queryFn: () => api.admin.getCommissionConfig(),
  });
  const { data: liveRevenue, isLoading: loadingLiveRevenue } = useQuery({
    queryKey: ['admin-live-revenue', from.toISOString(), to.toISOString(), liveRevenuePage],
    queryFn: () => api.admin.getLiveRevenueByCreator({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      page: liveRevenuePage,
      limit: 10,
    }),
  });
  const { data: pendingWithdrawals, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['admin-withdrawals-pending', withdrawalsPage],
    queryFn: () => api.withdrawals.getPending({ page: withdrawalsPage, limit: 10 }),
  });
  const { data: viralBonuses, isLoading: loadingViralBonuses } = useQuery({
    queryKey: ['admin-viral-bonuses'],
    queryFn: () => api.viralBonuses.getPending(),
  });

  React.useEffect(() => {
    const effective = commissionCfg?.effective;
    if (!effective) return;
    const mkp = Number(effective.marketplace?.seller_commission_default_pct ?? 0.1) * 100;
    const svc = Number(effective.services?.provider_commission_default_pct ?? 0.175) * 100;
    setCommissionForm({
      marketplaceSellerPct: Number.isFinite(mkp) ? String(mkp) : '10',
      servicesProviderPct: Number.isFinite(svc) ? String(svc) : '17.5',
    });
  }, [commissionCfg]);

  const freezeMutation = useMutation({
    mutationFn: (walletId) => api.admin.freezeWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-finance-dashboard'] });
      toast.success('Wallet gele');
      setFreezeWalletId('');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const unfreezeMutation = useMutation({
    mutationFn: (walletId) => api.admin.unfreezeWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-finance-dashboard'] });
      toast.success('Wallet debloque');
      setFreezeWalletId('');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur'),
  });

  const updateCommissionsMutation = useMutation({
    mutationFn: () => {
      const mkp = Number(commissionForm.marketplaceSellerPct);
      const svc = Number(commissionForm.servicesProviderPct);
      if (!Number.isFinite(mkp) || mkp < 0 || mkp > 100) throw new Error('Commission marketplace invalide');
      if (!Number.isFinite(svc) || svc < 0 || svc > 100) throw new Error('Commission services invalide');
      return api.admin.updateCommissionConfig({
        marketplace: { seller_commission_default_pct: mkp / 100 },
        services: { provider_commission_default_pct: svc / 100 },
      }, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commissions-config'] });
      toast.success('Commissions mises a jour');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.message || 'Erreur'),
  });

  const resetCommissionsMutation = useMutation({
    mutationFn: () => api.admin.resetCommissionConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commissions-config'] });
      toast.success('Commissions reinitialisees');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.message || 'Erreur'),
  });

  const processWithdrawalMutation = useMutation({
    mutationFn: ({ id, transaction_reference, notes }) => api.withdrawals.process(id, { transaction_reference, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-finance-dashboard'] });
      setProcessForm({ id: null, transaction_reference: '', notes: '' });
      toast.success('Retrait traite');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.message || 'Erreur'),
  });

  const cancelWithdrawalMutation = useMutation({
    mutationFn: (id) => api.withdrawals.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-finance-dashboard'] });
      toast.success('Retrait annule');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.message || 'Erreur'),
  });

  const payViralBonusMutation = useMutation({
    mutationFn: (id) => api.viralBonuses.pay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-viral-bonuses'] });
      toast.success('Bonus virale paye');
    },
    onError: (e) => toast.error(e?.apiMessage || e?.message || 'Erreur'),
  });

  if (isLoading || !finance) return <div className="text-white/70">Chargement finance...</div>;

  const liveRevenueRows = liveRevenue?.rows ?? [];
  const liveRevenuePagination = liveRevenue?.pagination ?? { page: 1, totalPages: 1, total: 0 };
  const liveRevenueSummary = liveRevenue?.summary ?? {};

  const wallets = finance.wallets || {};
  const transactions = finance.transactions || {};
  const topTransactions = finance.topTransactions || [];
  const alerts = finance.alerts || [];

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5" /> Controle financier</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div><p className="text-sm text-white/70">Solde total wallets</p><p className="text-xl font-bold">{(wallets.totalBalance ?? 0).toLocaleString()} XOF</p></div>
          <div><p className="text-sm text-white/70">Volume 24h</p><p className="text-xl font-bold">{(transactions.volumeLast24h ?? 0).toLocaleString()} XOF</p></div>
          <div><p className="text-sm text-white/70">Volume 30j</p><p className="text-xl font-bold">{(transactions.volumeLast30d ?? 0).toLocaleString()} XOF</p></div>
          <div><p className="text-sm text-white/70">Wallets utilisateur</p><p className="text-xl font-bold">{wallets.totalUserWallets ?? 0}</p></div>
        </div>
        {alerts.length > 0 && (
          <div className="p-3 bg-amber-500/20 rounded-lg flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            <div>{alerts.map((a, i) => <p key={i} className="text-sm">{a}</p>)}</div>
          </div>
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="ID wallet a geler/debloquer"
            value={freezeWalletId}
            onChange={(e) => setFreezeWalletId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white w-64"
          />
          <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => freezeWalletId && freezeMutation.mutate(freezeWalletId)} disabled={!freezeWalletId || freezeMutation.isPending}><Lock className="w-4 h-4 mr-1" />Geler</Button>
          <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => freezeWalletId && unfreezeMutation.mutate(freezeWalletId)} disabled={!freezeWalletId || unfreezeMutation.isPending}><Unlock className="w-4 h-4 mr-1" />Debloquer</Button>
        </div>
        <p className="text-xs text-white/60 mb-2 mt-4">Cliquez sur un wallet pour utiliser son ID :</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {(wallets.list ?? []).length === 0 && <p className="text-white/50 text-sm">Aucun wallet.</p>}
          {(wallets.list ?? []).map((w) => (
            <div
              key={w.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${freezeWalletId === w.id ? 'bg-amber-500/30 border border-amber-500/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
            >
              <button type="button" onClick={() => setFreezeWalletId(w.id)} className="flex-1 text-left min-w-0">
                <span className="font-mono text-white/90" title={w.id}>{w.id.slice(0, 8)}…</span>
                <span className="text-white/70 ml-2">@{w.username ?? w.user_id?.slice(0, 8)}</span>
                <span className="text-emerald-400 ml-2">{(w.balance ?? 0).toLocaleString()} FCFA</span>
                <Badge variant={w.status === 'frozen' ? 'destructive' : 'secondary'} className="ml-2 text-xs">{w.status}</Badge>
              </button>
              <Button size="icon" variant="ghost" className="shrink-0 text-white/60 hover:text-white" onClick={() => { navigator.clipboard?.writeText(w.id); toast.success('ID copié'); }} title="Copier l'ID complet">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Bonus viraux (100K, 500K, 1M vues)</h3>
        <p className="text-sm text-white/70 mb-4">Paiement manuel valide par admin.</p>
        {loadingViralBonuses ? (
          <p className="text-white/60">Chargement...</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto mb-6">
            {((viralBonuses ?? []).length === 0) && <p className="text-white/60 text-sm">Aucun bonus en attente.</p>}
            {(viralBonuses ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                <span className="text-sm">Video {b.video_id?.slice(0, 8)}… • {b.milestone} • {(b.amount_fcfa ?? 0).toLocaleString()} FCFA</span>
                <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => payViralBonusMutation.mutate(b.id)} disabled={payViralBonusMutation.isPending}>Payer</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Banknote className="w-5 h-5" /> Retraits en attente</h3>
        <p className="text-sm text-white/70 mb-4">Demandes de retrait des createurs (tips, live, etc.). Traitez sous 24-48h.</p>
        {loadingWithdrawals ? (
          <p className="text-white/60">Chargement...</p>
        ) : (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {((pendingWithdrawals?.withdrawals ?? []).length === 0) && (
                <p className="text-white/60 text-sm">Aucun retrait en attente.</p>
              )}
              {(pendingWithdrawals?.withdrawals ?? []).map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/10">
                  <div>
                    <p className="font-semibold text-white">{w.user?.username ?? w.user?.full_name ?? w.user_id?.slice(0, 8)}</p>
                    <p className="text-xs text-white/70">
                      {w.payment_method === 'paypal' ? w.paypal_email : w.orange_money_phone} • {(w.amount ?? 0).toLocaleString()} FCFA
                      {w.payment_method === 'paypal' && <Badge variant="outline" className="ml-2 text-xs border-white/30">PayPal</Badge>}
                    </p>
                    <p className="text-xs text-white/50">{new Date(w.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {processForm.id === w.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Ref transaction Orange Money"
                          value={processForm.transaction_reference}
                          onChange={(e) => setProcessForm((s) => ({ ...s, transaction_reference: e.target.value }))}
                          className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm w-48"
                        />
                        <input
                          type="text"
                          placeholder="Notes (optionnel)"
                          value={processForm.notes}
                          onChange={(e) => setProcessForm((s) => ({ ...s, notes: e.target.value }))}
                          className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm w-48"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => processWithdrawalMutation.mutate({ id: w.id, transaction_reference: processForm.transaction_reference, notes: processForm.notes })} disabled={processWithdrawalMutation.isPending}><Check className="w-4 h-4 mr-1" />Valider</Button>
                          <Button size="sm" variant="outline" className="border-white/30 text-white" onClick={() => setProcessForm({ id: null, transaction_reference: '', notes: '' })}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setProcessForm({ id: w.id, transaction_reference: '', notes: '' })} disabled={!!processForm.id}><Check className="w-4 h-4 mr-1" />Traiter</Button>
                        <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20" onClick={() => cancelWithdrawalMutation.mutate(w.id)} disabled={cancelWithdrawalMutation.isPending}>Annuler</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {((pendingWithdrawals?.pagination?.totalPages ?? 1) > 1) && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
                <span className="text-sm text-white/70">Page {withdrawalsPage} / {pendingWithdrawals?.pagination?.totalPages ?? 1}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-white/30 text-white" disabled={withdrawalsPage <= 1} onClick={() => setWithdrawalsPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="border-white/30 text-white" disabled={withdrawalsPage >= (pendingWithdrawals?.pagination?.totalPages ?? 1)} onClick={() => setWithdrawalsPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Wallet className="w-5 h-5" /> Top 10 transactions</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {topTransactions.length === 0 && <p className="text-white/60 text-sm">Aucune transaction.</p>}
          {topTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-sm font-mono">{tx.id.slice(0, 8)}</p>
                <p className="text-xs text-white/60">{tx.user?.username ?? tx.user_id} • {tx.type}</p>
              </div>
              <Badge>{(tx.amount ?? 0).toLocaleString()} {tx.currency ?? 'XOF'}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4">Configuration commissions</h3>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <p className="text-sm text-white/70 mb-1">Marketplace vendeur (%)</p>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white w-full"
              value={commissionForm.marketplaceSellerPct}
              onChange={(e) => setCommissionForm((s) => ({ ...s, marketplaceSellerPct: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-sm text-white/70 mb-1">Services prestataire (%)</p>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white w-full"
              value={commissionForm.servicesProviderPct}
              onChange={(e) => setCommissionForm((s) => ({ ...s, servicesProviderPct: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={updateCommissionsMutation.isPending}
              onClick={() => updateCommissionsMutation.mutate()}
            >
              Sauvegarder
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              disabled={resetCommissionsMutation.isPending}
              onClick={() => resetCommissionsMutation.mutate()}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Radio className="w-5 h-5" /> Revenus Live par créateur (30 derniers jours)</h3>
        <p className="text-sm text-white/70 mb-4">Répartition : 85% créateur, 15% plateforme (CDC Mali)</p>
        {loadingLiveRevenue ? (
          <p className="text-white/60">Chargement...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-white/5">
              <div><p className="text-xs text-white/70">Total cadeaux</p><p className="font-bold text-white">{(liveRevenueSummary.totalGiftsAmount ?? 0).toLocaleString()} FCFA</p></div>
              <div><p className="text-xs text-white/70">Total dons</p><p className="font-bold text-white">{(liveRevenueSummary.totalTipsAmount ?? 0).toLocaleString()} FCFA</p></div>
              <div><p className="text-xs text-white/70">Part créateurs</p><p className="font-bold text-emerald-400">{(liveRevenueSummary.totalCreatorEarnings ?? 0).toLocaleString()} FCFA</p></div>
              <div><p className="text-xs text-white/70">Part plateforme</p><p className="font-bold text-amber-400">{(liveRevenueSummary.totalPlatformCommission ?? 0).toLocaleString()} FCFA</p></div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {liveRevenueRows.length === 0 && <p className="text-white/60 text-sm">Aucun revenu live sur la période.</p>}
              {liveRevenueRows.map((r) => (
                <div key={r.creator_id} className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/10">
                  <div>
                    <p className="font-semibold text-white">{r.creator?.username ?? r.creator?.full_name ?? r.creator_id.slice(0, 8)}</p>
                    <p className="text-xs text-white/70">{r.gifts_count} cadeaux · {r.tips_count} dons · {r.lives_count} lives</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{(r.total_amount ?? 0).toLocaleString()} FCFA</p>
                    <p className="text-xs text-emerald-400">Créateur: {(r.creator_earnings ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-amber-400">Plateforme: {(r.platform_commission ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            {liveRevenuePagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
                <span className="text-sm text-white/70">Page {liveRevenuePage} / {liveRevenuePagination.totalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-white/30 text-white" disabled={liveRevenuePage <= 1} onClick={() => setLiveRevenuePage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="border-white/30 text-white" disabled={liveRevenuePage >= liveRevenuePagination.totalPages} onClick={() => setLiveRevenuePage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
