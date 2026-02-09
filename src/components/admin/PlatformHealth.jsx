import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, CreditCard, AlertTriangle, Zap } from 'lucide-react';

const STATUS_COLORS = {
  stable: 'bg-emerald-500/20 border-emerald-500 text-emerald-200',
  degraded: 'bg-amber-500/20 border-amber-500 text-amber-200',
  critical: 'bg-red-500/20 border-red-500 text-red-200',
};

export default function PlatformHealth() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['admin-platform-health'],
    queryFn: () => api.admin.getHealth(),
    refetchInterval: 15000,
  });

  if (isLoading || !health) {
    return (
      <Card className="p-4 bg-white/10 backdrop-blur border-white/20 text-white">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Chargement sante plateforme...</span>
        </div>
      </Card>
    );
  }

  const statusClass = STATUS_COLORS[health.status] || STATUS_COLORS.stable;

  return (
    <Card className={`p-4 backdrop-blur border mb-4 ${statusClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Etat plateforme
            <Badge variant="outline">
              {health.status === 'stable' ? 'Stable' : health.status === 'degraded' ? 'Degrade' : 'Critique'}
            </Badge>
          </h3>
        </div>
        <div className="flex flex-wrap gap-6">
          <span><Users className="w-4 h-4 inline mr-1" />{health.users_online ?? 0} en ligne</span>
          <span><CreditCard className="w-4 h-4 inline mr-1" />{health.transactions_last_minute ?? 0} tx/min</span>
          <span><AlertTriangle className="w-4 h-4 inline mr-1" />{health.failed_payments_last_hour ?? 0} echecs/h</span>
          <span><Zap className="w-4 h-4 inline mr-1" />{(health.error_rate_5m ?? 0) * 100}% erreurs</span>
        </div>
      </div>
    </Card>
  );
}
