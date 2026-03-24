import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LifeBuoy, ShieldAlert, Filter, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  open: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  in_progress: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  resolved: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  closed: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
};

export default function SupportTicketsPanel() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('all');

  const params = useMemo(
    () => (category === 'e2ee_diagnostic' ? { category, limit: 50 } : { limit: 50 }),
    [category]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-tickets', params],
    queryFn: () => api.support.listAllTickets(params),
  });

  const tickets = data?.tickets || [];

  const markResolved = async (id) => {
    try {
      await api.support.updateTicketStatus(id, 'resolved');
      toast.success('Ticket marqué comme résolu');
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    } catch {
      toast.error('Impossible de mettre à jour le ticket');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5" />
            <h3 className="font-semibold">Support tickets</h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/70" />
            <Button
              size="sm"
              variant={category === 'all' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setCategory('all')}
            >
              Tous
            </Button>
            <Button
              size="sm"
              variant={category === 'e2ee_diagnostic' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setCategory('e2ee_diagnostic')}
            >
              <ShieldAlert className="w-4 h-4 mr-1" />
              Diagnostic E2EE
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
        {isLoading ? (
          <p className="text-white/70">Chargement des tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="text-white/70">Aucun ticket trouvé pour ce filtre.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const isE2ee = String(ticket?.subject || '').toLowerCase().includes('diagnostic e2ee');
              const statusClass = STATUS_STYLES[ticket?.status] || STATUS_STYLES.open;
              return (
                <div key={ticket.id} className="rounded-xl border border-white/15 bg-white/[0.04] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{ticket.subject || 'Ticket support'}</p>
                      <p className="text-xs text-white/65">
                        {ticket.user?.email || ticket.user?.username || ticket.user_id} ·{' '}
                        {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isE2ee && (
                        <Badge className="bg-orange-500/20 text-orange-200 border border-orange-500/40">
                          E2EE
                        </Badge>
                      )}
                      <Badge className={`border ${statusClass}`}>{ticket.status || 'open'}</Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => markResolved(ticket.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Marquer résolu
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

