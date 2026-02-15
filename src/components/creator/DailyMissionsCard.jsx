import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';

export default function DailyMissionsCard() {
  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['daily-missions'],
    queryFn: () => api.gamification.getDailyMissions(),
  });

  if (isLoading) return null;
  if (!missions?.length) return null;

  const completed = missions.filter((m) => m.completed).length;

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>Missions du jour</span>
          {completed > 0 && (
            <span className="text-amber-600 font-normal">
              {completed}/{missions.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {missions.map((m) => (
          <div
            key={m.type}
            className={`flex items-center gap-2 text-sm ${m.completed ? 'text-gray-500' : ''}`}
          >
            {m.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-amber-200 shrink-0" />
            )}
            <span className={m.completed ? 'line-through' : ''}>{m.icon} {m.label}</span>
            {!m.completed && <span className="text-amber-600 text-xs">+{m.xp} XP</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
