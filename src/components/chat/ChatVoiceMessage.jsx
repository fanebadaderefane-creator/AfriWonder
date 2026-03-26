import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Mic, Check, CheckCheck, Loader2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  VOICE_UI,
  getProgress01,
  isBarPlayed,
  seekRatioFromClientX,
} from '@/components/chat/voiceMessageUi';

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h) || 1;
}

function seededHeights(seed, n) {
  let s = seed;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    out.push(0.22 + (s / 233280) * 0.78);
  }
  return out;
}

function WaPlayIcon({ className, fill }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden fill={fill}>
      <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z" />
    </svg>
  );
}

function WaPauseIcon({ className, fill }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden fill={fill}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function formatVoiceDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useVoiceAudio(src) {
  const audioRef = useRef(null);
  const inferredLenRef = useRef(0);
  const [duration, setDuration] = useState(0);
  /** Basé sur buffer / position — réactif pour que la barre ne « saute » pas à 100 % sur un faux total de 0,5 s. */
  const [inferredTotal, setInferredTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const pullDuration = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    let inferredBump = inferredLenRef.current;

    const apply = (d) => {
      if (Number.isFinite(d) && d > 0 && d !== Number.POSITIVE_INFINITY) {
        setDuration((prev) => (d > prev ? d : prev));
      }
    };

    apply(el.duration);

    try {
      if (el.seekable?.length > 0) {
        apply(el.seekable.end(el.seekable.length - 1));
      }
    } catch {
      /* ignore */
    }

    try {
      if (el.buffered?.length > 0) {
        const bufEnd = el.buffered.end(el.buffered.length - 1);
        apply(bufEnd);
        if (Number.isFinite(bufEnd) && bufEnd > 0) {
          inferredBump = Math.max(inferredBump, bufEnd);
        }
      }
    } catch {
      /* ignore */
    }

    if (Number.isFinite(el.currentTime) && el.currentTime > 0) {
      inferredBump = Math.max(inferredBump, el.currentTime);
    }

    inferredLenRef.current = inferredBump;
    setInferredTotal((prev) => (inferredBump > prev ? inferredBump : prev));
  }, []);

  useEffect(() => {
    setCurrent(0);
    setDuration(0);
    setInferredTotal(0);
    setPlaying(false);
    inferredLenRef.current = 0;
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const onTime = () => {
      setCurrent(el.currentTime);
      pullDuration();
    };
    const onMeta = () => pullDuration();
    const onDurationChange = () => pullDuration();
    const onLoadedData = () => pullDuration();
    const onCanPlay = () => pullDuration();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('loadeddata', onLoadedData);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('progress', pullDuration);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);

    pullDuration();

    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('loadeddata', onLoadedData);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('progress', pullDuration);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
    };
  }, [src, pullDuration]);

  useEffect(() => {
    if (!playing) return undefined;
    const rafRef = { id: 0 };
    const tick = () => {
      const a = audioRef.current;
      if (!a || a.paused) return;
      setCurrent(a.currentTime);
      try {
        if (a.buffered?.length) {
          const end = a.buffered.end(a.buffered.length - 1);
          if (Number.isFinite(end) && end > 0) {
            inferredLenRef.current = Math.max(inferredLenRef.current, end);
          }
        }
      } catch {
        /* ignore */
      }
      const t = a.currentTime;
      inferredLenRef.current = Math.max(inferredLenRef.current, t);
      setInferredTotal((prev) => Math.max(prev, t));
      rafRef.id = requestAnimationFrame(tick);
    };
    rafRef.id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.id);
  }, [playing]);

  const displayTotal = Math.max(duration, inferredTotal, 0);
  /** Jamais un plancher artificiel de 0,5 s si la lecture a déjà dépassé — sinon toute l’onde passe au vert. */
  const lengthForSeek = Math.max(displayTotal, current, 0.5);

  return {
    audioRef,
    current,
    setCurrent,
    playing,
    displayTotal,
    lengthForSeek,
  };
}

/**
 * Piste onde + pastille : grille à colonnes égales (alignement WA fiable).
 */
