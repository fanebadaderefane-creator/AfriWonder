import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const PAGE_SIZE = 50;

export default function AuditPanel() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => api.admin.getAuditLogs({ page, limit: PAGE_SIZE }),
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1 };

  if (isLoading) return <div className="text-white/70">Chargement journal audit...</div>;

  return (
    <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-white">
      <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Journal d audit (traçabilite totale)</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {logs.length === 0 && <p className="text-white/60 text-sm">Aucun log.</p>}
        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-white/5 rounded-lg text-sm font-mono">
            <span className="text-white/60">{log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : ''}</span>
            {' '}<span className="text-amber-300">{log.action_type}</span>
            {log.target_type && <span> • {log.target_type}{log.target_id ? ' #' + log.target_id.slice(0, 8) : ''}</span>}
            {log.metadata && <span className="text-white/50"> {JSON.stringify(log.metadata)}</span>}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
        <span className="text-sm text-white/60">Page {pagination.page} / {pagination.totalPages || 1}</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border border-white/20 text-white text-sm disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Precedent</button>
          <button className="px-3 py-1 rounded border border-white/20 text-white text-sm" onClick={() => setPage((p) => p + 1)}>Suivant</button>
        </div>
      </div>
    </Card>
  );
}
