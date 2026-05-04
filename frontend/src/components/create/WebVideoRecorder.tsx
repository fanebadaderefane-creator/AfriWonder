/**
 * Enregistreur vidéo natif web (HTML5 `getUserMedia` + `MediaRecorder`).
 *
 * Pourquoi ce composant existe :
 *  - `expo-image-picker.launchCameraAsync()` ne demande PAS l'accès caméra sur Firefox/Edge
 *    desktop : il tombe en fallback "input file" → l'utilisateur voit l'Explorateur Windows.
 *  - Ce composant utilise les APIs DOM standards pour réellement allumer la webcam.
 *
 * Métro résout `.tsx` (web) ; sur Android/iOS le composant `.native.tsx` est un no-op
 * (jamais utilisé car `IntegratedCameraRecorder` mobile prend le relai).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import type { WebVideoRecorderProps } from './WebVideoRecorder.types';

export type { WebVideoRecorderProps } from './WebVideoRecorder.types';

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

function pickMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return 'video/webm';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* */
    }
  }
  return 'video/webm';
}

export default function WebVideoRecorder({
  visible,
  onClose,
  onCaptured,
  maxDurationSec = 60,
}: WebVideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'recording' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* */
      }
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        /* */
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopStream();
    setElapsedSec(0);
    setStatus('idle');
    setError(null);
  }, [stopStream]);

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError("Votre navigateur ne supporte pas l'enregistrement vidéo.");
      setStatus('error');
      return;
    }
    setStatus('requesting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay restrictions — l'utilisateur peut cliquer sur la vidéo */
        });
      }
      setStatus('ready');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Permission caméra refusée";
      setError(msg);
      setStatus('error');
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible.");
        setStatus('error');
        return;
      }
    }
    chunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
      const uri = URL.createObjectURL(blob);
      const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      onCaptured({ uri, mimeType: blob.type || mimeType, durationSec: duration });
      cleanup();
    };
    recorder.onerror = (ev: Event) => {
      const native = (ev as unknown as { error?: { message?: string } })?.error;
      setError(native?.message || "Erreur d'enregistrement");
      setStatus('error');
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setElapsedSec(0);
    setStatus('recording');
    recorder.start(250);
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      setElapsedSec(elapsed);
      if (elapsed >= maxDurationSec) {
        try {
          recorder.stop();
        } catch {
          /* */
        }
      }
    }, 200);
  }, [cleanup, maxDurationSec, onCaptured]);

  const stopRecording = useCallback(() => {
    const r = recorderRef.current;
    if (!r) return;
    try {
      if (r.state !== 'inactive') r.stop();
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void startCamera();
    } else {
      cleanup();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (!visible) return null;

  const remainingSec = Math.max(0, Math.floor(maxDurationSec - elapsedSec));
  const progressPct = Math.min(100, (elapsedSec / maxDurationSec) * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.root}>
        <View style={StyleSheet.absoluteFillObject}>
          {React.createElement('video', {
            ref: (el: HTMLVideoElement | null) => {
              videoRef.current = el;
            },
            style: { width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000', display: 'block' },
            autoPlay: true,
            playsInline: true,
            muted: true,
          })}
        </View>

        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.iconBtn} accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        {status === 'recording' ? (
          <View style={styles.timerWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.timerText}>
              {`${fmtTime(elapsedSec)} / ${fmtTime(maxDurationSec)} (${remainingSec}s restantes)`}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={18} color="#FFB199" />
            <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          {status === 'requesting' ? (
            <ActivityIndicator color="#FFF" size="large" />
          ) : status === 'error' ? (
            <TouchableOpacity onPress={startCamera} style={styles.retryBtn}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={status === 'recording' ? stopRecording : startRecording}
              disabled={status !== 'ready' && status !== 'recording'}
              style={[styles.recordBtn, status === 'recording' && styles.recordBtnActive]}
              accessibilityLabel={status === 'recording' ? 'Arrêter' : 'Enregistrer'}
            >
              <View style={[styles.recordInner, status === 'recording' && styles.recordInnerStop]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute', top: 24, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  timerWrap: { position: 'absolute', bottom: 130, left: 24, right: 24, gap: 8 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF3B30' },
  timerText: { color: '#FFF', fontWeight: '700', textAlign: 'center', fontSize: FontSizes.sm },
  bottomBar: {
    position: 'absolute', bottom: 32, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32,
  },
  recordBtn: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FFF', backgroundColor: 'transparent',
  },
  recordBtnActive: { borderColor: '#FF3B30' },
  recordInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FF3B30' },
  recordInnerStop: { width: 30, height: 30, borderRadius: 6 },
  errorWrap: {
    position: 'absolute', top: 80, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.18)',
    borderColor: 'rgba(255,59,48,0.6)', borderWidth: 1,
    borderRadius: BorderRadius.md, padding: 10,
  },
  errorText: { color: '#FFB199', flex: 1, fontSize: FontSizes.sm },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  retryText: { color: '#FFF', fontWeight: '700' },
});
