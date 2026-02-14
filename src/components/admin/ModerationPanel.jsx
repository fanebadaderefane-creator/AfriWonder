import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, ShoppingBag, Package, AlertCircle, Eye, RotateCcw, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getVideoPlaybackUrl } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE = 20;

/** Affiche une frame de la vidéo quand la miniature est absente */
function VideoFrameThumbnail({ videoUrl, onError }) {
  return (
    <video
      src={getVideoPlaybackUrl(videoUrl)}
      className="w-full h-full object-cover"
      preload="metadata"
      muted
      playsInline
      onLoadedMetadata={(e) => {
        const el = e.currentTarget;
        if (el?.duration) el.currentTime = Math.min(1, el.duration / 10);
      }}
      onLoadedData={(e) => {
        const el = e.currentTarget;
        if (el?.duration && el.currentTime === 0) el.currentTime = Math.min(1, el.duration / 10);
      }}
      onError={onError}
    />
  );
}

/** Carte miniature : thumbnail_url, sinon frame vidéo, sinon icône */
function VideoCardThumbnail({ video }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const hasThumb = !!video.thumbnail_url;
  const hasVideo = !!video.video_url;
  const showImg = hasThumb && !thumbFailed;
  const showVideoFrame = hasVideo && !videoFailed && (!hasThumb || thumbFailed);
  const showFallback = !showImg && !showVideoFrame;

  return (
    <div className="group relative aspect-video bg-gradient-to-br from-purple-600 to-pink-600">
      {showImg && (
        <img
          src={video.thumbnail_url}
          alt={video.title || 'Vidéo'}
          className="w-full h-full object-cover"
          onError={() => setThumbFailed(true)}
        />
      )}
      {showVideoFrame && (
        <VideoFrameThumbnail
          videoUrl={video.video_url}
          onError={() => setVideoFailed(true)}
        />
      )}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
          <Video className="w-12 h-12 text-white/60" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
          <Play className="w-6 h-6 text-purple-600 fill-purple-600" />
        </div>
      </div>
    </div>
  );
}

export default function ModerationPanel({ subTab }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [returnUpdates, setReturnUpdates] = useState({});

  useEffect(() => {
    setPage(1);
  }, [subTab]);

  const videosPaginationData = videosData?.pagination;
  const videosTotalPages = videosPaginationData?.totalPages ?? 1;
  useEffect(() => {
    if (subTab === 'videos' && videosTotalPages >= 1 && page > videosTotalPages) {
      setPage(videosTotalPages);
    }
  }, [subTab, page, videosTotalPages]);

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
    const videosPagination = videosData?.pagination ?? { page: 1, totalPages: 1, total: 0 };
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Video className="w-5 h-5" /> Vidéos ({videosPagination.total ?? videos.length})</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="rounded-xl overflow-hidden border border-white/20 bg-white/10 hover:bg-white/15 transition-colors">
              {/* Miniature : thumbnail_url, sinon frame vidéo, sinon icône */}
              <VideoCardThumbnail video={v} />
              {/* Contenu : titre + bouton — texte bien visible */}
              <div className="p-3 bg-white/10 border-t border-white/10">
                <p className="font-semibold text-sm text-white truncate" title={v.title || 'Sans titre'}>
                  {v.title || 'Sans titre'}
                </p>
                {v.creator_name && (
                  <p className="text-xs text-white/70 truncate mt-0.5">@{v.creator_name}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full border-white/30 text-white hover:bg-white/20"
                  onClick={() => navigate(createPageUrl('VideoView') + `?id=${v.id}`)}
                >
                  <Eye className="w-3 h-3 mr-1" />Voir
                </Button>
              </div>
            </div>
          ))}
        </div>
        {videos.length === 0 && (
          <p className="text-white font-medium text-center py-12 rounded-lg border border-dashed border-white/30 bg-white/5">Aucune vidéo</p>
        )}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
          <span className="text-sm text-white font-medium">Page {page} / {videosPagination.totalPages || 1}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />Préc.
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={page >= (videosPagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>
              Suiv.<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (subTab === 'sellers') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><ShoppingBag className="w-5 h-5 inline mr-2" /> Vendeurs</h3>
        <div className="space-y-2">
          {sellers.length === 0 && <p className="text-white font-medium text-center py-8 rounded-lg border border-dashed border-white/30 bg-white/5">Aucun vendeur</p>}
          {sellers.map((s) => (
            <div key={s.id} className="p-4 rounded-lg border border-white/20 bg-white/10 flex justify-between"><div><p className="font-semibold text-white">{s.store_name}</p><p className="text-xs text-white/70">{s.user?.username}</p></div><Badge>{s.status}</Badge></div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
          <span className="text-sm text-white font-medium">Page {page}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />Préc.
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setPage((p) => p + 1)}>
              Suiv.<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (subTab === 'disputes') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><AlertCircle className="w-5 h-5 inline mr-2" /> Litiges</h3>
        <div className="space-y-2">
          {disputes.length === 0 && <p className="text-white font-medium text-center py-8 rounded-lg border border-dashed border-white/30 bg-white/5">Aucun litige</p>}
          {disputes.map((d) => (
            <div key={d.id} className="p-4 rounded-lg border border-white/20 bg-white/10"><p className="font-semibold text-white">{d.reason}</p><p className="text-sm text-white/70">{d.status}</p></div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
          <span className="text-sm text-white font-medium">Page {page}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />Préc.
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setPage((p) => p + 1)}>
              Suiv.<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (subTab === 'orders') {
    return (
      <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
        <h3 className="font-bold mb-4"><Package className="w-5 h-5 inline mr-2" /> Commandes</h3>
        <div className="space-y-2">
          {orders.length === 0 && <p className="text-white font-medium text-center py-8 rounded-lg border border-dashed border-white/30 bg-white/5">Aucune commande</p>}
          {orders.map((o) => (
            <div key={o.id} className="flex justify-between p-3 rounded-lg border border-white/20 bg-white/10">
              <span className="font-mono text-xs text-white">{o.id.slice(0, 8)}</span>
              <span className="text-white">{(o.total_amount ?? 0).toLocaleString()} XOF</span>
              <Badge>{o.status}</Badge>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
          <span className="text-sm text-white font-medium">Page {page}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />Préc.
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setPage((p) => p + 1)}>
              Suiv.<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
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
              <div key={r.id} className="p-4 rounded-lg border border-white/20 bg-white/10 space-y-3">
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
