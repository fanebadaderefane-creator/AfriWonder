import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Wallet, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

export default function FinancePanel() {
  const queryClient = useQueryClient();
  const [freezeWalletId, setFreezeWalletId] = useState('');
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

  if (isLoading || !finance) return <div className="text-white/70">Chargement finance...</div>;

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
    </div>
  );
}
