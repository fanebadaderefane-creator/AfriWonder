import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, ShoppingBag, Package, AlertCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PAGE = 20;

export default function ModerationPanel({ subTab }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

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

  const orders = ordersData?.orders ?? [];
  const sellers = sellersData?.sellers ?? [];
  const disputes = disputesData?.disputes ?? [];
  const videos = Array.isArray(videosData) ? videosData : videosData?.videos ?? [];

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

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <h3 className="font-bold mb-4">Signalements</h3>
      <p className="text-white/70">Onglet Litiges pour les litiges. Signalements a venir.</p>
    </Card>
  );
}
