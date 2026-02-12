import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, ShoppingBag, Package, AlertCircle, Eye, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PAGE = 20;

export default function ModerationPanel({ subTab }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [returnUpdates, setReturnUpdates] = useState({});

  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => api.admin.getOrders({ page, limit: PAGE }),
    enabled: subTab === 'orders',
  });
  const { data: sellersData } = useQuery({
    queryKey: ['admin-sellers', page],
    queryFn: () => api.admin.getSellers({ page, limit: PAGE }),
    enabled: subTab === 'sellers',
  });
  const { data: disputesData } = useQuery({
    queryKey: ['admin-disputes', page],
    queryFn: () => api.admin.getDisputes({ page, limit: PAGE }),
    enabled: subTab === 'disputes',
  });
  const { data: videosData } = useQuery({
    queryKey: ['admin-videos', page],
    queryFn: () => api.videos.list({ page, limit: PAGE }),
    enabled: subTab === 'videos',
  });
  const { data: returnsData } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: () => api.returns.list('admin'),
    enabled: subTab === 'returns',
  });

  const updateReturnMutation = useMutation({
    mutationFn: ({ id, payload }) => api.returns.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      toast.success('Statut retour mis a jour');
    },
    onError: (e) => toast.error(e?.apiMessage || 'Erreur mise a jour retour'),
  });

  const orders = ordersData?.orders ?? [];
  const sellers = sellersData?.sellers ?? [];
  const disputes = disputesData?.disputes ?? [];
  const videos = Array.isArray(videosData) ? videosData : videosData?.videos ?? [];
  const returns = Array.isArray(returnsData) ? returnsData : returnsData?.returns ?? returnsData?.data ?? [];

  const getReturnDraft = (id) => returnUpdates[id] || { status: 'approved', tracking: '' };
  const setReturnDraft = (id, key, value) => {
    setReturnUpdates((prev) => ({
      ...prev,
      [id]: { ...getReturnDraft(id), [key]: value },
    }));
  };

  if (subTab === 'videos') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><Video className="w-5 h-5 inline mr-2" /> Videos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="bg-white/5 rounded-lg overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500" />
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{v.title || 'Sans titre'}</p>
                <Button size="sm" variant="outline" className="mt-2 border-white/20 text-white" onClick={() => navigate('/video/' + v.id)}><Eye className="w-3 h-3 mr-1" />Voir</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <Button size="sm" variant="outline" className="border-white/20 text-white" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec.</Button>
          <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
        </div>
      </Card>
    );
  }

  if (subTab === 'sellers') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><ShoppingBag className="w-5 h-5 inline mr-2" /> Vendeurs</h3>
        <div className="space-y-2">
          {sellers.map((s) => (
            <div key={s.id} className="p-4 bg-white/5 rounded-lg flex justify-between"><div><p className="font-semibold">{s.store_name}</p><p className="text-xs text-white/60">{s.user?.username}</p></div><Badge>{s.status}</Badge></div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <Button size="sm" variant="outline" className="border-white/20 text-white" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec.</Button>
          <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
        </div>
      </Card>
    );
  }

  if (subTab === 'disputes') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><AlertCircle className="w-5 h-5 inline mr-2" /> Litiges</h3>
        <div className="space-y-2">
          {disputes.map((d) => (
            <div key={d.id} className="p-4 bg-white/5 rounded-lg"><p className="font-semibold">{d.reason}</p><p className="text-sm text-white/60">{d.status}</p></div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <Button size="sm" variant="outline" className="border-white/20 text-white" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec.</Button>
          <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
        </div>
      </Card>
    );
  }

  if (subTab === 'orders') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><Package className="w-5 h-5 inline mr-2" /> Commandes</h3>
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="font-mono text-xs">{o.id.slice(0, 8)}</span>
              <span>{(o.total_amount ?? 0).toLocaleString()} XOF</span>
              <Badge>{o.status}</Badge>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <Button size="sm" variant="outline" className="border-white/20 text-white" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec.</Button>
          <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
        </div>
      </Card>
    );
  }

  if (subTab === 'returns') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><RotateCcw className="w-5 h-5 inline mr-2" /> Retours / Echanges</h3>
        <div className="space-y-3">
          {returns.length === 0 && (
            <p className="text-white/70 text-sm">Aucune demande de retour.</p>
          )}
          {returns.map((r) => {
            const draft = getReturnDraft(r.id);
            return (
              <div key={r.id} className="p-4 bg-white/5 rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">Retour #{String(r.id).slice(0, 8)}</p>
                    <p className="text-xs text-white/60">Commande #{String(r.order_id).slice(0, 8)} · user {String(r.user_id).slice(0, 8)}</p>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
                <p className="text-sm text-white/80">
                  Motif: {r.reason || '-'} · Montant: {(r.refund_amount ?? 0).toLocaleString()} FCFA
                </p>
                {r.description && <p className="text-xs text-white/60">{r.description}</p>}
                <div className="grid md:grid-cols-3 gap-2">
                  <select
                    value={draft.status}
                    onChange={(e) => setReturnDraft(r.id, 'status', e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  >
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="processed">processed</option>
                    <option value="completed">completed</option>
                    <option value="exchange_approved">exchange_approved</option>
                    <option value="exchange_in_progress">exchange_in_progress</option>
                    <option value="exchange_completed">exchange_completed</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Tracking retour (optionnel)"
                    value={draft.tracking}
                    onChange={(e) => setReturnDraft(r.id, 'tracking', e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={updateReturnMutation.isPending}
                    onClick={() => updateReturnMutation.mutate({
                      id: r.id,
                      payload: {
                        status: draft.status,
                        return_tracking_number: draft.tracking || undefined,
                      },
                    })}
                  >
                    Mettre a jour
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <h3 className="font-bold mb-4">Signalements</h3>
      <p className="text-white/70">Onglet Litiges pour les litiges. Signalements a venir.</p>
    </Card>
  );
}
