import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export default function VerificationsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verifications', page, statusFilter],
    queryFn: () =>
      api.admin.getVerifications({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.admin.updateVerification(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      toast.success('Statut mis à jour');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur'),
  });

  const verifications = data?.verifications ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  if (isLoading) return <div className="text-white/70">Chargement KYC...</div>;

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold flex items-center gap-2">
          <UserCheck className="w-5 h-5" /> Vérifications KYC ({pagination.total})
        </h3>
        <div className="flex gap-2">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <Button
              key={s || 'all'}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              className={statusFilter === s ? 'bg-white text-purple-600' : 'border-white/20 text-white'}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s || 'Toutes'}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {verifications.length === 0 && (
          <p className="text-white/60 text-sm py-8 text-center">Aucune demande de vérification</p>
        )}
        {verifications.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 gap-4"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                {(v.user?.full_name || v.user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{v.user?.full_name || v.user?.username || 'Utilisateur'}</p>
                <p className="text-xs text-white/60 truncate">{v.user?.email}</p>
                <p className="text-xs text-white/50 mt-0.5">{v.document_type} · {new Date(v.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              {v.document_url && (
                <a
                  href={v.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-blue-400 hover:text-blue-300"
                  title="Voir document"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                className={
                  v.status === 'approved'
                    ? 'bg-green-500'
                    : v.status === 'rejected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }
              >
                {v.status}
              </Badge>
              {v.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 border-none"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: v.id, status: 'approved' })}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: v.id, status: 'rejected' })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
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
            Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white"
            disabled={pagination.page >= (pagination.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </Card>
  );
}
