import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  type CameraPosition,
  type CameraCaptureError,
  type VideoFile,
} from 'react-native-vision-camera';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import {
  CAMERA_DURATION_OPTIONS,
  CAMERA_SPEED_OPTIONS,
  flashIconName,
  fmtCameraTime,
  nextFlashCycle,
  progressPercent,
  remainingSeconds,
  shouldAutoStop,
  type CameraDurationPreset,
  type CameraFlashCycle,
  type CameraSpeedPreset,
} from './cameraRecorderHelpers';
import { CAMERA_EFFECT_OPTIONS, describeCameraEffect, type CameraEffectId } from './cameraEffects';
import {
  buildLiveAREffectColor,
  cameraPositionFor,
  visionCameraFlashFor,
} from './visionCameraEffects';
import { useArFrameProcessor } from './useArFrameProcessor';
import type { IntegratedCameraRecorderProps } from './IntegratedCameraRecorder.types';

export type { CameraDurationPreset, CameraSpeedPreset } from './cameraRecorderHelpers';
export type { CameraEffectId } from './cameraEffects';
export type {
  IntegratedCameraResult,
  IntegratedCameraFacing,
  IntegratedCameraFlash,
} from './IntegratedCameraRecorder.types';

export default function IntegratedCameraRecorder({
  visible,
  onClose,
  onCaptured,
  initialDurationCap = 60,
  initialSpeed = 1,
  initialEffect = 'none',
}: IntegratedCameraRecorderProps) {
  const cameraRef = useRef<InstanceType<typeof Camera> | null>(null);
  const { hasPermission: hasCamPerm, requestPermission: requestCamPerm } = useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: requestMicPerm } = useMicrophonePermission();

  const [facing, setFacing] = useState<CameraPosition>('back');
  const device = useCameraDevice(cameraPositionFor(facing as 'back' | 'front'));

  const [flash, setFlash] = useState<CameraFlashCycle>('off');
  const [gridEnabled, setGridEnabled] = useState(false);
  const [durationCap, setDurationCap] = useState<CameraDurationPreset>(initialDurationCap);
  const [speed, setSpeed] = useState<CameraSpeedPreset>(initialSpeed);
  const [effect, setEffect] = useState<CameraEffectId>(initialEffect);

  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const stoppedRef = useRef(false);

  const frameProcessor = useArFrameProcessor(effect);

  useEffect(() => {
    if (!visible) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      setRecording(false);
      setElapsedMs(0);
      setBusy(false);
      setError(null);
      stoppedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const now = Date.now();
      const ms = now - startedAtRef.current;
      setElapsedMs(ms);
      if (shouldAutoStop(ms, durationCap) && !stoppedRef.current) {
        stoppedRef.current = true;
        void stopRecording();
      }
    }, 100);
    tickRef.current = id;
    return () => {
      clearInterval(id);
      tickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, durationCap]);

  const ensurePermissions = async (): Promise<boolean> => {
    if (!hasCamPerm) {
      const granted = await requestCamPerm();
      if (!granted) {
        setError("Permission caméra refusée");
        return false;
      }
    }
    if (!hasMicPerm) {
      const granted = await requestMicPerm();
      if (!granted) {
        setError("Permission micro refusée");
        return false;
      }
    }
    return true;
  };

  const startRecording = async () => {
    if (recording || busy) return;
    setError(null);
    if (!(await ensurePermissions())) return;
    const cam = cameraRef.current;
    if (!cam || !device) {
      setError("Caméra non disponible");
      return;
    }
    setBusy(true);
    try {
      stoppedRef.current = false;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
      cam.startRecording({
        flash: visionCameraFlashFor(flash),
        fileType: 'mp4',
        onRecordingFinished: (video: VideoFile) => {
          setRecording(false);
          const path = video?.path || '';
          const uri = path.startsWith('file://') || path.startsWith('http') ? path : `file://${path}`;
          if (!uri) {
            setError("Capture vide, réessayez");
            return;
          }
          onCaptured({
            uri,
            durationSec: Math.min(durationCap, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))),
            facing: (facing === 'front' ? 'front' : 'back') as 'back' | 'front',
            speed,
            flash,
            gridEnabled,
            durationCapSec: durationCap,
            effect,
          });
        },
        onRecordingError: (err: CameraCaptureError) => {
          setRecording(false);
          setError(err?.message || "Erreur d'enregistrement");
        },
      });
    } catch (e: unknown) {
      setRecording(false);
      const msg = e instanceof Error ? e.message : "Erreur d'enregistrement";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    const cam = cameraRef.current;
    if (!cam || !recording) return;
    try {
      await cam.stopRecording();
    } catch {
      /* déjà arrêté */
    }
  };

  const flipFacing = () => setFacing((f) => (f === 'back' ? 'front' : 'back'));

  const cycleFlash = () => {
    setFlash((f) => nextFlashCycle(f));
  };

  const flashIcon = useMemo<React.ComponentProps<typeof Ionicons>['name']>(() => flashIconName(flash), [flash]);

  const remainingSec = remainingSeconds(elapsedMs, durationCap);
  const progressPct = progressPercent(elapsedMs, durationCap);

  if (!visible) return null;

  const renderCamera = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={[StyleSheet.absoluteFillObject, styles.webFallback]}>
          <Ionicons name="videocam-off" size={48} color={Colors.textMuted} />
          <Text style={styles.webFallbackText}>
            La caméra intégrée AfriWonder est disponible sur l’app mobile (Android / iOS).
          </Text>
          <TouchableOpacity style={styles.closeBtnLg} onPress={onClose}>
            <Text style={styles.closeBtnLgText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!device) {
      return (
        <View style={[StyleSheet.absoluteFillObject, styles.webFallback]}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.webFallbackText}>Initialisation de la caméra…</Text>
        </View>
      );
    }
    return (
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={visible}
        video
        audio
        photo={false}
        // Cast intentionnel : `useArFrameProcessor` retourne un `FrameProcessor`
        // construit dynamiquement (Skia ou no-op). En v4, vision-camera attend un type
        // plus narrow (`ReadonlyFrameProcessor | DrawableFrameProcessor`) qui n'est
        // exposé que via le hook officiel. Le cast est sûr : si `frameProcessor`
        // est `undefined`, vision-camera tombe sur le pipeline "frame brute".
        frameProcessor={frameProcessor as never}
        pixelFormat={frameProcessor ? 'rgb' : undefined}
      />
    );
  };

  const liveOverlayColor = buildLiveAREffectColor(effect);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        {renderCamera()}

        {liveOverlayColor && Platform.OS !== 'web' ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: liveOverlayColor }]}
          />
        ) : null}

        {gridEnabled && Platform.OS !== 'web' ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <View style={[styles.gridLine, { left: '33.33%', width: 1, top: 0, bottom: 0 }]} />
            <View style={[styles.gridLine, { left: '66.66%', width: 1, top: 0, bottom: 0 }]} />
            <View style={[styles.gridLine, { top: '33.33%', height: 1, left: 0, right: 0 }]} />
            <View style={[styles.gridLine, { top: '66.66%', height: 1, left: 0, right: 0 }]} />
          </View>
        ) : null}

        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={cycleFlash} style={styles.iconBtn} accessibilityLabel="Flash">
              <Ionicons name={flashIcon} size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setGridEnabled((v) => !v)}
              style={styles.iconBtn}
              accessibilityLabel="Grille"
            >
              <Ionicons name={gridEnabled ? 'grid' : 'grid-outline'} size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={flipFacing} style={styles.iconBtn} accessibilityLabel="Retourner caméra">
              <Ionicons name="camera-reverse" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {!recording ? (
          <View style={styles.presetsRow}>
            <View style={styles.chipGroup}>
              {CAMERA_DURATION_OPTIONS.map((d) => (
                <Pressable
                  key={`dur-${d}`}
                  onPress={() => setDurationCap(d)}
                  style={[styles.chip, durationCap === d && styles.chipActive]}
                  accessibilityLabel={`Durée ${d} secondes`}
                >
                  <Text style={[styles.chipText, durationCap === d && styles.chipTextActive]}>
                    {d < 60 ? `${d}s` : `${d / 60} min`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipGroup}>
              {CAMERA_SPEED_OPTIONS.map((s) => (
                <Pressable
                  key={`speed-${s}`}
                  onPress={() => setSpeed(s)}
                  style={[styles.chip, speed === s && styles.chipActive]}
                  accessibilityLabel={`Vitesse ${s} fois`}
                >
                  <Text style={[styles.chipText, speed === s && styles.chipTextActive]}>{`${s}×`}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipGroup}>
              {CAMERA_EFFECT_OPTIONS.map((opt) => (
                <Pressable
                  key={`fx-${opt.id}`}
                  onPress={() => setEffect(opt.id)}
                  style={[styles.chip, effect === opt.id && styles.chipActive]}
                  accessibilityLabel={`Effet ${opt.label}`}
                >
                  <Text style={[styles.chipText, effect === opt.id && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            {effect !== 'none' ? (
              <Text style={styles.effectHint}>{describeCameraEffect(effect)}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.timerWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.timerText}>{`${fmtCameraTime(elapsedMs / 1000)} / ${fmtCameraTime(durationCap)} (${remainingSec}s restantes)`}</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={18} color="#FFB199" />
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <View style={{ width: 48 }} />
          <TouchableOpacity
            onPress={recording ? stopRecording : startRecording}
            disabled={busy && !recording}
            style={[styles.recordBtn, recording && styles.recordBtnActive]}
            accessibilityLabel={recording ? 'Arrêter' : 'Enregistrer'}
          >
            {busy && !recording ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={[styles.recordInner, recording && styles.recordInnerStop]} />
            )}
          </TouchableOpacity>
          <View style={{ width: 48 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  webFallback: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  webFallbackText: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.md, lineHeight: 22 },
  closeBtnLg: {
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  closeBtnLgText: { color: '#FFF', fontWeight: '700' },
  topBar: {
    position: 'absolute', top: 48, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topBarRight: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  presetsRow: {
    position: 'absolute', bottom: 160, left: 0, right: 0,
    alignItems: 'center', gap: 12,
  },
  chipGroup: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 10,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: '#FFF', fontWeight: '600', fontSize: FontSizes.sm },
  chipTextActive: { color: '#FFF', fontWeight: '800' },
  effectHint: {
    color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 11,
    paddingHorizontal: Spacing.lg, marginTop: 2,
  },
  timerWrap: {
    position: 'absolute', bottom: 160, left: 24, right: 24, gap: 8,
  },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF3B30' },
  timerText: { color: '#FFF', fontWeight: '700', textAlign: 'center', fontSize: FontSizes.sm },
  bottomBar: {
    position: 'absolute', bottom: 36, left: 0, right: 0,
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
    position: 'absolute', top: 110, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.18)',
    borderColor: 'rgba(255,59,48,0.6)', borderWidth: 1,
    borderRadius: BorderRadius.md, padding: 10,
  },
  errorText: { color: '#FFB199', flex: 1, fontSize: FontSizes.sm },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)' },
});
