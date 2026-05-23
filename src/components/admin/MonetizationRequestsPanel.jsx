import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

export default function MonetizationRequestsPanel() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-monetization-requests'],
    queryFn: () => api.admin.getMonetizationRequests(),
  });

  const [processingId, setProcessingId] = React.useState(null);

  const approveMutation = useMutation({
    mutationFn: (id) => {
      setProcessingId(id);
      return api.admin.approveMonetizationRequest(id);
    },
    onSettled: () => setProcessingId(null),
    onSuccess: (res) => {
      toast.success(res.message || 'Monétisation activée');
      queryClient.invalidateQueries({ queryKey: ['admin-monetization-requests'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || e?.message || 'Erreur'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => {
      setProcessingId(id);
      return api.admin.rejectMonetizationRequest(id, reason);
    },
    onSettled: () => setProcessingId(null),
    onSuccess: () => {
      toast.success('Demande rejetée');
      queryClient.invalidateQueries({ queryKey: ['admin-monetization-requests'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || e?.message || 'Erreur'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes de monétisation</CardTitle>
        <p className="text-sm text-gray-500">
          Les créateurs ayant rempli les conditions peuvent envoyer une demande. Validez ou rejetez ici.
        </p>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Aucune demande en attente</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={req.creator?.profile_image} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{req.creator?.full_name || req.creator?.username}</p>
                    <p className="text-sm text-gray-500">@{req.creator?.username} • {req.creator?.email}</p>
                    <p className="text-xs text-gray-400">
                      Demande le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => approveMutation.mutate(req.id)}
                    disabled={!!processingId}
                  >
                    {processingId === req.id && approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span className="ml-1">Approuver</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => rejectMutation.mutate({ id: req.id, reason: 'Refusé par l\'équipe' })}
                    disabled={!!processingId}
                  >
                    {processingId === req.id && rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    <span className="ml-1">Rejeter</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
