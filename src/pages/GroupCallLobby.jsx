/**
 * Lobby appel groupe — API group-calls + média Agora RTC (mode communication) si le backend expose AGORA_*.
 */
import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Copy,
  Loader2,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  Mic,
  MicOff,
} from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/navigation/BottomNav';
import { cn } from '@/lib/utils';
import { useAgoraGroupCall } from '@/hooks/useAgora';
import { useGroupCallLobbySocket } from '@/hooks/useGroupCallLobbySocket';

function AgoraRemoteVideoTile({ videoTrack }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!videoTrack || !ref.current) return undefined;
    videoTrack.play(ref.current);
    return () => {
      try {
        videoTrack.stop();
      } catch (_) {
        /* ignore */
      }
    };
  }, [videoTrack]);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

const UI = {
  title: 'Appel groupe',
  back: 'Retour',
  participants: 'Participants',
  copyLink: 'Copier le lien d’invitation',
  copied: 'Lien copié',
  copyError: 'Copie impossible',
  leave: 'Quitter l’appel',
  leaveSuccess: 'Vous avez quitté l’appel',
  leaveError: 'Impossible de quitter',
  joinError: 'Impossible de rejoindre l’appel',
  loadError: 'Appel introuvable ou terminé',
  ended: 'Cet appel est terminé.',
  hint: 'Partagez le lien pour que d’autres membres rejoignent. Avec Agora configuré sur le serveur, l’audio et la vidéo s’activent automatiquement.',
  remoteVideo: 'Autres participants',
  audioActive: 'Appel audio — votre micro est actif.',
  micOn: 'Micro activé',
  micOff: 'Micro coupé',
  camOn: 'Caméra activée',
  camOff: 'Caméra coupée',
  audio: 'Audio',
  video: 'Vidéo',
  callEndedByHost: 'L’appel a été terminé.',
};

