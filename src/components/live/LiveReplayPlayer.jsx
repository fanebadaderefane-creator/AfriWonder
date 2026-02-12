/**
 * CDC: Lecteur replay avec chapitres, timestamps, vitesse 0.5x–2x, qualité adaptative (HLS)
 */
import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Play, Pause, Volume2, VolumeX, Maximize2, PictureInPicture2 } from 'lucide-react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveReplayPlayer({ liveId, replayUrl, isCreator }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChapters, setShowChapters] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const { data: chapters = [] } = useQuery({
    queryKey: ['live-chapters', liveId],
    queryFn: () => api.live.getChapters(liveId),
    enabled: !!liveId,
  });

  const isEmbed = replayUrl && (replayUrl.includes('youtube') || replayUrl.includes('vimeo') || replayUrl.includes('embed'));
  const isHls = replayUrl && (replayUrl.endsWith('.m3u8') || replayUrl.includes('.m3u8'));
  const isDirectVideo = replayUrl && (
    replayUrl.endsWith('.mp4') ||
    replayUrl.endsWith('.m3u8') ||
    replayUrl.includes('.m3u8') ||
    replayUrl.includes('video')
  );

  // CDC: Qualité adaptative pour HLS (.m3u8) via hls.js
  useEffect(() => {
    if (!isHls || !replayUrl || !videoRef.current) return;
    const video = videoRef.current;
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(replayUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.levels.length > 1) {
          hls.currentLevel = -1; // auto = qualité adaptative selon bande passante
        }
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            hls.destroy();
          }
        }
      });
      return () => {
        hls.destroy();
      };
    }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = replayUrl;
      return () => { video.src = ''; };
    }
    return undefined;
  }, [replayUrl, isHls]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [isDirectVideo]);

  const seekTo = (seconds) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = seconds;
      v.play();
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (v) v.volume = val;
    setIsMuted(val === 0);
  };

  if (!replayUrl) return null;

  if (isEmbed || !isDirectVideo) {
    return (
      <div className="absolute inset-0 w-full h-full bg-black">
        <iframe
          src={replayUrl}
          title="Replay du live"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col bg-black">
      <video
        ref={videoRef}
        src={isHls ? undefined : replayUrl}
        controls
        className="flex-1 w-full h-full object-contain"
        playsInline
        onError={(e) => console.warn('Replay video error:', e)}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 z-10">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => videoRef.current?.[isPlaying ? 'pause' : 'play']()}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <span className="text-white text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1 text-white hover:bg-white/20 rounded"
              onClick={() => {
                const v = videoRef.current;
                if (v) {
                  v.muted = !v.muted;
                  setIsMuted(v.muted);
                }
              }}
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 accent-amber-500"
            />
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-white" onClick={toggleFullscreen} title="Plein écran">
            <Maximize2 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-white" onClick={togglePiP} title="Picture-in-picture">
            <PictureInPicture2 className="w-3 h-3" />
          </Button>
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={speed === s ? 'default' : 'ghost'}
                className="h-6 text-xs px-2"
                onClick={() => setSpeed(s)}
              >
                {s}x
              </Button>
            ))}
          </div>
          {chapters.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white"
              onClick={() => setShowChapters(!showChapters)}
            >
              <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${showChapters ? 'rotate-180' : ''}`} />
              Chapitres
            </Button>
          )}
        </div>
        {showChapters && chapters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {chapters.map((ch) => (
              <Badge
                key={ch.id}
                variant="secondary"
                className="cursor-pointer hover:bg-amber-600/30 text-xs py-1 px-2"
                onClick={() => seekTo(ch.start_seconds ?? 0)}
              >
                {formatTime(ch.start_seconds ?? 0)} — {ch.title}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
