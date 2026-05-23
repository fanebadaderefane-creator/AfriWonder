// AfriWonder — Interface caméra plein écran type WhatsApp (capture 2)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ImageIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODES = [
  { key: 'video', label: 'Vidéo' },
  { key: 'photo', label: 'Photo' },
  { key: 'videoNote', label: 'Note vidéo' },
];

const VIDEO_NOTE_MAX_SEC = 60;

function pickVideoMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

export function ChatCameraSheet({
  open,
  onOpenChange,
  labels = {},
  onCapture,
  onGallery,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [mode, setMode] = useState('photo');
  const [facingMode, setFacingMode] = useState('environment');
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const recordingTimerRef = useRef(null);
  const prevModeRef = useRef(mode);

  const startStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(labels.cameraUnsupported ?? 'Caméra non supportée par ce navigateur.');
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode !== 'photo',
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreamReady(true);
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? (labels.cameraPermissionDenied ?? 'Autorisez l’accès à la caméra.')
          : err.name === 'NotFoundError'
            ? (labels.cameraNotFound ?? 'Aucune caméra détectée.')
            : (labels.cameraError ?? 'Impossible d’accéder à la caméra.');
      setError(msg);
    }
  }, [facingMode, mode, labels.cameraUnsupported, labels.cameraPermissionDenied, labels.cameraNotFound, labels.cameraError]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreamReady(false);
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode((p) => (p === 'user' ? 'environment' : 'user'));
    stopStream();
  }, [stopStream]);

  const prevFacingRef = useRef(facingMode);

  useEffect(() => {
    if (open) {
      setError(null);
      startStream();
    }
    return () => {
      stopStream();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (prevFacingRef.current === facingMode) return;
    prevFacingRef.current = facingMode;
    stopStream();
    startStream();
  }, [facingMode, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev !== mode && (mode === 'video' || mode === 'videoNote') && isStreamReady) {
      stopStream();
      startStream();
    }
  }, [mode, open, isStreamReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || capturing) return;
    setCapturing(true);
    try {
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, vw, vh);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCapture?.(blob, blob.type, false);
            onOpenChange?.(false);
          }
          setCapturing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch {
      setCapturing(false);
    }
  }, [capturing, onCapture, onOpenChange]);

  const startVideoRecording = useCallback(() => {
    if (!streamRef.current || isRecording) return;
    chunksRef.current = [];
    const mimeType = pickVideoMimeType();
    try {
      const rec = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          onCapture?.(blob, mimeType, true);
          onOpenChange?.(false);
        }
        setRecordingSeconds(0);
        setIsRecording(false);
      };
      rec.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          if (mode === 'videoNote' && next >= VIDEO_NOTE_MAX_SEC) {
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      console.error('MediaRecorder error', e);
      setIsRecording(false);
    }
  }, [isRecording, mode, onCapture, onOpenChange]);

  const stopVideoRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const handleShutter = useCallback(() => {
    if (mode === 'photo') {
      takePhoto();
    } else {
      if (isRecording) stopVideoRecording();
      else startVideoRecording();
    }
  }, [mode, isRecording, takePhoto, startVideoRecording, stopVideoRecording]);

  const handleClose = useCallback(() => {
    if (isRecording) stopVideoRecording();
    stopStream();
    onOpenChange?.(false);
  }, [isRecording, stopVideoRecording, stopStream, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
      aria-label={labels.cameraTitle ?? 'Caméra'}
    >
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          !isStreamReady && 'invisible'
        )}
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
      />
      {!isStreamReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
        </div>
      )}

      {/* Top bar: fermer */}
      <div className="relative z-10 flex items-center justify-start px-4 pt-3">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/50"
          aria-label={labels.close ?? 'Fermer'}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6">
          <p className="text-center text-white/90">{error}</p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-white/20 px-6 py-2 text-white hover:bg-white/30"
          >
            {labels.close ?? 'Fermer'}
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 mt-auto flex flex-col items-center pb-6">
        <div className="mb-4 flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => !isRecording && setMode(m.key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                mode === m.key
                  ? 'bg-white/25 text-white'
                  : 'text-white/70 hover:text-white'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onGallery}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur-sm hover:bg-black/50"
            aria-label={labels.gallery ?? 'Galerie'}
          >
            <ImageIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleShutter}
            disabled={!isStreamReady || capturing}
            className={cn(
              'flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition-all',
              isRecording
                ? 'bg-red-500 ring-4 ring-red-500/40'
                : 'bg-white hover:scale-105 active:scale-95'
            )}
            aria-label={mode === 'photo' ? (labels.takePhoto ?? 'Prendre une photo') : isRecording ? (labels.stopRecording ?? 'Arrêter') : (labels.recordVideo ?? 'Enregistrer')}
          >
            {isRecording && (
              <span className="font-mono text-sm font-bold text-white tabular-nums">
                {recordingSeconds}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={switchCamera}
            disabled={!isStreamReady || isRecording}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/50 disabled:opacity-50"
            aria-label={labels.switchCamera ?? 'Changer de caméra'}
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>
        {mode === 'videoNote' && (
          <p className="mt-2 text-center text-xs text-white/55">
            {labels.videoNoteHint ?? `Max ${VIDEO_NOTE_MAX_SEC} s`}
          </p>
        )}
      </div>
    </div>
  );
}
