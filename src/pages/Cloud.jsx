import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Upload, File, Trash2, FolderOpen } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' Ko';
  return (n / (1024 * 1024)).toFixed(1) + ' Mo';
}

export default function Cloud() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [folder, setFolder] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cloud', folder],
    queryFn: () => api.cloud.list({ folder: folder || undefined, limit: 100 }),
  });
  const uploadMutation = useMutation({
    mutationFn: ({ file, folder: f }) => api.cloud.upload(file, f),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cloud'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (fileId) => api.cloud.delete(fileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cloud'] }),
  });

  const items = data?.items ?? [];

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ file, folder });
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="sticky top-0 z-10 bg-slate-950/95 border-b border-white/10 flex items-center gap-2 px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-primary">Cloud</h1>
      </header>
      <div className="p-3 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Dossier (optionnel)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50"
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            className="rounded-xl bg-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
        {uploadMutation.isError && (
          <p className="text-red-400 text-sm">{uploadMutation.error?.apiMessage || 'Erreur upload'}</p>
        )}
        {isLoading ? (
          <p className="text-white/60 text-sm">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-white/50">
                <FolderOpen className="w-12 h-12 mb-2" />
                <p className="text-sm">Aucun fichier. Cliquez sur + pour envoyer.</p>
              </div>
            )}
            {items.map((f) => (
              <Card key={f.id} className="bg-white/5 border-white/10">
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 flex-1"
                  >
                    <File className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="truncate text-sm text-white">{f.name}</span>
                    <span className="text-white/50 text-xs flex-shrink-0">{formatBytes(f.size_bytes)}</span>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-red-400 hover:text-red-300"
                    onClick={() => deleteMutation.mutate(f.id)}
                    disabled={deleteMutation.isPending}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
