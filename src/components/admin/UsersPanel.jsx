import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Ban, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function UsersPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, pageSize],
    queryFn: () => api.admin.getUsers({ page, limit: pageSize }),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }) => api.admin.banUser(userId, { reason: reason || 'Violation des conditions', banType: 'temporary_ban', durationDays: 7 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur banni');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur'),
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  if (isLoading) return <div className="text-white/70">Chargement utilisateurs...</div>;

  const limit = pagination.limit ?? 20;
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * limit + 1;
  const endItem = Math.min(pagination.page * limit, pagination.total);

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Utilisateurs ({pagination.total})</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Par page :</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="bg-white/20 hover:bg-white/30 border-none"><Filter className="w-4 h-4 mr-2" />Filtrer</Button>
        </div>
      </div>
      <p className="text-sm text-white/50 mb-2">
        {pagination.total > 0 ? `Affichage ${startItem}–${endItem} sur ${pagination.total}` : 'Aucun utilisateur'}
      </p>
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                {(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{u.full_name || u.username || 'Utilisateur'}</p>
                <p className="text-xs text-white/60">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}>{u.role}</Badge>
              {u.role !== 'admin' && (
                <Button size="sm" variant="destructive" onClick={() => banMutation.mutate({ userId: u.id })} disabled={banMutation.isPending}><Ban className="w-4 h-4" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between items-center gap-3 mt-4 pt-4 border-t border-white/10">
        <span className="text-sm text-white/60">
          Page {pagination.page} / {pagination.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white"
            disabled={pagination.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white"
            disabled={pagination.page >= (pagination.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