function VoiceWaveformTrack({
  trackRef,
  heights,
  progress01,
  lengthForSeek,
  currentSec,
  displayTotalSec,
  audioRef,
  setCurrent,
  labels,
  onSeekRatio,
}) {
  const { barCount, trackPadPx, trackHeightPx, barHeightScalePx, columnGapPx, knobSizePx, colors } = VOICE_UI;

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeekRatio(
      seekRatioFromClientX(e.clientX, e.currentTarget.getBoundingClientRect(), trackPadPx),
      lengthForSeek
    );
  };

  const onPointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.stopPropagation();
    onSeekRatio(
      seekRatioFromClientX(e.clientX, e.currentTarget.getBoundingClientRect(), trackPadPx),
      lengthForSeek
    );
  };

  const onPointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const el = audioRef.current;
    if (!el) return;
    const len = Math.max(lengthForSeek, 0.5);
    const step = len * 0.05;
    el.currentTime =
      e.key === 'ArrowRight' ? Math.min(len, el.currentTime + step) : Math.max(0, el.currentTime - step);
    setCurrent(el.currentTime);
  };

  const knobLeft = `calc(${trackPadPx}px + (100% - ${trackPadPx * 2}px) * ${progress01})`;
  const ariaMax = Math.max(0, Math.round(Math.max(displayTotalSec, lengthForSeek)));

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={ariaMax}
      aria-valuenow={Math.max(0, Math.round(currentSec))}
      aria-label={labels.voiceMessage}
      className="relative flex min-h-[44px] w-full cursor-pointer touch-none select-none flex-col justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/35 focus-visible:ring-offset-1"
      style={{
        paddingLeft: trackPadPx,
        paddingRight: trackPadPx,
        paddingTop: 6,
        paddingBottom: 6,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div
        className="grid w-full items-end"
        style={{
          height: trackHeightPx,
          gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))`,
          columnGap: columnGapPx,
        }}
      >
        {heights.map((h, i) => {
          const played = isBarPlayed(i, barCount, progress01);
          const barH = Math.max(VOICE_UI.barMinHeightPx, Math.round(h * barHeightScalePx));
          return (
            <span
              key={i}
              className="min-w-0 justify-self-center rounded-[1px] transition-[background-color] duration-100"
              style={{
                width: '100%',
                maxWidth: 3,
                height: `${barH}px`,
                backgroundColor: played ? colors.barPlayed : colors.barUnplayed,
              }}
            />
          );
        })}
      </div>
      <span
        className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-[2.5px] ring-white"
        style={{
          width: knobSizePx,
          height: knobSizePx,
          backgroundColor: colors.knob,
          left: knobLeft,
        }}
        aria-hidden
      />
    </div>
  );
}

/**
 * Message vocal style WhatsApp : lecture, onde (gris → vert + pastille alignée), métadonnées, avatar + micro.
 */
const PLAYBACK_RATES = [1, 1.5, 2];

export function ChatVoiceMessage({
  src,
  isOwn,
  avatarUrl,
  avatarFallback,
  messageId,
  createdAt,
  receiptStatus,
  labels,
}) {
  const { audioRef, current, setCurrent, playing, displayTotal, lengthForSeek } = useVoiceAudio(src);
  const trackRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const heights = useMemo(
    () => seededHeights(hashSeed(String(messageId)), VOICE_UI.barCount),
    [messageId]
  );

  const progress01 = getProgress01(current, lengthForSeek);

  const onSeekRatio = useCallback(
    (ratio, len) => {
      const el = audioRef.current;
      if (!el) return;
      const duration = Math.max(len, 0.5);
      el.currentTime = ratio * duration;
      setCurrent(el.currentTime);
    },
    [audioRef, setCurrent]
  );

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  }, [playing, audioRef]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = playbackRate;
  }, [playbackRate, audioRef]);

  useEffect(() => setPlaybackRate(1), [src]);

  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRate((r) => {
      const i = PLAYBACK_RATES.indexOf(r);
      return PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length];
    });
  }, []);

  const clock = createdAt ? format(new Date(createdAt), 'HH:mm', { locale: fr }) : '';
  const { colors } = VOICE_UI;
  const micOuterRing = 'ring-[2.5px] ring-white';
  const showTotalDuration =
    displayTotal >= 1 && Math.abs(displayTotal - current) > 0.35;

  return (
    <div
      className={cn(
        'select-none',
        // Largeur proche WhatsApp: compacte mais lisible.
        'min-w-[min(100%,260px)] max-w-[min(100%,340px)]'
      )}
      style={{ color: colors.ink }}
      data-voice-msg-id={messageId}
    >
      <audio ref={audioRef} src={src} preload="auto" playsInline className="hidden" />

      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 shadow-sm',
          isOwn
            ? 'border-emerald-400/30 bg-emerald-500/18'
            : 'border-white/12 bg-white/[0.07]'
        )}
      >
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition',
            isOwn ? 'bg-emerald-500/22 hover:bg-emerald-500/28' : 'bg-black/15 hover:bg-black/20',
            'active:scale-[0.98]'
          )}
          aria-label={playing ? labels.pausePreview : labels.playPreview}
        >
          {playing ? (
            <WaPauseIcon className="h-[24px] w-[24px]" fill={colors.playIcon} />
          ) : (
            <WaPlayIcon className="h-[24px] w-[24px] pl-px" fill={colors.playIcon} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <VoiceWaveformTrack
            trackRef={trackRef}
            heights={heights}
            progress01={progress01}
            lengthForSeek={lengthForSeek}
            currentSec={current}
            displayTotalSec={displayTotal}
            audioRef={audioRef}
            setCurrent={setCurrent}
            labels={labels}
            onSeekRatio={onSeekRatio}
          />

          <div
            className="mt-1 flex items-center justify-between gap-3 px-0.5 text-[12px] tabular-nums leading-normal"
            style={{ color: colors.secondary }}
          >
            <span className="flex min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="text-[#54656f]">{formatVoiceDuration(current)}</span>
              {showTotalDuration && (
                <>
                  <span className="text-[#aebac1]" aria-hidden>
                    /
                  </span>
                  <span>{formatVoiceDuration(displayTotal)}</span>
                </>
              )}
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors',
                  'hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40'
                )}
                style={{ color: colors.secondary }}
                aria-label={`Vitesse de lecture : ${playbackRate}×`}
              >
                {playbackRate}×
              </button>
            </span>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              {clock ? <span>{clock}</span> : null}
              {isOwn &&
                (String(receiptStatus) === 'sending' ? (
                  <Loader2 className="h-[15px] w-[15px] shrink-0 animate-spin text-[#8696a0]" strokeWidth={2.2} aria-label={labels?.sending} />
                ) : String(receiptStatus) === 'failed' ? (
                  <AlertCircle
                    className="h-[15px] w-[15px] shrink-0 text-amber-500"
                    strokeWidth={2.2}
                    aria-label={labels?.sendFailed}
                  />
                ) : String(receiptStatus) === 'read' ? (
                  <CheckCheck className="h-[15px] w-[15px] shrink-0 text-[#53bdeb]" strokeWidth={2.2} aria-label={labels.read} />
                ) : String(receiptStatus) === 'delivered' ? (
                  <CheckCheck
                    className="h-[15px] w-[15px] shrink-0 text-[#8696a0]"
                    strokeWidth={2.2}
                    aria-label={labels?.messageStatusDelivered}
                  />
                ) : String(receiptStatus) === 'sent' || String(receiptStatus) === 'scheduled' ? (
                  <Check
                    className="h-[15px] w-[15px] shrink-0 text-[#8696a0]"
                    strokeWidth={2.2}
                    aria-label={labels?.messageStatusSent}
                  />
                ) : (
                  <Check
                    className="h-[15px] w-[15px] shrink-0 text-[#8696a0]"
                    strokeWidth={2.2}
                    aria-label={labels?.messageStatusSent}
                  />
                ))}
            </span>
          </div>
        </div>

        <div className="relative shrink-0">
          <Avatar className={cn('h-11 w-11 border-2 shadow-sm', isOwn ? 'border-emerald-200/80' : 'border-white/80')}>
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-[#dfe5e7] text-[13px] font-medium text-[#54656f]">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'absolute -bottom-0.5 left-0 flex h-[20px] w-[20px] items-center justify-center rounded-full',
              micOuterRing
            )}
            style={{ backgroundColor: colors.knob }}
            aria-hidden
          >
            <Mic className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