export default function GroupCallLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const callId = searchParams.get('callId') || '';
  const groupId = searchParams.get('groupId') || '';

  const [joinAttempted, setJoinAttempted] = useState(false);

  const goBack = useCallback(() => {
    if (groupId) {
      navigate(`${createPageUrl('GroupChat')}?groupId=${encodeURIComponent(groupId)}`);
      return;
    }
    navigate(-1);
  }, [navigate, groupId]);

  useEffect(() => {
    if (!callId || !currentUser?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await api.groupCalls.join(callId);
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['group-call', callId] });
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.response?.data?.error?.message ??
            err?.response?.data?.message ??
            err?.message ??
            UI.joinError;
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setJoinAttempted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callId, currentUser?.id, queryClient]);

  const {
    data: call,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['group-call', callId],
    queryFn: () => api.groupCalls.getById(callId),
    enabled: !!callId && !!currentUser?.id && joinAttempted,
    refetchInterval: (q) => (q.state.data?.status === 'active' ? 3500 : false),
  });

  const { data: rtcPayload } = useQuery({
    queryKey: ['group-call-token', callId],
    queryFn: () => api.groupCalls.getToken(callId),
    enabled: Boolean(callId && currentUser?.id && joinAttempted && call?.status === 'active'),
    staleTime: 20 * 60 * 1000,
  });

  const localVideoRef = useRef(null);
  const {
    leave: leaveAgora,
    error: agoraError,
    remoteUsers,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    hasCameraTrack,
  } = useAgoraGroupCall(rtcPayload?.agora, localVideoRef, {
    audioOnly: rtcPayload?.callType === 'audio',
  });

  useEffect(() => {
    if (agoraError) toast.error(agoraError);
  }, [agoraError]);

  const [hangupBusy, setHangupBusy] = useState(false);

  const leaveMutation = useMutation({
    mutationFn: () => api.groupCalls.leave(callId),
    onSuccess: () => {
      toast.success(UI.leaveSuccess);
      queryClient.removeQueries({ queryKey: ['group-call', callId] });
      goBack();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? UI.leaveError);
    },
  });

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || !call?.id) return '';
    return `${window.location.origin}${createPageUrl('GroupCallLobby')}?callId=${encodeURIComponent(call.id)}${groupId ? `&groupId=${encodeURIComponent(groupId)}` : ''}`;
  }, [call?.id, groupId]);

  const handleCopy = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(
      () => toast.success(UI.copied),
      () => toast.error(UI.copyError)
    );
  }, [inviteLink]);

  const handleLeaveCall = useCallback(async () => {
    if (hangupBusy || leaveMutation.isPending) return;
    setHangupBusy(true);
    try {
      await leaveAgora();
      leaveMutation.mutate();
    } finally {
      setHangupBusy(false);
    }
  }, [hangupBusy, leaveAgora, leaveMutation]);

  const leaveAgoraRef = useRef(() => Promise.resolve());
  useEffect(() => {
    leaveAgoraRef.current = leaveAgora;
  }, [leaveAgora]);

  const onRemoteCallEnded = useCallback(() => {
    toast.info(UI.callEndedByHost);
    queryClient.setQueryData(['group-call', callId], (old) => {
      if (!old || typeof old !== 'object') return old;
      return { ...old, status: 'ended' };
    });
    void (async () => {
      await leaveAgoraRef.current?.();
      goBack();
    })();
  }, [callId, queryClient, goBack]);

  useGroupCallLobbySocket({
    userId: currentUser?.id,
    groupId,
    callId,
    enabled: Boolean(callId && currentUser?.id && call?.status === 'active'),
    onCallEnded: onRemoteCallEnded,
  });

  if (!callId) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#070a12] text-white">
        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Inbox'))}
            className="rounded-xl text-white/85 hover:bg-white/10"
            aria-label={UI.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">{UI.title}</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/55">
          <p>Lien d’appel invalide.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!currentUser?.id) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#070a12] text-white">
        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Inbox'))}
            className="rounded-xl text-white/85 hover:bg-white/10"
            aria-label={UI.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">{UI.title}</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-white/65">Connectez-vous pour rejoindre l’appel.</p>
          <Button className="mt-6 rounded-full bg-white text-slate-900 hover:bg-white/90" onClick={() => navigate(createPageUrl('Inbox'))}>
            Retour aux messages
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const loadErrMsg =
    error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error?.message ?? UI.loadError;

  const inActiveCall = Boolean(
    callId &&
      currentUser?.id &&
      joinAttempted &&
      !isPending &&
      !isError &&
      call?.status === 'active'
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#070a12] text-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="rounded-xl text-white/85 hover:bg-white/10"
          aria-label={UI.back}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{UI.title}</h1>
          {call ? (
            <p className="truncate text-xs text-white/45">
              {call.type === 'audio' ? (
                <span className="inline-flex items-center gap-1">
                  <Mic className="h-3 w-3" /> {UI.audio}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3 w-3" /> {UI.video}
                </span>
              )}
              {' · '}
              {call.room_id}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-28 pt-4">
        {isPending || !joinAttempted ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400/70" aria-hidden />
          </div>
        ) : isError || !call ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-sm text-white/65">{loadErrMsg}</p>
            <Button className="mt-6 rounded-full bg-white text-slate-900 hover:bg-white/90" onClick={goBack}>
              {UI.back}
            </Button>
          </div>
        ) : call.status !== 'active' ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <PhoneOff className="mb-3 h-12 w-12 text-white/35" aria-hidden />
            <p className="text-sm text-white/65">{UI.ended}</p>
            <Button className="mt-6 rounded-full bg-white text-slate-900 hover:bg-white/90" onClick={goBack}>
              {UI.back}
            </Button>
          </div>
        ) : (
          <>
            {rtcPayload?.agora ? (
              <div className="mb-4 space-y-3">
                {rtcPayload.callType === 'audio' ? (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100/95">
                    {UI.audioActive}
                  </div>
                ) : (
                  <div className="relative mx-auto aspect-video w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-black">
                    <div ref={localVideoRef} className="h-full w-full" />
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] text-white/90">
                      Vous
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-white/20 bg-white/[0.08] text-white hover:bg-white/15"
                    onClick={() => toggleMic()}
                    aria-label={micOn ? UI.micOn : UI.micOff}
                  >
                    {micOn ? <Mic className="mr-1.5 h-4 w-4" /> : <MicOff className="mr-1.5 h-4 w-4" />}
                    {micOn ? UI.micOn : UI.micOff}
                  </Button>
                  {hasCameraTrack ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-white/20 bg-white/[0.08] text-white hover:bg-white/15"
                      onClick={() => toggleCam()}
                      aria-label={camOn ? UI.camOn : UI.camOff}
                    >
                      {camOn ? <Video className="mr-1.5 h-4 w-4" /> : <VideoOff className="mr-1.5 h-4 w-4" />}
                      {camOn ? UI.camOn : UI.camOff}
                    </Button>
                  ) : null}
                </div>
                {remoteUsers.filter((r) => r.videoTrack).length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">{UI.remoteVideo}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {remoteUsers
                        .filter((r) => r.videoTrack)
                        .map((r) => (
                          <AgoraRemoteVideoTile key={String(r.uid)} videoTrack={r.videoTrack} />
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white/55">
                <Users className="h-4 w-4 shrink-0 text-emerald-400/80" aria-hidden />
                <p className="leading-snug">{rtcPayload?.message || UI.hint}</p>
              </div>
            )}

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">{UI.participants}</p>
            <ul className="space-y-2">
              {(call.participants || []).map((p) => {
                const u = p.user;
                const label = u?.full_name || u?.username || p.user_id || 'Membre';
                const initial = (label[0] || '?').toUpperCase();
                const isHost = p.role === 'host';
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5"
                  >
                    <Avatar className="h-10 w-10 rounded-xl ring-1 ring-white/10">
                      <AvatarImage src={u?.profile_image || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-white/10 text-sm text-white">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/90">{label}</p>
                      {isHost ? <p className="text-[11px] text-emerald-300/90">Hôte</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'rounded-xl border-white/20 bg-white/[0.06] text-white hover:bg-white/10'
                )}
                onClick={handleCopy}
                disabled={!inviteLink}
              >
                <Copy className="mr-2 h-4 w-4" />
                {UI.copyLink}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl bg-red-600/90 hover:bg-red-600"
                disabled={hangupBusy || leaveMutation.isPending}
                onClick={() => handleLeaveCall()}
              >
                {hangupBusy || leaveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PhoneOff className="mr-2 h-4 w-4" />
                )}
                {UI.leave}
              </Button>
            </div>
          </>
        )}
      </div>
      {!inActiveCall ? <BottomNav /> : null}
    </div>
  );
}
