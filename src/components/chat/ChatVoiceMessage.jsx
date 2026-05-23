import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Mic, Check, CheckCheck, Loader2, AlertCircle, RotateCcw, RotateCw } from 'lucide-react';
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

function stopEventBubble(event) {
  event.stopPropagation();
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
  palette,
}) {
  const { barCount, trackPadPx, trackHeightPx, barHeightScalePx, columnGapPx, knobSizePx, barMaxWidthPx } = VOICE_UI;
  const draggingRef = useRef(false);
  const seekAtClientX = useCallback(
    (clientX, target) => {
      onSeekRatio(seekRatioFromClientX(clientX, target.getBoundingClientRect(), trackPadPx), lengthForSeek);
    },
    [lengthForSeek, onSeekRatio, trackPadPx]
  );

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekAtClientX(e.clientX, e.currentTarget);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    seekAtClientX(e.clientX, e.currentTarget);
  };

  const onPointerUp = (e) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onClick = (e) => {
    e.stopPropagation();
    seekAtClientX(e.clientX, e.currentTarget);
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
      className="relative flex min-h-[26px] w-full cursor-pointer touch-none select-none flex-col justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/20 focus-visible:ring-offset-1"
      style={{
        paddingLeft: trackPadPx,
        paddingRight: trackPadPx,
        paddingTop: 4,
        paddingBottom: 4,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
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
                maxWidth: barMaxWidthPx,
                height: `${barH}px`,
                backgroundColor: played ? palette.barPlayed : palette.barUnplayed,
              }}
            />
          );
        })}
      </div>
      <span
        className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.14)]"
        style={{
          width: knobSizePx,
          height: knobSizePx,
          backgroundColor: palette.knob,
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

  const seekBy = useCallback(
    (deltaSec) => {
      const el = audioRef.current;
      if (!el) return;
      const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : Math.max(displayTotal, lengthForSeek, current, 0.5);
      el.currentTime = Math.min(duration, Math.max(0, el.currentTime + deltaSec));
      setCurrent(el.currentTime);
    },
    [audioRef, current, displayTotal, lengthForSeek, setCurrent]
  );

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
  const showTotalDuration =
    displayTotal >= 1 && Math.abs(displayTotal - current) > 0.35;
  const palette = isOwn
    ? {
        bubble: 'bg-[#dcf8c6] border-[#d0eec0]',
        button: 'bg-[#f7faf5] hover:bg-[#f1f6ef]',
        knob: '#6f7b82',
        barPlayed: '#8aa08d',
        barUnplayed: '#bfcfc2',
        meta: '#667781',
        icon: '#54656f',
        avatarBorder: 'border-[#cfe8c2]',
        badge: '#25D366',
      }
    : {
        bubble: 'bg-white border-[#e8edef]',
        button: 'bg-[#f3f5f6] hover:bg-[#eceff1]',
        knob: '#34b7f1',
        barPlayed: '#9fb8c6',
        barUnplayed: '#d7dde1',
        meta: '#667781',
        icon: '#54656f',
        avatarBorder: 'border-[#edf1f3]',
        badge: '#34b7f1',
      };
  const avatarNode = (
    <div className="relative shrink-0 flex-none">
      <Avatar
        className={cn(
          'h-[34px] w-[34px] min-h-[34px] min-w-[34px] max-h-[34px] max-w-[34px] flex-none overflow-hidden rounded-full border shadow-none',
          palette.avatarBorder
        )}
      >
        <AvatarImage src={avatarUrl || undefined} className="block h-full w-full object-cover" />
        <AvatarFallback className="bg-[#dfe5e7] text-[12px] font-medium text-[#54656f]">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div
        className="absolute -bottom-1 -right-1 flex h-[14px] w-[14px] items-center justify-center rounded-full ring-[1.5px] ring-white"
        style={{ backgroundColor: palette.badge }}
        aria-hidden
      >
        <Mic className="h-2 w-2 text-white" strokeWidth={2.4} />
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'select-none',
        // Largeur proche WhatsApp: compacte mais lisible.
        'min-w-[min(100%,260px)] max-w-[min(100%,340px)]'
      )}
      style={{ color: colors.ink }}
      data-voice-msg-id={messageId}
      onTouchStart={stopEventBubble}
      onTouchMove={stopEventBubble}
      onTouchEnd={stopEventBubble}
      onPointerDown={stopEventBubble}
    >
      <audio ref={audioRef} src={src} preload="auto" className="hidden" />

      <div
        className={cn(
          'flex items-center gap-1.5 rounded-[18px] border px-2 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.05)]',
          palette.bubble
        )}
      >
        {isOwn ? avatarNode : null}
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            'flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full transition',
            palette.button,
            'active:scale-[0.98]'
          )}
          aria-label={playing ? labels.pausePreview : labels.playPreview}
          onTouchStart={stopEventBubble}
        >
          {playing ? (
            <WaPauseIcon className="h-[18px] w-[18px]" fill={palette.icon} />
          ) : (
            <WaPlayIcon className="h-[18px] w-[18px] pl-px" fill={palette.icon} />
          )}
        </button>

        <div className="min-w-0 flex-1 pr-0.5">
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
            palette={palette}
          />

          <div
            className="mt-0.5 flex items-center justify-between gap-1.5 px-0.5 text-[10px] tabular-nums leading-none"
            style={{ color: palette.meta }}
          >
            <span className="flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap">
              <button
                type="button"
                onClick={() => seekBy(-10)}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/5"
                aria-label={labels.voiceSkipBack}
                title={labels.voiceSkipBack}
                onTouchStart={stopEventBubble}
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2.1} />
              </button>
              <span style={{ color: palette.meta }}>{formatVoiceDuration(current)}</span>
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
                className={cn('rounded px-1 py-0.5 text-[10px] font-semibold transition-colors', 'hover:opacity-80 focus:outline-none')}
                style={{ color: palette.meta }}
                aria-label={`Vitesse de lecture : ${playbackRate}×`}
                onTouchStart={stopEventBubble}
              >
                {playbackRate}×
              </button>
              <button
                type="button"
                onClick={() => seekBy(10)}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/5"
                aria-label={labels.voiceSkipForward}
                title={labels.voiceSkipForward}
                onTouchStart={stopEventBubble}
              >
                <RotateCw className="h-3 w-3" strokeWidth={2.1} />
              </button>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap">
              {clock ? <span className="translate-y-[0.5px]">{clock}</span> : null}
              {isOwn &&
                (String(receiptStatus) === 'sending' ? (
                  <Loader2 className="h-[13px] w-[13px] shrink-0 animate-spin text-[#8696a0]" strokeWidth={2.2} aria-label={labels?.sending} />
                ) : String(receiptStatus) === 'failed' ? (
                  <AlertCircle
                    className="h-[13px] w-[13px] shrink-0 text-amber-500"
                    strokeWidth={2.2}
                    aria-label={labels?.sendFailed}
                  />
                ) : String(receiptStatus) === 'read' ? (
                  <CheckCheck className="h-[13px] w-[13px] shrink-0 text-[#53bdeb]" strokeWidth={2.15} aria-label={labels.read} />
                ) : String(receiptStatus) === 'delivered' ? (
                  <CheckCheck
                    className="h-[13px] w-[13px] shrink-0 text-[#8696a0]"
                    strokeWidth={2.15}
                    aria-label={labels?.messageStatusDelivered}
                  />
                ) : String(receiptStatus) === 'sent' || String(receiptStatus) === 'scheduled' ? (
                  <Check
                    className="h-[13px] w-[13px] shrink-0 text-[#8696a0]"
                    strokeWidth={2.15}
                    aria-label={labels?.messageStatusSent}
                  />
                ) : (
                  <Check
                    className="h-[13px] w-[13px] shrink-0 text-[#8696a0]"
                    strokeWidth={2.15}
                    aria-label={labels?.messageStatusSent}
                  />
                ))}
            </span>
          </div>
        </div>
        {!isOwn ? avatarNode : null}
      </div>
    </div>
  );
}
