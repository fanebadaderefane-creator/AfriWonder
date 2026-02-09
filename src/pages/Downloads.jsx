import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Play, Trash2, Download, WifiOff, HardDrive, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/navigation/BottomNav';
import { toast } from 'sonner';
import offlineCacheService from '@/services/offlineCache.service.js';

function formatBytes(bytes) {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Downloads() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [quota, setQuota] = useState({ quota: null, usage: null });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, used, q] = await Promise.all([
        offlineCacheService.listCachedDownloads(),
        offlineCacheService.getTotalUsedBytes(),
        offlineCacheService.getQuota(),
      ]);
      setList(items || []);
      setTotalBytes(used || 0);
      setQuota(q || {});
    } catch (e) {
      console.error(e);
      setList([]);
      setTotalBytes(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item) => {
    setDeletingId(item.id);
    try {
      await offlineCacheService.removeMedia(item.id, item.mediaUrl);
      await load();
      toast.success('Téléchargement supprimé');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlay = (item) => {
    const url = offlineCacheService.getMediaPlaybackUrl(item.mediaUrl);
    window.open(`/VideoView?id=${item.id}`, '_blank');
  };

  const quotaUsed = quota.usage != null ? quota.usage : null;
  const quotaTotal = quota.quota != null ? quota.quota : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">Téléchargements</h1>
        </div>
      </div>

      <div className="p-4">
        <Card className="p-4 mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">{list.length} contenu(s)</p>
                <p className="text-sm text-white/80">
                  {formatBytes(totalBytes)} utilisés
                  {quotaTotal != null && (
                    <span className="block text-white/70">
                      Quota: {formatBytes(quotaUsed)} / {formatBytes(quotaTotal)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Consultables hors ligne</span>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <Download className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-600 mb-2">Aucun téléchargement</h3>
            <p className="text-sm text-gray-400 mb-4">
              Téléchargez des vidéos depuis une lecture (bouton Télécharger) pour les regarder hors ligne.
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Parcourir les vidéos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <Card key={item.id} className="p-3 flex items-center gap-3">
                <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play
                      className="w-6 h-6 text-white fill-white cursor-pointer"
                      onClick={() => handlePlay(item)}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.creator || '—'}</p>
                  <p className="text-xs text-gray-400">{formatBytes(item.sizeBytes || 0)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:bg-red-50 shrink-0"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
