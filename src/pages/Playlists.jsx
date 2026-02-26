import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Play, Trash2, Edit2, Lock, Globe } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get('_userId');
  const [user, setUser] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate]);

  // Fetch playlists
  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists', viewUserId || user?.id],
    queryFn: async () => {
      const result = await api.entities.Playlist.filter({
        creator_id: viewUserId || user?.id
      });
      return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!(viewUserId || user?.id)
  });

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: (name) => api.entities.Playlist.create({
      creator_id: user.id,
      creator_name: user.full_name || user.email?.split('@')[0],
      title: name,
      visibility: 'private'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists', user.id] });
      setNewPlaylistName('');
      setIsCreating(false);
      toast.success('Playlist créée');
    }
  });

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: (playlistId) => api.entities.Playlist.delete(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist supprimée');
    }
  });

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Entrez un nom');
      return;
    }
    createPlaylistMutation.mutate(newPlaylistName);
  };

  const isViewingOwnPlaylists = !viewUserId || viewUserId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">Playlists</h1>
          {isViewingOwnPlaylists && (
            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="bg-blue-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nouvelle
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : playlists?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Aucune playlist</p>
            {isViewingOwnPlaylists && (
              <Button onClick={() => setIsCreating(true)} className="bg-blue-500">
                Créer une playlist
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {playlists?.map((playlist) => (
                <motion.div
                  key={playlist.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => navigate(createPageUrl('PlaylistView') + `?playlistId=${playlist.id}`)}
                  className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition-all cursor-pointer group"
                >
                  {/* Cover */}
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 h-32 flex items-center justify-center overflow-hidden">
                    {playlist.cover_image ? (
                      <img src={playlist.cover_image} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all">
                        <Play className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {playlist.videos_count} vidéos
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-bold text-gray-900 truncate">{playlist.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {playlist.visibility === 'private' ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        {playlist.visibility}
                      </span>
                      {isViewingOwnPlaylists && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => navigate(createPageUrl('PlaylistView') + `?playlistId=${playlist.id}&edit=true`)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-600"
                            onClick={() => {
                              if (confirm('Supprimer cette playlist?')) {
                                deletePlaylistMutation.mutate(playlist.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nom de la playlist"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
            />
            <Button
              onClick={handleCreatePlaylist}
              disabled={createPlaylistMutation.isPending}
              className="w-full bg-blue-500"
            >
              {createPlaylistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

