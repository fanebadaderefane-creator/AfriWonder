import React, { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Sondage vidéo (phase 23) — chargé à la demande sur la slide active pour limiter les requêtes.
 */
export default function FeedVideoPoll({ videoId, isActive, compact = true, className }) {
  const queryClient = useQueryClient();
  const qk = ['video-poll', videoId];

  const { data: poll, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => api.videos.getPoll(videoId),
    enabled: Boolean(videoId) && Boolean(isActive),
    staleTime: 15_000,
  });

  const voteMutation = useMutation({
    mutationFn: (option_index) => api.videos.votePoll(videoId, option_index),
    onSuccess: (next) => {
      queryClient.setQueryData(qk, next);
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || 'Vote impossible';
      toast.error(String(msg));
    },
  });

  const onVote = useCallback(
    (idx) => {
      voteMutation.mutate(idx);
    },
    [voteMutation]
  );

  if (!compact || !videoId || !isActive) return null;
  if (isLoading && !poll) {
    return (
      <div className={cn('rounded-xl border border-white/10 bg-black/35 px-2 py-1.5 text-[10px] text-white/55', className)}>
        Sondage…
      </div>
    );
  }
  if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) return null;

  const total = poll.total_votes || 0;
  const expired = poll.expired;

  return (
    <div
      className={cn(
        'max-w-[200px] rounded-xl border border-white/12 bg-black/55 px-2.5 py-2 shadow-lg backdrop-blur-md',
        className
      )}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/75">Sondage</p>
      <div className="flex flex-col gap-1">
        {poll.options.map((label, idx) => {
          const count = Number(poll.counts?.[idx] ?? 0);
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMine = poll.my_vote === idx;
          return (
            <button
              key={`${idx}-${label}`}
              type="button"
              disabled={expired || voteMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!expired) onVote(idx);
              }}
              className={cn(
                'relative overflow-hidden rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition-colors',
                isMine ? 'border-amber-300/50 bg-amber-500/15 text-white' : 'border-white/10 bg-white/5 text-white/90',
                expired && 'opacity-60',
                !expired && 'hover:bg-white/10'
              )}
            >
              <span className="relative z-[1] block truncate">{label}</span>
              {total > 0 && (
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 bg-white/12"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative z-[1] float-right text-[10px] tabular-nums text-white/70">
                {count}
                {total > 0 ? ` (${pct}%)` : ''}
              </span>
            </button>
          );
        })}
      </div>
      {expired ? (
        <p className="mt-1 text-[9px] text-white/45">Expiré</p>
      ) : (
        <p className="mt-1 text-[9px] text-white/45">Résultats en direct · fin sous 24h</p>
      )}
    </div>
  );
}
