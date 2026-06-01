import React, { useState, useEffect, useRef, useCallback, createElement } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Image, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
  Switch, Pressable,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../../src/store/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { isAxiosError } from 'axios';
import apiClient from '../../src/api/client';
import { warmupBackend } from '../../src/api/backendWarmup';
import { tryRefreshAccessToken } from '../../src/api/tokenRefresh';
import { beginUploadNetworkPriority, endUploadNetworkPriority } from '../../src/api/uploadNetworkPriority';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { getBackendOrigin } from '../../src/config/backendBase';
import * as FileSystem from 'expo-file-system/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
import VideoEditor, { type VideoEditorResult } from '../../src/components/VideoEditor';
import IntegratedCameraRecorder, {
  type CameraDurationPreset,
  type CameraSpeedPreset,
  type IntegratedCameraResult,
  type CameraEffectId,
} from '../../src/components/create/IntegratedCameraRecorder';
import WebVideoRecorder from '../../src/components/create/WebVideoRecorder';
import { UploadProgressOverlay } from '../../src/components/create/UploadProgressOverlay';
import {
  clampPublishUploadPercent,
  getPublishUploadStatusLabel,
  mapVideoBytesRatioToGlobalPercent,
} from '../../src/create/publishUploadProgress';
import { buildCameraEffectPayload } from '../../src/components/create/cameraEffects';
import {
  buildRemixApiPayload,
  readRemixSeedFromParams,
  remixActionHint,
  remixActionLabel,
  type RemixSeed,
} from '../../src/components/create/remixSession';
import { LinearGradient } from 'expo-linear-gradient';
import { DateTimePickerSheet } from '../../src/components/common/DateTimePickerSheet';

type SelectedMedia = {
  uri: string;
  type: 'video' | 'image';
  mimeType?: string | null;
  fileName?: string | null;
};

function mimeForImageExt(ext: string): string {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function mimeForVideoExt(ext: string): string {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'webm') return 'video/webm';
  if (e === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

function mimeForAudioExt(ext: string): string {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'm4a' || e === 'aac') return 'audio/mp4';
  if (e === 'caf') return 'audio/x-caf';
  if (e === 'webm') return 'audio/webm';
  if (e === 'wav') return 'audio/wav';
  return 'audio/m4a';
}

/** Sur le web, FormData exige un Blob/File — l’objet `{ uri }` (RN) n’envoie pas de fichier → multer 400. */
function normRouteParam(v: string | string[] | undefined) {
  if (v == null) return '';
  return (Array.isArray(v) ? v[0] : v) || '';
}

function SelectedVideoPreviewWeb({ uri }: { uri: string }) {
  return (
    <View style={[styles.preview, { backgroundColor: '#111' }]}>
      {createElement('video', {
        key: uri,
        src: uri,
        style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
        controls: true,
        muted: true,
        playsInline: true,
        preload: 'metadata',
      })}
    </View>
  );
}

function SelectedVideoPreviewNative({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
  });
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        player.play();
      } catch {
        /* politique autoplay */
      }
    }, 120);
    return () => clearTimeout(id);
  }, [uri, player]);
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        /* */
      }
    };
  }, [player]);
  return <VideoView style={styles.preview} player={player} contentFit="cover" nativeControls />;
}

/** Aperçu local d’une vidéo : `Image` ne décode pas la vidéo ; sur le web il faut une balise `<video>`. */
function SelectedVideoPreview({ uri }: { uri: string }) {
  if (Platform.OS === 'web') {
    return <SelectedVideoPreviewWeb uri={uri} />;
  }
  return <SelectedVideoPreviewNative uri={uri} />;
}

/**
 * Android : `content://` peut être révoqué ou instable pendant un gros POST multipart
 * (vidéo) → copie en cache `file://` avant envoi (même idée que `profile-edit`).
 */
async function copyNativeUriToCacheForUpload(uri: string, extHint: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const u = uri.trim();
  const shouldCopy = u.startsWith('content://') || u.startsWith('ph://') || u.startsWith('assets-library://');
  if (!shouldCopy) return u;
  const dir = FileSystem.cacheDirectory;
  if (!dir) return u;
  const safeExt = extHint.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
  const dest = `${dir}afw-create-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  try {
    await FileSystem.copyAsync({ from: u, to: dest });
    return dest;
  } catch {
    return u;
  }
}

async function normalizeNativeImageForUpload(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: Platform.OS === 'android' ? 0.85 : 0.9, format: ImageManipulator.SaveFormat.JPEG },
    );
    return out.uri || uri;
  } catch {
    return uri;
  }
}

async function appendUploadFile(formData: FormData, media: SelectedMedia, index: number) {
  if (Platform.OS === 'web') {
    const res = await fetch(media.uri);
    const blob = await res.blob();
    let mime = String(blob.type || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') {
      mime = media.type === 'video' ? 'video/mp4' : 'image/jpeg';
    }
    const ext =
      mime.includes('png') ? 'png'
        : mime.includes('webp') ? 'webp'
          : mime.includes('gif') ? 'gif'
            : mime.includes('webm') ? 'webm'
              : mime.includes('quicktime') ? 'mov'
                : media.type === 'video' ? 'mp4' : 'jpg';
    const name = `upload_${index}.${ext}`;
    formData.append('file', new File([blob], name, { type: mime }));
    return;
  }
  const rawUriExt = (media.uri.split('.').pop() || '').split('?')[0] || '';
  const rawNameExt = (String(media.fileName || '').split('.').pop() || '').split('?')[0] || '';
  const extRaw = (rawNameExt || rawUriExt).replace(/[^a-z0-9]/gi, '').slice(0, 8);
  const mimeFromAsset = String(media.mimeType || '').toLowerCase().trim();
  const ext = extRaw || (media.type === 'video' ? 'mp4' : 'jpg');

  let uploadUri = await copyNativeUriToCacheForUpload(media.uri, ext);
  let mimeType = media.type === 'video' ? mimeForVideoExt(ext) : mimeForImageExt(ext);

  if (media.type === 'image') {
    uploadUri = await normalizeNativeImageForUpload(uploadUri);
    mimeType = 'image/jpeg';
  } else if (mimeFromAsset) {
    mimeType = mimeFromAsset;
  }

  const finalExt =
    media.type === 'image'
      ? 'jpg'
      : mimeType.includes('webm')
        ? 'webm'
        : mimeType.includes('quicktime')
          ? 'mov'
          : ext;

  formData.append('file', { uri: uploadUri, name: `upload_${index}.${finalExt}`, type: mimeType } as any);
}

async function appendUploadVoice(formData: FormData, uri: string, index: number) {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    let mime = String(blob.type || '').toLowerCase().trim();
    if (!mime || mime === 'application/octet-stream') {
      mime = 'audio/webm';
    }
    const ext = mime.includes('webm') ? 'webm' : mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : 'webm';
    formData.append('file', new File([blob], `voice_${index}.${ext}`, { type: mime }));
    return;
  }
  const raw = (uri.split('.').pop() || '').split('?')[0] || '';
  const ext = raw.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'm4a';
  const mimeType = mimeForAudioExt(ext);
  const uploadUri = await copyNativeUriToCacheForUpload(uri, ext);
  formData.append('file', { uri: uploadUri, name: `voice_${index}.${ext}`, type: mimeType } as any);
}

type SoundSeed = { title: string; fromVideoId?: string };

type Option = { value: string; label: string };

const CATEGORY_OPTIONS: Option[] = [
  { value: 'general', label: 'Général' },
  { value: 'apprendre', label: 'Apprendre / Éducation' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'musique', label: 'Musique' },
  { value: 'sport', label: 'Sport' },
  { value: 'voyage', label: 'Voyage' },
  { value: 'tech', label: 'Tech' },
  { value: 'mode', label: 'Mode' },
  { value: 'comedie', label: 'Comédie' },
  { value: 'danse', label: 'Danse' },
  { value: 'vlog', label: 'Vlog' },
  { value: 'beaute', label: 'Beauté' },
  { value: 'animaux', label: 'Animaux' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'art', label: 'Art' },
  { value: 'actu', label: 'Actualités' },
];

const LANGUAGE_OPTIONS: Option[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'bm', label: 'Bambara' },
  { value: 'wo', label: 'Wolof' },
  { value: 'ar', label: 'العربية' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ha', label: 'Hausa' },
  { value: 'sw', label: 'Kiswahili' },
];

const COMMENT_VISIBILITY_OPTIONS: Option[] = [
  { value: 'everyone', label: 'Tout le monde' },
  { value: 'friends', label: 'Amis' },
  { value: 'no_one', label: 'Personne' },
];

const VISIBILITY_OPTIONS: { value: 'public' | 'followers' | 'private'; label: string; sub: string; icon: any }[] = [
  { value: 'public', label: 'Public', sub: 'Tout le monde', icon: 'globe-outline' },
  { value: 'followers', label: 'Dans ton Wonder', sub: 'Dans ton Wonder seulement', icon: 'people-outline' },
  { value: 'private', label: 'Privé', sub: 'Vous seul', icon: 'lock-closed-outline' },
];

function labelOf(options: Option[], value: string, fallback: string): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label : fallback;
}

function SwitchPill({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#3B3B3B', true: Colors.primary }}
      thumbColor="#FFF"
    />
  );
}

function formatScheduledAtForDisplay(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}

function setRelativeIso(offsetMin: number): string {
  const d = new Date(Date.now() + offsetMin * 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setTomorrowMorningIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleChip({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, destructive && styles.chipDestructive]}>
      <Text style={[styles.chipText, destructive && styles.chipTextDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const MOBILE_MEDIA_UPLOAD_TIMEOUT_MS = 900000;
const STANDARD_UPLOAD_TIMEOUT_MS = 180000;
const NETWORK_RETRY_DELAY_MS = 900;
const VIDEO_AUTO_RETRY_MAX_ATTEMPTS = 12;
const VIDEO_AUTO_RETRY_MAX_DELAY_MS = 120000;
const MULTIPART_PARALLEL_UPLOADS = 3;
const UPLOAD_FILE_MISSING_MARKER = '__AFW_UPLOAD_FILE_MISSING__';

function computeRetryDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, attempt);
  return NETWORK_RETRY_DELAY_MS * safeAttempt * safeAttempt;
}

function makeIdempotencyKey(scope: string): string {
  return `afw-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const PENDING_PUBLISH_KEY = 'afw_pending_publish_v1';
const PENDING_UPLOAD_DRAFT_KEY = 'afw_pending_upload_draft_v1';
const PENDING_MULTIPART_SESSION_KEY = 'afw_pending_multipart_video_v1';
const ACTIVE_VIDEO_UPLOAD_LOCK_KEY = 'afw_active_video_upload_lock_v1';

type PendingPublishJob = {
  path: '/videos' | '/posts';
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: number;
};

type PendingUploadDraft = {
  contentType: 'video' | 'photo' | 'text' | 'article';
  selectedMedia: SelectedMedia[];
  title: string;
  description: string;
  articleBody: string;
  hashtags: string;
  category: string;
  language: string;
  musicTitle: string;
  visibility: 'public' | 'followers' | 'private';
  hideLikes: boolean;
  commentsDisabled: boolean;
  commentVisibility: 'everyone' | 'friends' | 'no_one';
  scheduledAt: string;
  customThumbnail: { uri: string; mime?: string } | null;
  publishIdempotencyKey?: string;
  step: 'select' | 'edit' | 'details';
  createdAt: number;
};

type PresignUploadResponse = {
  uploadUrl: string;
  file_url: string;
};

type MultipartInitResponse = {
  key: string;
  uploadId: string;
  contentType: string;
};

type PendingMultipartSession = {
  mediaFingerprint: string;
  key: string;
  uploadId: string;
  contentType: string;
  partSize: number;
  totalParts: number;
  updatedAt: number;
};

type ActiveVideoUploadLock = {
  mediaFingerprint: string;
  idempotencyKey: string;
  createdAt: number;
};

function hasMeaningfulEditorEffects(r: VideoEditorResult | null): boolean {
  if (!r) return false;
  const hasMusic = Boolean(r.musicTrackId && r.musicTrackId !== 'm0');
  const trimTouched = r.trimStart !== 0 || r.trimEnd !== 100;
  return (
    r.filter !== 'none'
    || r.texts.length > 0
    || r.stickers.length > 0
    || hasMusic
    || r.speed !== 1
    || trimTouched
    || r.gridEnabled
    || Boolean(r.voiceOverUri)
    || (r.voiceEffect && r.voiceEffect !== 'none')
    || r.transitionId !== 'none'
    || (Array.isArray(r.subtitles) && r.subtitles.length > 0)
  );
}

/** JSON pour `POST /videos` — plafonné côté API à 16 ko. */
function serializeEditorMetadata(
  r: VideoEditorResult,
  voiceOverRemoteUrl?: string | null,
  cameraEffect?: CameraEffectId,
): string {
  const cameraEffectPayload = cameraEffect && cameraEffect !== 'none' ? buildCameraEffectPayload(cameraEffect) : null;
  const payload = {
    v: 1,
    filter: r.filter,
    speed: r.speed,
    trimStart: r.trimStart,
    trimEnd: r.trimEnd,
    gridEnabled: r.gridEnabled,
    transitionId: r.transitionId,
    musicTrackId: r.musicTrackId,
    voiceEffect: r.voiceEffect ?? 'none',
    ...(cameraEffectPayload ? { cameraEffect: cameraEffectPayload } : {}),
    subtitles: Array.isArray(r.subtitles)
      ? r.subtitles.slice(0, 200).map((c) => ({
          index: c.index,
          startMs: c.startMs,
          endMs: c.endMs,
          text: typeof c.text === 'string' ? c.text.slice(0, 240) : '',
        }))
      : [],
    ...(voiceOverRemoteUrl ? { voiceOverUrl: voiceOverRemoteUrl } : {}),
    texts: r.texts.map((t) => ({
      id: t.id,
      text: t.text,
      x: t.x,
      y: t.y,
      color: t.color,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
    })),
    stickers: r.stickers.map((s) => ({
      id: s.id,
      emoji: s.emoji,
      x: s.x,
      y: s.y,
      size: s.size,
    })),
  };
  const s = JSON.stringify(payload);
  return s.length > 16000 ? s.slice(0, 16000) : s;
}

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  const params = useLocalSearchParams<{
    useSoundTitle?: string | string[];
    useSoundFromVideoId?: string | string[];
    remix_of?: string | string[];
    remix_kind?: string | string[];
    remix_username?: string | string[];
    remix_title?: string | string[];
  }>();
  const soundSeedKeyConsumed = useRef<string | null>(null);
  const remixSeedKeyConsumed = useRef<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [contentType, setContentType] = useState<'video' | 'photo' | 'text' | 'article'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'retrying' | 'failed' | 'success' | 'cancelled'>('idle');
  const [uploadRetryAttempt, setUploadRetryAttempt] = useState(0);
  const [step, setStep] = useState<'select' | 'edit' | 'details'>('select');
  /** Réglages écran Éditeur (filtres, texte, musique, etc.) — métadonnées pour API / futur traitement vidéo. */
  const [editorResult, setEditorResult] = useState<VideoEditorResult | null>(null);
  /** Son prérempli depuis le fil (style TikTok « Utiliser ce son »). */
  const [soundSeed, setSoundSeed] = useState<SoundSeed | null>(null);
  /** Compte à rebours avant ouverture caméra (0 = désactivé). */
  const [cameraCountdownSec, setCameraCountdownSec] = useState<0 | 3 | 5 | 10>(0);
  const [countdownTick, setCountdownTick] = useState<number | null>(null);
  /** Caméra intégrée AfriWonder (natif) — préférences durée + vitesse présélectionnées. */
  const [integratedCameraOpen, setIntegratedCameraOpen] = useState(false);
  const [integratedCameraDurationCap, setIntegratedCameraDurationCap] = useState<CameraDurationPreset>(60);
  const [integratedCameraSpeed, setIntegratedCameraSpeed] = useState<CameraSpeedPreset>(1);
  const [integratedCameraEffect, setIntegratedCameraEffect] = useState<CameraEffectId>('none');
  /** Recorder web HTML5 (`getUserMedia` + `MediaRecorder`) — ouvert sur navigateur. */
  const [webRecorderOpen, setWebRecorderOpen] = useState(false);
  /** Mode Duo / Stitch / Remix — vidéo source à crediter dans la publication. */
  const [remixSeed, setRemixSeed] = useState<RemixSeed | null>(null);

  /**
   * Options de publication TikTok-like (capture 1/2) :
   *  - `category` / `language` / `musicTitle` (métadonnées créateur)
   *  - `visibility` Public/Wonder/Privé (`public|followers|private`)
   *  - `hideLikes` / `commentsDisabled` / `commentVisibility` (everyone/friends/no_one)
   *  - `scheduledAt` ISO datetime futur (publication différée)
   *  - `customThumbnail` (uri locale → uploadée au moment du publish)
   */
  const [category, setCategory] = useState<string>('');
  const [language, setLanguage] = useState<string>('fr');
  const [musicTitle, setMusicTitle] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [hideLikes, setHideLikes] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [commentVisibility, setCommentVisibility] = useState<'everyone' | 'friends' | 'no_one'>('everyone');
  const [scheduledAt, setScheduledAt] = useState<string>(''); // ISO local (datetime-local input)
  const [customThumbnail, setCustomThumbnail] = useState<{ uri: string; mime?: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState<null | 'category' | 'language' | 'commentVisibility'>(null);
  const [scheduledPickerOpen, setScheduledPickerOpen] = useState(false);
  const [publishIdempotencyKey, setPublishIdempotencyKey] = useState<string>('');
  const [pendingUploadRecovered, setPendingUploadRecovered] = useState(false);
  const [pendingUploadAvailable, setPendingUploadAvailable] = useState(false);
  const autoResumeAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingPublishFlushRef = useRef(false);
  const autoRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryAttemptRef = useRef(0);
  const cancelUploadRef = useRef(false);
  const activeUploadAbortRef = useRef<AbortController | null>(null);
  const activeUploadXhrsRef = useRef<Set<XMLHttpRequest>>(new Set());
  /** Évite deux `handlePublish` / flush parallèles (doublon en base). */
  const publishInFlightRef = useRef(false);
  const uploadingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        soundSeedKeyConsumed.current = null;
      };
    }, []),
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoRetryTimeoutRef.current) {
        clearTimeout(autoRetryTimeoutRef.current);
        autoRetryTimeoutRef.current = null;
      }
      // Empêche les promesses upload de continuer après démontage d'écran.
      cancelUploadRef.current = true;
      activeUploadAbortRef.current?.abort();
      activeUploadAbortRef.current = null;
    };
  }, []);

  const setUploadingSafe = useCallback((v: boolean) => {
    uploadingRef.current = v;
    if (!isMountedRef.current) return;
    setUploading(v);
  }, []);
  const setUploadProgressSafe = useCallback((v: number | ((prev: number) => number)) => {
    if (!isMountedRef.current) return;
    setUploadProgress(v);
  }, []);
  const setUploadStatusSafe = useCallback((v: typeof uploadStatus | ((prev: typeof uploadStatus) => typeof uploadStatus)) => {
    if (!isMountedRef.current) return;
    setUploadStatus(v);
  }, [uploadStatus]);
  const setUploadRetryAttemptSafe = useCallback((v: number) => {
    if (!isMountedRef.current) return;
    setUploadRetryAttempt(v);
  }, []);

  const savePendingPublishJob = useCallback(async (job: PendingPublishJob) => {
    await AsyncStorage.setItem(PENDING_PUBLISH_KEY, JSON.stringify(job));
  }, []);

  const clearPendingPublishJob = useCallback(async () => {
    await AsyncStorage.removeItem(PENDING_PUBLISH_KEY);
  }, []);

  const readPendingPublishJob = useCallback(async (): Promise<PendingPublishJob | null> => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_PUBLISH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingPublishJob;
      if (!parsed?.path || !parsed?.idempotencyKey || !parsed?.payload) return null;
      if (parsed.path !== '/videos' && parsed.path !== '/posts') return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const sanitizeSelectedMediaForDraft = useCallback((items: SelectedMedia[]): SelectedMedia[] => {
    return items
      .filter((m) => m && typeof m.uri === 'string' && m.uri.trim().length > 0)
      .slice(0, 10)
      .map((m) => ({
        uri: m.uri.trim(),
        type: m.type === 'video' ? 'video' : 'image',
        ...(m.mimeType ? { mimeType: String(m.mimeType).trim() } : {}),
        ...(m.fileName ? { fileName: String(m.fileName).trim() } : {}),
      }));
  }, []);

  const savePendingUploadDraft = useCallback(async (draft: PendingUploadDraft) => {
    try {
      await AsyncStorage.setItem(PENDING_UPLOAD_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // no-op
    }
  }, []);

  const clearPendingUploadDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PENDING_UPLOAD_DRAFT_KEY);
    } catch {
      // no-op
    }
    setPendingUploadAvailable(false);
  }, []);

  const savePendingMultipartSession = useCallback(async (session: PendingMultipartSession) => {
    try {
      await AsyncStorage.setItem(PENDING_MULTIPART_SESSION_KEY, JSON.stringify(session));
    } catch {
      // no-op
    }
  }, []);

  const readPendingMultipartSession = useCallback(async (): Promise<PendingMultipartSession | null> => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_MULTIPART_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingMultipartSession;
      if (!parsed || typeof parsed !== 'object') return null;
      const key = String(parsed.key || '').trim();
      const uploadId = String(parsed.uploadId || '').trim();
      const mediaFingerprint = String(parsed.mediaFingerprint || '').trim();
      const contentType = String(parsed.contentType || '').trim() || 'video/mp4';
      const partSize = Number(parsed.partSize || 0);
      const totalParts = Number(parsed.totalParts || 0);
      if (!key || !uploadId || !mediaFingerprint || partSize <= 0 || totalParts <= 0) return null;
      return {
        mediaFingerprint,
        key,
        uploadId,
        contentType,
        partSize,
        totalParts,
        updatedAt: Number(parsed.updatedAt || Date.now()),
      };
    } catch {
      return null;
    }
  }, []);

  const clearPendingMultipartSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PENDING_MULTIPART_SESSION_KEY);
    } catch {
      // no-op
    }
  }, []);

  const saveActiveVideoUploadLock = useCallback(async (lock: ActiveVideoUploadLock) => {
    try {
      await AsyncStorage.setItem(ACTIVE_VIDEO_UPLOAD_LOCK_KEY, JSON.stringify(lock));
    } catch {
      // no-op
    }
  }, []);

  const readActiveVideoUploadLock = useCallback(async (): Promise<ActiveVideoUploadLock | null> => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_VIDEO_UPLOAD_LOCK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveVideoUploadLock;
      if (!parsed || typeof parsed !== 'object') return null;
      const mediaFingerprint = String(parsed.mediaFingerprint || '').trim();
      const idempotencyKey = String(parsed.idempotencyKey || '').trim();
      const createdAt = Number(parsed.createdAt || 0);
      if (!mediaFingerprint || !idempotencyKey || !Number.isFinite(createdAt) || createdAt <= 0) return null;
      return { mediaFingerprint, idempotencyKey, createdAt };
    } catch {
      return null;
    }
  }, []);

  const clearActiveVideoUploadLock = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_VIDEO_UPLOAD_LOCK_KEY);
    } catch {
      // no-op
    }
  }, []);

  const readPendingUploadDraft = useCallback(async (): Promise<PendingUploadDraft | null> => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_UPLOAD_DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingUploadDraft;
      if (!parsed || typeof parsed !== 'object') return null;
      if (!['video', 'photo', 'text', 'article'].includes(String(parsed.contentType || ''))) return null;
      return {
        contentType: parsed.contentType,
        selectedMedia: sanitizeSelectedMediaForDraft(Array.isArray(parsed.selectedMedia) ? parsed.selectedMedia : []),
        title: String(parsed.title || ''),
        description: String(parsed.description || ''),
        articleBody: String(parsed.articleBody || ''),
        hashtags: String(parsed.hashtags || ''),
        category: String(parsed.category || ''),
        language: String(parsed.language || 'fr'),
        musicTitle: String(parsed.musicTitle || ''),
        visibility: parsed.visibility === 'followers' || parsed.visibility === 'private' ? parsed.visibility : 'public',
        hideLikes: Boolean(parsed.hideLikes),
        commentsDisabled: Boolean(parsed.commentsDisabled),
        commentVisibility: parsed.commentVisibility === 'friends' || parsed.commentVisibility === 'no_one'
          ? parsed.commentVisibility
          : 'everyone',
        scheduledAt: String(parsed.scheduledAt || ''),
        customThumbnail: parsed.customThumbnail && typeof parsed.customThumbnail.uri === 'string'
          ? { uri: parsed.customThumbnail.uri, ...(parsed.customThumbnail.mime ? { mime: parsed.customThumbnail.mime } : {}) }
          : null,
        publishIdempotencyKey: String(parsed.publishIdempotencyKey || '').trim() || undefined,
        step: parsed.step === 'edit' || parsed.step === 'details' ? parsed.step : 'details',
        createdAt: Number(parsed.createdAt || Date.now()),
      };
    } catch {
      return null;
    }
  }, [sanitizeSelectedMediaForDraft]);

  const restorePendingUploadDraft = useCallback((draft: PendingUploadDraft) => {
    setContentType(draft.contentType);
    setSelectedMedia(draft.selectedMedia);
    setTitle(draft.title);
    setDescription(draft.description);
    setArticleBody(draft.articleBody);
    setHashtags(draft.hashtags);
    setCategory(draft.category);
    setLanguage(draft.language || 'fr');
    setMusicTitle(draft.musicTitle);
    setVisibility(draft.visibility);
    setHideLikes(draft.hideLikes);
    setCommentsDisabled(draft.commentsDisabled);
    setCommentVisibility(draft.commentVisibility);
    setScheduledAt(draft.scheduledAt);
    setCustomThumbnail(draft.customThumbnail);
    setPublishIdempotencyKey(String(draft.publishIdempotencyKey || '').trim());
    setStep(draft.step === 'edit' && draft.contentType === 'video' && draft.selectedMedia.length > 0 ? 'edit' : 'details');
  }, []);

  useEffect(() => {
    const t = normRouteParam(params.useSoundTitle).trim().slice(0, 200);
    const vid = normRouteParam(params.useSoundFromVideoId).trim();
    if (!t && !vid) return;
    const key = `${t}|${vid}`;
    if (soundSeedKeyConsumed.current === key) return;
    soundSeedKeyConsumed.current = key;
    setSoundSeed({ title: (t || 'Son original').slice(0, 200), fromVideoId: vid || undefined });
    setContentType('video');
    setStep('select');
    setEditorResult(null);
  }, [params.useSoundTitle, params.useSoundFromVideoId]);

  useEffect(() => {
    const seed = readRemixSeedFromParams({
      remix_of: normRouteParam(params.remix_of),
      remix_kind: normRouteParam(params.remix_kind),
      remix_username: normRouteParam(params.remix_username),
      remix_title: normRouteParam(params.remix_title),
    });
    if (!seed) return;
    const key = `${seed.remixOfId}|${seed.kind}`;
    if (remixSeedKeyConsumed.current === key) return;
    remixSeedKeyConsumed.current = key;
    setRemixSeed(seed);
    setContentType('video');
    setStep('select');
  }, [params.remix_of, params.remix_kind, params.remix_username, params.remix_title]);

  useEffect(() => {
    if (pendingUploadRecovered) return;
    let cancelled = false;
    void (async () => {
      const draft = await readPendingUploadDraft();
      if (cancelled) return;
      if (draft) {
        restorePendingUploadDraft(draft);
        setPendingUploadAvailable(true);
      } else {
        setPendingUploadAvailable(false);
      }
      setPendingUploadRecovered(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingUploadRecovered, readPendingUploadDraft, restorePendingUploadDraft]);

  useEffect(() => {
    if (!pendingUploadRecovered) return;
    if (uploading) return;
    const hasMedia = selectedMedia.length > 0;
    const hasTextContent = Boolean(title.trim() || description.trim() || articleBody.trim() || hashtags.trim());
    const shouldPersist = hasMedia || hasTextContent || contentType === 'text' || contentType === 'article';
    if (!shouldPersist || step === 'select') {
      void clearPendingUploadDraft();
      return;
    }
    const draft: PendingUploadDraft = {
      contentType,
      selectedMedia: sanitizeSelectedMediaForDraft(selectedMedia),
      title,
      description,
      articleBody,
      hashtags,
      category,
      language,
      musicTitle,
      visibility,
      hideLikes,
      commentsDisabled,
      commentVisibility,
      scheduledAt,
      customThumbnail,
      publishIdempotencyKey: publishIdempotencyKey || undefined,
      step,
      createdAt: Date.now(),
    };
    setPendingUploadAvailable(true);
    void savePendingUploadDraft(draft);
  }, [
    pendingUploadRecovered,
    uploading,
    selectedMedia,
    title,
    description,
    articleBody,
    hashtags,
    contentType,
    step,
    category,
    language,
    musicTitle,
    visibility,
    hideLikes,
    commentsDisabled,
    commentVisibility,
    scheduledAt,
    customThumbnail,
    publishIdempotencyKey,
    sanitizeSelectedMediaForDraft,
    savePendingUploadDraft,
    clearPendingUploadDraft,
  ]);

  const requireAuth = (action: string) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', `Veuillez vous connecter pour ${action}`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push({ pathname: '/(auth)/login', params: { returnTo: '/(tabs)/create' } }) },
      ]);
      return false;
    }
    return true;
  };

  const handlePickVideo = async () => {
    if (!requireAuth('publier une vidéo')) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Accès à la galerie nécessaire");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      /** Android : l’éditeur système après sélection peut faire fermer l’app / instabilité (audit mobile-first). */
      allowsEditing: Platform.OS !== 'android',
      quality: 0.8,
      /** iOS : export compressé — moins de RAM / risque OOM qu’avec du 4K « passthrough ». */
      ...(Platform.OS === 'ios' ? { videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality } : {}),
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setSelectedMedia([{ uri: a.uri, type: 'video', mimeType: a.mimeType ?? null, fileName: a.fileName ?? null }]);
      setContentType('video');
      setEditorResult(null);
      setStep('edit');
    }
  };

  const handlePickImage = async () => {
    if (!requireAuth('publier une photo')) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Accès à la galerie nécessaire");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedMedia(result.assets.map(a => ({
        uri: a.uri,
        type: 'image' as const,
        mimeType: a.mimeType ?? null,
        fileName: a.fileName ?? null,
      })));
      setContentType('photo');
      setStep('details');
    }
  };

  const handleRecordVideo = async () => {
    if (!requireAuth('enregistrer une vidéo')) return;
    let n = cameraCountdownSec;
    while (n > 0) {
      setCountdownTick(n);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      n -= 1;
    }
    setCountdownTick(null);

    if (Platform.OS === 'web') {
      // Sur web : ouvrir notre recorder HTML5 custom (getUserMedia + MediaRecorder).
      // `ImagePicker.launchCameraAsync` ne demande PAS l'accès caméra sur Firefox/Edge
      // desktop — il fallback sur input file → l'utilisateur voit l'Explorateur Windows.
      setWebRecorderOpen(true);
      return;
    }

    setIntegratedCameraOpen(true);
  };

  const handleWebRecorderCaptured = useCallback(
    (result: { uri: string; mimeType: string; durationSec: number }) => {
      setWebRecorderOpen(false);
      setSelectedMedia([{
        uri: result.uri,
        type: 'video',
        mimeType: result.mimeType,
        fileName: `afw-web-cam-${Date.now()}.${result.mimeType.includes('mp4') ? 'mp4' : 'webm'}`,
      }]);
      setContentType('video');
      setEditorResult(null);
      setStep('edit');
    },
    [],
  );

  const handleIntegratedCameraCaptured = useCallback((result: IntegratedCameraResult) => {
    setIntegratedCameraOpen(false);
    setIntegratedCameraDurationCap(result.durationCapSec);
    setIntegratedCameraSpeed(result.speed);
    setIntegratedCameraEffect(result.effect);
    setSelectedMedia([{
      uri: result.uri,
      type: 'video',
      mimeType: 'video/mp4',
      fileName: `afw-cam-${Date.now()}.mp4`,
    }]);
    setContentType('video');
    setEditorResult(null);
    setStep('edit');
  }, []);

  const handleTextPost = () => {
    if (!requireAuth('publier un texte')) return;
    setContentType('text');
    setSelectedMedia([]);
    setStep('details');
  };

  const handleArticlePost = () => {
    if (!requireAuth('publier un article')) return;
    setContentType('article');
    setSelectedMedia([]);
    setStep('details');
  };

  const isRetriableNetworkError = (error: unknown) => {
    if (!isAxiosError(error)) return false;
    const m = String(error.message || '').toLowerCase();
    if (!error.response) return true;
    return error.code === 'ECONNABORTED' || m.includes('network') || m.includes('timeout') || m.includes('socket');
  };

  const UPLOAD_CANCELLED_MARKER = '__AFW_UPLOAD_CANCELLED__';
  const throwIfUploadCancelled = () => {
    if (cancelUploadRef.current) {
      throw new Error(UPLOAD_CANCELLED_MARKER);
    }
  };
  const isUploadCancelledError = (error: unknown) => {
    if (error instanceof Error && error.message === UPLOAD_CANCELLED_MARKER) return true;
    if (isAxiosError(error) && error.code === 'ERR_CANCELED') return true;
    return false;
  };
  const isUploadFileMissingError = (error: unknown) => {
    return error instanceof Error && error.message === UPLOAD_FILE_MISSING_MARKER;
  };

  const ensureSelectedMediaStillReadable = async (media: SelectedMedia): Promise<void> => {
    if (Platform.OS === 'web') return;
    const normalized = await copyNativeUriToCacheForUpload(media.uri, media.type === 'video' ? 'mp4' : 'jpg');
    const info = await FileSystem.getInfoAsync(normalized);
    if (!info.exists || (typeof info.size === 'number' && info.size <= 0)) {
      throw new Error(UPLOAD_FILE_MISSING_MARKER);
    }
  };

  const buildVideoMediaFingerprint = useCallback(async (media: SelectedMedia): Promise<string> => {
    if (Platform.OS === 'web') {
      return `${media.uri}|${media.fileName || ''}|${media.mimeType || ''}|web`;
    }
    const rawUriExt = (media.uri.split('.').pop() || '').split('?')[0] || '';
    const normalizedExt = rawUriExt.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'mp4';
    const fileUri = await copyNativeUriToCacheForUpload(media.uri, normalizedExt);
    const info = await FileSystem.getInfoAsync(fileUri);
    const size = Number((info as { size?: number })?.size || 0);
    return `${fileUri}|${size}|${normalizedExt}`;
  }, []);

  const uploadMultipartWithRetry = async (
    path: '/upload/video' | '/upload/image' | '/upload/audio',
    buildForm: () => Promise<FormData>,
    timeoutMs: number,
    onUploadBytesProgress?: (loaded: number, total: number) => void,
  ) => {
    const attempts = path === '/upload/video' ? 4 : 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        setUploadStatusSafe(attempt > 1 ? 'retrying' : 'uploading');
        setUploadRetryAttemptSafe(attempt > 1 ? attempt - 1 : 0);
        const form = await buildForm();
        return await apiClient.post(path, form, {
          timeout: timeoutMs,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          signal: activeUploadAbortRef.current?.signal,
          onUploadProgress: onUploadBytesProgress
            ? (ev) => {
                const total = Number(ev.total || 0);
                const loaded = Number(ev.loaded || 0);
                if (total > 0) onUploadBytesProgress(loaded, total);
              }
            : undefined,
        });
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        throwIfUploadCancelled();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const requestVideoPresign = async (filename: string, contentType: string): Promise<PresignUploadResponse> => {
    const attempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        const res = await apiClient.post('/upload/presign', {
          kind: 'video',
          filename,
          contentType,
        }, {
          timeout: STANDARD_UPLOAD_TIMEOUT_MS,
          signal: activeUploadAbortRef.current?.signal,
        });
        const d = res.data?.data;
        const uploadUrl = String(d?.uploadUrl || '').trim();
        const fileUrl = String(d?.file_url || '').trim();
        if (!uploadUrl || !fileUrl) {
          throw new Error('Réponse presign invalide');
        }
        return { uploadUrl, file_url: fileUrl };
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        throwIfUploadCancelled();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const requestMultipartInit = async (filename: string, contentType: string): Promise<MultipartInitResponse> => {
    const attempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        if (attempt > 1) {
          setUploadStatusSafe('retrying');
          setUploadRetryAttemptSafe(attempt - 1);
        }
        const res = await apiClient.post('/upload/multipart/init', {
          kind: 'video',
          filename,
          contentType,
        }, {
          timeout: STANDARD_UPLOAD_TIMEOUT_MS,
          signal: activeUploadAbortRef.current?.signal,
        });
        const d = res.data?.data;
        const key = String(d?.key || '').trim();
        const uploadId = String(d?.uploadId || '').trim();
        const ct = String(d?.contentType || contentType || '').trim();
        if (!key || !uploadId || !ct) {
          throw new Error('Réponse multipart init invalide');
        }
        return { key, uploadId, contentType: ct };
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const requestMultipartPartUrl = async (key: string, uploadId: string, partNumber: number): Promise<string> => {
    const attempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        if (attempt > 1) {
          setUploadStatusSafe('retrying');
          setUploadRetryAttemptSafe(attempt - 1);
        }
        const res = await apiClient.post('/upload/multipart/part-url', {
          key,
          uploadId,
          partNumber,
        }, {
          timeout: STANDARD_UPLOAD_TIMEOUT_MS,
          signal: activeUploadAbortRef.current?.signal,
        });
        const url = String(res.data?.data?.uploadUrl || '').trim();
        if (!url) throw new Error('URL de part multipart manquante');
        return url;
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const requestMultipartStatus = async (
    key: string,
    uploadId: string,
  ): Promise<{ PartNumber: number; ETag: string }[]> => {
    const attempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        if (attempt > 1) {
          setUploadStatusSafe('retrying');
          setUploadRetryAttemptSafe(attempt - 1);
        }
        const res = await apiClient.post('/upload/multipart/status', {
          key,
          uploadId,
        }, {
          timeout: STANDARD_UPLOAD_TIMEOUT_MS,
          signal: activeUploadAbortRef.current?.signal,
        });
        const raw = res.data?.data?.parts;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((p: any) => ({
            PartNumber: Number(p?.PartNumber || 0),
            ETag: String(p?.ETag || '').trim(),
          }))
          .filter((p) => p.PartNumber > 0 && p.ETag.length > 0)
          .sort((a, b) => a.PartNumber - b.PartNumber);
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const abortMultipart = async (key: string, uploadId: string) => {
    try {
      await apiClient.post('/upload/multipart/abort', { key, uploadId }, {
        timeout: STANDARD_UPLOAD_TIMEOUT_MS,
      });
    } catch {
      // no-op
    }
  };

  const uploadPartBytesWithXhr = async (
    url: string,
    bytes: Uint8Array,
    contentType: string,
    onPartBytesProgress?: (ratio01: number) => void,
  ): Promise<string> => {
    const attempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        if (attempt > 1) {
          setUploadStatusSafe('retrying');
          setUploadRetryAttemptSafe(attempt - 1);
        }
        const etag = await new Promise<string>((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            activeUploadXhrsRef.current.add(xhr);
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
            if (onPartBytesProgress) {
              xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable && ev.total > 0) {
                  onPartBytesProgress(ev.loaded / ev.total);
                }
              };
            }
            const finishXhr = () => {
              activeUploadXhrsRef.current.delete(xhr);
            };
            xhr.onload = () => {
              finishXhr();
              if (xhr.status >= 200 && xhr.status < 300) {
                const etagRaw = xhr.getResponseHeader('etag') || xhr.getResponseHeader('ETag') || '';
                const parsed = String(etagRaw).replace(/"/g, '').trim();
                if (!parsed) {
                  reject(new Error('ETag manquant après upload part'));
                  return;
                }
                resolve(parsed);
                return;
              }
              reject(new Error(`Upload part HTTP ${xhr.status}`));
            };
            xhr.onerror = () => {
              finishXhr();
              reject(new Error('Upload part réseau interrompu'));
            };
            xhr.onabort = () => {
              finishXhr();
              reject(new Error(UPLOAD_CANCELLED_MARKER));
            };
            xhr.send(bytes as unknown as BodyInit);
          } catch (e) {
            reject(e);
          }
        });
        return etag;
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        const msg = String((error as Error)?.message || '').toLowerCase();
        const httpStatus = Number((msg.match(/http\s+(\d{3})/)?.[1] || '0'));
        const retriableHttp = httpStatus >= 500 || httpStatus === 0;
        const retriable = retriableHttp || /réseau|network|timeout|socket|etag/.test(msg);
        if (!retriable || attempt >= attempts) break;
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const decodeBase64ToBytes = (b64: string): Uint8Array => {
    const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const out: number[] = [];
    let i = 0;
    while (i < clean.length) {
      const c1 = chars.indexOf(clean.charAt(i++));
      const c2 = chars.indexOf(clean.charAt(i++));
      const c3 = chars.indexOf(clean.charAt(i++));
      const c4 = chars.indexOf(clean.charAt(i++));
      if (c1 < 0 || c2 < 0) break;
      const b1 = (c1 << 2) | (c2 >> 4);
      out.push(b1 & 0xff);
      if (c3 >= 0) {
        const b2 = ((c2 & 15) << 4) | (c3 >> 2);
        out.push(b2 & 0xff);
      }
      if (c4 >= 0) {
        const b3 = ((c3 & 3) << 6) | c4;
        out.push(b3 & 0xff);
      }
    }
    return Uint8Array.from(out);
  };

  const readFileChunkAsBytes = async (fileUri: string, offset: number, length: number): Promise<Uint8Array> => {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
      position: offset,
      length,
    });
    return decodeBase64ToBytes(base64);
  };

  const tryMultipartR2VideoUpload = async (media: SelectedMedia, index: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;
    const rawUriExt = (media.uri.split('.').pop() || '').split('?')[0] || '';
    const rawNameExt = (String(media.fileName || '').split('.').pop() || '').split('?')[0] || '';
    const extRaw = (rawNameExt || rawUriExt).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'mp4';
    const mimeFromAsset = String(media.mimeType || '').toLowerCase().trim();
    const contentType = mimeFromAsset || mimeForVideoExt(extRaw);
    const normalizedExt = contentType.includes('webm')
      ? 'webm'
      : contentType.includes('quicktime')
        ? 'mov'
        : 'mp4';
    const fileUri = await copyNativeUriToCacheForUpload(media.uri, normalizedExt);
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || typeof info.size !== 'number' || info.size <= 0) return null;

    const partSize = Platform.OS === 'android' ? 4 * 1024 * 1024 : 6 * 1024 * 1024;
    const totalParts = Math.max(1, Math.ceil(info.size / partSize));
    const mediaFingerprint = `${fileUri}|${info.size}|${normalizedExt}`;
    const filename = `mobile-video-${Date.now()}-${index}.${normalizedExt}`;
    let key = '';
    let uploadId = '';
    const resumedPartEtags = new Map<number, string>();
    const pendingSession = await readPendingMultipartSession();
    if (
      pendingSession
      && pendingSession.mediaFingerprint === mediaFingerprint
      && pendingSession.partSize === partSize
      && pendingSession.totalParts === totalParts
    ) {
      try {
        const existingParts = await requestMultipartStatus(pendingSession.key, pendingSession.uploadId);
        for (const p of existingParts) resumedPartEtags.set(p.PartNumber, p.ETag);
        key = pendingSession.key;
        uploadId = pendingSession.uploadId;
        if (existingParts.length > 0) {
          setUploadProgressSafe((prev) =>
            Math.max(prev, mapVideoBytesRatioToGlobalPercent(existingParts.length / totalParts)),
          );
        }
      } catch {
        await clearPendingMultipartSession();
      }
    }
    if (!key || !uploadId) {
      const created = await requestMultipartInit(filename, contentType);
      key = created.key;
      uploadId = created.uploadId;
      await savePendingMultipartSession({
        mediaFingerprint,
        key,
        uploadId,
        contentType,
        partSize,
        totalParts,
        updatedAt: Date.now(),
      });
    }
    const parts: { PartNumber: number; ETag: string }[] = [];

    try {
      let uploadedPartsCount = 0;
      for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const resumedEtag = resumedPartEtags.get(partNumber);
        if (resumedEtag) {
          parts.push({ PartNumber: partNumber, ETag: resumedEtag });
          uploadedPartsCount += 1;
        }
      }
      if (uploadedPartsCount > 0) {
        setUploadProgressSafe((prev) =>
          Math.max(prev, mapVideoBytesRatioToGlobalPercent(uploadedPartsCount / totalParts)),
        );
      }
      for (let batchStart = 1; batchStart <= totalParts; batchStart += MULTIPART_PARALLEL_UPLOADS) {
        throwIfUploadCancelled();
        const batch: number[] = [];
        for (
          let partNumber = batchStart;
          partNumber < batchStart + MULTIPART_PARALLEL_UPLOADS && partNumber <= totalParts;
          partNumber += 1
        ) {
          if (!resumedPartEtags.get(partNumber)) {
            batch.push(partNumber);
          }
        }
        if (batch.length === 0) {
          continue;
        }
        const batchResults = await Promise.all(
          batch.map(async (partNumber) => {
            throwIfUploadCancelled();
            const offset = (partNumber - 1) * partSize;
            const remaining = info.size - offset;
            const chunkLen = Math.min(partSize, remaining);
            const partUrl = await requestMultipartPartUrl(key, uploadId, partNumber);
            const bytes = await readFileChunkAsBytes(fileUri, offset, chunkLen);
            const etag = await uploadPartBytesWithXhr(partUrl, bytes, contentType, (partRatio) => {
              const virtualDone = partNumber - 1 + partRatio;
              setUploadProgressSafe((prev) =>
                Math.max(prev, mapVideoBytesRatioToGlobalPercent(virtualDone / totalParts)),
              );
            });
            return { PartNumber: partNumber, ETag: etag };
          }),
        );
        for (const result of batchResults) {
          parts.push(result);
          uploadedPartsCount += 1;
        }
        await savePendingMultipartSession({
          mediaFingerprint,
          key,
          uploadId,
          contentType,
          partSize,
          totalParts,
          updatedAt: Date.now(),
        });
        setUploadProgressSafe((prev) =>
          Math.max(prev, mapVideoBytesRatioToGlobalPercent(uploadedPartsCount / totalParts)),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      parts.sort((a, b) => a.PartNumber - b.PartNumber);
      let completed: { data?: { data?: { file_url?: string } } } | null = null;
      const completeAttempts = 3;
      let completeErr: unknown = null;
      for (let attempt = 1; attempt <= completeAttempts; attempt += 1) {
        throwIfUploadCancelled();
        try {
          if (attempt > 1) {
            setUploadStatusSafe('retrying');
            setUploadRetryAttemptSafe(attempt - 1);
          }
          completed = await apiClient.post('/upload/multipart/complete', {
            key,
            uploadId,
            parts,
          }, {
            timeout: MOBILE_MEDIA_UPLOAD_TIMEOUT_MS,
            signal: activeUploadAbortRef.current?.signal,
          });
          completeErr = null;
          break;
        } catch (error: unknown) {
          if (isUploadCancelledError(error)) throw error;
          completeErr = error;
          if (!isRetriableNetworkError(error) || attempt >= completeAttempts) break;
          await tryRefreshAccessToken();
          await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
        }
      }
      if (completeErr) throw completeErr;
      const fileUrl = String(completed?.data?.data?.file_url || '').trim();
      await clearPendingMultipartSession();
      return fileUrl || null;
    } catch (e) {
      if (isUploadCancelledError(e)) throw e;
      if (!isRetriableNetworkError(e)) {
        await abortMultipart(key, uploadId);
        await clearPendingMultipartSession();
      }
      return null;
    }
  };

  const tryDirectR2VideoUpload = async (media: SelectedMedia, index: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        const rawUriExt = (media.uri.split('.').pop() || '').split('?')[0] || '';
        const rawNameExt = (String(media.fileName || '').split('.').pop() || '').split('?')[0] || '';
        const extRaw = (rawNameExt || rawUriExt).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'mp4';
        const mimeFromAsset = String(media.mimeType || '').toLowerCase().trim();
        const contentType = mimeFromAsset || mimeForVideoExt(extRaw);
        const normalizedExt = contentType.includes('webm')
          ? 'webm'
          : contentType.includes('quicktime')
            ? 'mov'
            : 'mp4';
        const fileUri = await copyNativeUriToCacheForUpload(media.uri, normalizedExt);
        const filename = `mobile-video-${Date.now()}-${index}.${normalizedExt}`;
        const presign = await requestVideoPresign(filename, contentType);
        const putRes = await FileSystem.uploadAsync(presign.uploadUrl, fileUri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': contentType,
          },
        });
        if (putRes.status < 200 || putRes.status >= 300) {
          throw new Error(`PUT direct R2 refusé (${putRes.status})`);
        }
        return presign.file_url;
      } catch (e) {
        if (isUploadCancelledError(e)) throw e;
        if (attempt >= attempts) {
          break;
        }
        throwIfUploadCancelled();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    const viaMultipart = await tryMultipartR2VideoUpload(media, index);
    if (viaMultipart) return viaMultipart;
    console.warn('Direct + multipart R2 video upload failed, fallback to backend /upload/video');
    return null;
  };

  const postWithRetry = async <T = any>(path: string, body: unknown, idempotencyKey?: string) => {
    const attempts = 3;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      throwIfUploadCancelled();
      try {
        const res = await apiClient.post(path, body, {
          timeout: 120000,
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
          signal: activeUploadAbortRef.current?.signal,
        });
        return res as T;
      } catch (error: unknown) {
        if (isUploadCancelledError(error)) throw error;
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        throwIfUploadCancelled();
        await new Promise((r) => setTimeout(r, computeRetryDelayMs(attempt)));
      }
    }
    throw lastError;
  };

  const handleCancelUpload = () => {
    if (!uploading) return;
    cancelUploadRef.current = true;
    activeUploadAbortRef.current?.abort();
    for (const xhr of activeUploadXhrsRef.current) {
      try {
        xhr.abort();
      } catch {
        /* ignore */
      }
    }
    activeUploadXhrsRef.current.clear();
    setUploadStatusSafe('cancelled');
    void (async () => {
      const session = await readPendingMultipartSession();
      if (session?.key && session?.uploadId) {
        await abortMultipart(session.key, session.uploadId);
        await clearPendingMultipartSession();
      }
      await clearActiveVideoUploadLock();
    })();
  };

  const flushPendingPublishIfAny = useCallback(async () => {
    if (!isAuthenticated || pendingPublishFlushRef.current) return;
    if (publishInFlightRef.current || uploadingRef.current) return;
    pendingPublishFlushRef.current = true;
    try {
      const pending = await readPendingPublishJob();
      if (!pending) return;
      if (publishInFlightRef.current || uploadingRef.current) return;
      publishInFlightRef.current = true;
      try {
        await warmupBackend();
        await postWithRetry(pending.path, pending.payload, pending.idempotencyKey);
        await clearPendingPublishJob();
        Alert.alert('Publication envoyée', 'Votre publication en attente a été envoyée avec succès.');
      } finally {
        publishInFlightRef.current = false;
      }
    } catch {
      // On garde la tâche en file pour une prochaine tentative.
    } finally {
      pendingPublishFlushRef.current = false;
    }
  }, [clearPendingPublishJob, isAuthenticated, postWithRetry, readPendingPublishJob]);

  useFocusEffect(
    useCallback(() => {
      void flushPendingPublishIfAny();
      return () => {};
    }, [flushPendingPublishIfAny]),
  );

  const handlePublish = async () => {
    if (!requireAuth('publier')) return;
    if (publishInFlightRef.current || uploadingRef.current) return;

    if (contentType === 'text' || contentType === 'article') {
      if (!description.trim() && contentType === 'text') { Alert.alert('Contenu requis', 'Écrivez quelque chose'); return; }
      if (!title.trim() && contentType === 'article') { Alert.alert('Titre requis', 'Ajoutez un titre à votre article'); return; }
    } else {
      if (selectedMedia.length === 0) return;
      if (!title.trim()) { Alert.alert('Titre requis', 'Ajoutez un titre'); return; }
    }

    if (contentType === 'video' && selectedMedia[0]?.type === 'video') {
      try {
        const mediaFingerprint = await buildVideoMediaFingerprint(selectedMedia[0]);
        const existingLock = await readActiveVideoUploadLock();
        if (existingLock && existingLock.mediaFingerprint === mediaFingerprint) {
          setPublishIdempotencyKey(existingLock.idempotencyKey);
          setPendingUploadAvailable(true);
          Alert.alert(
            'Upload déjà en cours',
            "Cette vidéo est déjà en cours d'envoi ou en reprise automatique. Inutile de relancer l'upload.",
          );
          return;
        }
      } catch {
        // Si le fingerprint échoue, on ne bloque pas la publication.
      }
    }

    publishInFlightRef.current = true;
    setUploadingSafe(true);
    setUploadProgressSafe(0);
    setUploadStatusSafe('uploading');
    setUploadRetryAttemptSafe(0);
    cancelUploadRef.current = false;
    activeUploadAbortRef.current = new AbortController();
    let uploadPriorityActive = false;

    try {
      if (contentType === 'video') {
        beginUploadNetworkPriority();
        uploadPriorityActive = true;
      }
      const stablePublishIdempotencyKey =
        publishIdempotencyKey.trim() || makeIdempotencyKey(contentType);
      if (!publishIdempotencyKey.trim()) {
        setPublishIdempotencyKey(stablePublishIdempotencyKey);
      }
      if (contentType === 'video' && selectedMedia[0]?.type === 'video') {
        try {
          const mediaFingerprint = await buildVideoMediaFingerprint(selectedMedia[0]);
          await saveActiveVideoUploadLock({
            mediaFingerprint,
            idempotencyKey: stablePublishIdempotencyKey,
            createdAt: Date.now(),
          });
        } catch {
          // no-op
        }
      }
      // Réveille le backend avant les appels upload (Render cold start + réseaux instables).
      setUploadProgressSafe(1);
      await warmupBackend();
      setUploadProgressSafe(3);
      /** Jeton frais avant chaîne upload + POST (complète le refresh proportionnel au timeout dans `apiClient`). */
      await tryRefreshAccessToken();

      const hashtagArray = hashtags.split(/[,#\s]+/).filter(h => h.trim()).map(h => h.trim());
      let mediaUrls: string[] = [];
      let videoUrl: string | undefined;
      let videoThumb: string | undefined;

      // Upload médias → `/api/upload/image` ou `/api/upload/video` (Express)
      if (selectedMedia.length > 0) {
        for (const media of selectedMedia) {
          await ensureSelectedMediaStillReadable(media);
        }
        setUploadProgressSafe(5);
        for (let i = 0; i < selectedMedia.length; i++) {
          const media = selectedMedia[i];
          if (media.type === 'video') {
            const directR2Url = await tryDirectR2VideoUpload(media, i);
            if (directR2Url) {
              videoUrl = directR2Url;
              setUploadProgressSafe(85);
            } else {
              const uploadRes = await uploadMultipartWithRetry(
                '/upload/video',
                async () => {
                  const formData = new FormData();
                  await appendUploadFile(formData, media, i);
                  return formData;
                },
                MOBILE_MEDIA_UPLOAD_TIMEOUT_MS,
                (loaded, total) => {
                  const fileRatio = total > 0 ? loaded / total : 0;
                  const sliceStart = i / selectedMedia.length;
                  const sliceEnd = (i + 1) / selectedMedia.length;
                  const globalRatio = sliceStart + fileRatio * (sliceEnd - sliceStart);
                  setUploadProgressSafe((prev) =>
                    Math.max(prev, mapVideoBytesRatioToGlobalPercent(globalRatio)),
                  );
                },
              );
              const d = uploadRes.data?.data;
              videoUrl = d?.file_url || d?.url || '';
              videoThumb = d?.thumbnail_url || undefined;
              setUploadProgressSafe(85);
            }
          } else {
            const uploadRes = await uploadMultipartWithRetry(
              '/upload/image',
              async () => {
                const formData = new FormData();
                await appendUploadFile(formData, media, i);
                return formData;
              },
              STANDARD_UPLOAD_TIMEOUT_MS,
              (loaded, total) => {
                if (total <= 0) return;
                const pct = 5 + Math.round((loaded / total) * 75);
                setUploadProgressSafe((prev) => Math.max(prev, clampPublishUploadPercent(pct)));
              },
            );
            const d = uploadRes.data?.data;
            const fileUrl = d?.file_url || d?.url || '';
            mediaUrls.push(fileUrl);
            setUploadProgressSafe(5 + Math.round(((i + 1) / selectedMedia.length) * 80));
          }
        }
      }

      setUploadProgressSafe(88);

      let voiceOverRemoteUrl: string | null = null;
      if (contentType === 'video' && editorResult?.voiceOverUri) {
        const voiceUri = String(editorResult.voiceOverUri || '').trim();
        if (!voiceUri) throw new Error('Piste voix off invalide');
        setUploadProgressSafe(86);
        const audioRes = await uploadMultipartWithRetry('/upload/audio', async () => {
          const audioForm = new FormData();
          await appendUploadVoice(audioForm, voiceUri, 0);
          return audioForm;
        }, STANDARD_UPLOAD_TIMEOUT_MS);
        voiceOverRemoteUrl = audioRes.data?.data?.file_url || null;
        if (!voiceOverRemoteUrl) {
          throw new Error('URL voix off manquante après upload');
        }
        setUploadProgressSafe(90);
      }

      if (contentType === 'video') {
        if (!videoUrl) {
          throw new Error('URL vidéo manquante après upload');
        }
        const resolvedMusicTitle =
          (musicTitle && musicTitle.trim()) ||
          (soundSeed?.title && soundSeed.title.trim()) ||
          (editorResult?.musicTitle && editorResult.musicTitle.trim()) ||
          '';
        const editorMeta = editorResult
          ? serializeEditorMetadata(editorResult, voiceOverRemoteUrl, integratedCameraEffect)
          : '';

        let finalThumbnail = videoThumb || videoUrl;
        if (customThumbnail?.uri) {
          try {
            const tRes = await uploadMultipartWithRetry('/upload/image', async () => {
              const tForm = new FormData();
              await appendUploadFile(tForm, { uri: customThumbnail.uri, type: 'image' }, 0);
              return tForm;
            }, STANDARD_UPLOAD_TIMEOUT_MS);
            const tUrl = tRes.data?.data?.file_url || tRes.data?.data?.url;
            if (typeof tUrl === 'string' && tUrl.trim()) finalThumbnail = tUrl.trim();
          } catch (e) {
            console.warn('custom thumbnail upload failed', e);
          }
        }

        const remixPayload = buildRemixApiPayload(remixSeed);
        const videoPayload = {
          title: title.trim(),
          description: description.trim() || title.trim(),
          video_url: videoUrl,
          thumbnail_url: finalThumbnail,
          hashtags: hashtagArray,
          media_type: 'video',
          ...(resolvedMusicTitle ? { music_title: resolvedMusicTitle.slice(0, 200) } : {}),
          ...(remixPayload
            ? remixPayload
            : soundSeed?.fromVideoId
              ? { remix_of_id: soundSeed.fromVideoId }
              : {}),
          ...(editorMeta ? { editor_metadata: editorMeta } : {}),
          ...(category ? { category } : {}),
          ...(language ? { language } : {}),
          visibility,
          hide_likes: hideLikes,
          comments_disabled: commentsDisabled,
          comment_visibility: commentVisibility,
          ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
        };
        await savePendingPublishJob({
          path: '/videos',
          payload: videoPayload,
          idempotencyKey: stablePublishIdempotencyKey,
          createdAt: Date.now(),
        });
        setUploadProgressSafe(96);
        await postWithRetry('/videos', videoPayload, stablePublishIdempotencyKey);
        await clearPendingPublishJob();
        await clearActiveVideoUploadLock();
      } else if (contentType === 'text') {
        const textPayload = {
          text: description.trim(),
          ...(mediaUrls.length > 0 ? { images: mediaUrls } : {}),
          visibility: 'public',
        };
        await savePendingPublishJob({
          path: '/posts',
          payload: textPayload,
          idempotencyKey: stablePublishIdempotencyKey,
          createdAt: Date.now(),
        });
        await postWithRetry('/posts', textPayload, stablePublishIdempotencyKey);
        await clearPendingPublishJob();
      } else if (contentType === 'article') {
        const text = `# ${title.trim()}\n\n${articleBody.trim()}`;
        const articlePayload = {
          text,
          ...(mediaUrls.length > 0 ? { images: mediaUrls } : {}),
          visibility: 'public',
        };
        await savePendingPublishJob({
          path: '/posts',
          payload: articlePayload,
          idempotencyKey: stablePublishIdempotencyKey,
          createdAt: Date.now(),
        });
        await postWithRetry('/posts', articlePayload, stablePublishIdempotencyKey);
        await clearPendingPublishJob();
      } else if (contentType === 'photo') {
        const photoPayload = {
          text: description.trim() || undefined,
          images: mediaUrls,
          visibility: 'public',
        };
        await savePendingPublishJob({
          path: '/posts',
          payload: photoPayload,
          idempotencyKey: stablePublishIdempotencyKey,
          createdAt: Date.now(),
        });
        await postWithRetry('/posts', photoPayload, stablePublishIdempotencyKey);
        await clearPendingPublishJob();
      }

      setUploadProgressSafe(100);
      setUploadStatusSafe('success');

      const publishedLabel =
        contentType === 'text' ? 'publication'
          : contentType === 'article' ? 'article'
            : contentType === 'photo' ? 'photo'
              : 'vidéo';
      const successBody = `Votre ${publishedLabel} a été publié(e) avec succès`;
      const goHomeAfterPublish = () => {
        void clearPendingUploadDraft();
        void clearPendingMultipartSession();
        void clearActiveVideoUploadLock();
        resetSelection();
        router.replace('/(tabs)');
      };
      // Sur le web, Alert.alert à boutons n’appelle souvent pas onPress → l’écran reste bloqué sur Créer.
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(`Publié !\n\n${successBody}`);
        }
        goHomeAfterPublish();
      } else {
        Alert.alert('Publié !', successBody, [{ text: 'OK', onPress: goHomeAfterPublish }]);
      }
    } catch (error: unknown) {
      console.error('Publish error:', error);
      if (isUploadCancelledError(error)) {
        await clearActiveVideoUploadLock();
        Alert.alert('Upload annulé', "L'envoi a été annulé. Vous pouvez reprendre quand vous voulez.");
        return;
      }
      if (isUploadFileMissingError(error)) {
        setUploadStatusSafe('failed');
        Alert.alert(
          'Fichier introuvable',
          'Le fichier vidéo/photo a été déplacé ou supprimé par le système. Sélectionnez-le à nouveau puis republiez.',
        );
        return;
      }
      const base = getAlertMessageForCaughtError(error);
      const ax = isAxiosError(error) ? error : null;
      const status = ax?.response?.status;
      const noResponse = Boolean(ax && !ax.response);
      const netLike = noResponse || /network|failed to connect|socket|aborted/i.test(String(ax?.message || ''));
      const shouldAutoRetryVideo = contentType === 'video' && netLike;
      let msg = base;
      if (status === 401) {
        msg = "Connectez-vous d'abord pour publier une vidéo.";
      } else if (status === 413) {
        msg = 'Vidéo trop lourde. Réduisez la taille/durée puis réessayez.';
      } else if (status === 415 || status === 400) {
        msg = 'Format vidéo non pris en charge. Utilisez MP4 (H.264) puis réessayez.';
      } else if (status && status >= 500) {
        msg = "Serveur temporairement indisponible. Réessayez dans un instant.";
      }
      if (netLike) {
        const origin = getBackendOrigin();
        const isDevNative = Platform.OS !== 'web' && typeof __DEV__ !== 'undefined' && __DEV__;
        const checklist = Platform.OS === 'web'
          ? `\n\nÀ vérifier :\n• L'API tourne sur ${origin}\n• Pas de blocage CORS / firewall\n• Onglet réseau (F12) pour voir l'URL exacte qui échoue`
          : isDevNative
            ? `\n\nÀ vérifier (dev mobile) :\n• Le téléphone est sur le MÊME WiFi que ton PC\n• L'API tourne (PC : npm run dev → \"Server running on 0.0.0.0:3000\")\n• Le firewall Windows autorise le port 3000\n• URL tentée : ${origin}\n• Astuce : ajoute EXPO_PUBLIC_DEV_PC_LAN_HOST=<IP-de-ton-PC> dans frontend/.env si la détection auto échoue`
            : '';

        if (contentType === 'video') {
          msg = isDevNative
            ? `Impossible d'envoyer la vidéo : connexion au serveur interrompue.\n\n${base}${checklist}`
            : "Connexion instable. Votre vidéo n'est pas perdue, nous allons réessayer automatiquement.";
        } else if (selectedMedia.length > 0) {
          msg = isDevNative
            ? `Impossible d'envoyer le média.\n\n${base}${checklist}`
            : "Connexion instable. Nous allons réessayer automatiquement.";
        } else {
          msg = isDevNative
            ? `Impossible d'envoyer la publication.\n\n${base}${checklist}`
            : "Connexion instable. Nous allons réessayer automatiquement.";
        }
      }
      if (shouldAutoRetryVideo) {
        setPendingUploadAvailable(true);
        setUploadStatusSafe('retrying');
        const nextAttempt = Math.min(VIDEO_AUTO_RETRY_MAX_ATTEMPTS, autoRetryAttemptRef.current + 1);
        autoRetryAttemptRef.current = nextAttempt;
        setUploadRetryAttemptSafe(nextAttempt);
        const retryDelayMs = Math.min(
          VIDEO_AUTO_RETRY_MAX_DELAY_MS,
          Math.max(2500, computeRetryDelayMs(nextAttempt + 1)),
        );
        if (autoRetryTimeoutRef.current) {
          clearTimeout(autoRetryTimeoutRef.current);
          autoRetryTimeoutRef.current = null;
        }
        if (nextAttempt < VIDEO_AUTO_RETRY_MAX_ATTEMPTS) {
          autoRetryTimeoutRef.current = setTimeout(() => {
            if (uploadingRef.current || publishInFlightRef.current || cancelUploadRef.current || !isMountedRef.current) {
              return;
            }
            void handlePublish();
          }, retryDelayMs);
          Alert.alert(
            'Upload sécurisé',
            "Connexion instable détectée. L'envoi continue automatiquement en arrière-plan. Inutile de relancer la vidéo.",
          );
        } else {
          setUploadStatusSafe('failed');
          Alert.alert(
            'Upload en pause',
            `${msg}\n\nNous avons déjà tenté plusieurs reprises automatiques. Vérifiez le réseau puis appuyez sur Publier pour relancer.`,
          );
        }
      } else {
        setUploadStatusSafe('failed');
        Alert.alert(
          "Échec de l'envoi",
          msg,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Réessayer',
              onPress: () => {
                if (!uploading) {
                  void handlePublish();
                }
              },
            },
          ],
        );
      }
    } finally {
      if (uploadPriorityActive) {
        endUploadNetworkPriority();
      }
      publishInFlightRef.current = false;
      setUploadingSafe(false);
      setUploadProgressSafe(0);
      activeUploadAbortRef.current = null;
      setUploadStatusSafe((prev) => (prev === 'failed' || prev === 'cancelled' || prev === 'retrying' ? prev : 'idle'));
      setUploadRetryAttemptSafe(0);
    }
  };

  useEffect(() => {
    if (uploadStatus !== 'success') return;
    autoRetryAttemptRef.current = 0;
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
  }, [uploadStatus]);

  const resetSelection = () => {
    setStep('select');
    setSelectedMedia([]);
    setContentType('video');
    setTitle('');
    setDescription('');
    setArticleBody('');
    setHashtags('');
    setEditorResult(null);
    setSoundSeed(null);
    soundSeedKeyConsumed.current = null;
    setRemixSeed(null);
    remixSeedKeyConsumed.current = null;
    setCategory('');
    setLanguage('fr');
    setMusicTitle('');
    setVisibility('public');
    setHideLikes(false);
    setCommentsDisabled(false);
    setCommentVisibility('everyone');
    setScheduledAt('');
    setCustomThumbnail(null);
    setPublishIdempotencyKey('');
    setPendingUploadAvailable(false);
    autoRetryAttemptRef.current = 0;
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
    autoResumeAttemptedRef.current = false;
    void clearPendingUploadDraft();
    void clearPendingMultipartSession();
    void clearActiveVideoUploadLock();
  };

  const pickCustomThumbnail = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Accès à la galerie nécessaire");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'android',
        aspect: [9, 16],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setCustomThumbnail({ uri: result.assets[0].uri });
      }
    } catch (e) {
      console.warn('thumbnail picker', e);
    }
  };

  const goBackFromDetails = () => {
    if (contentType === 'video' && selectedMedia.length > 0 && selectedMedia[0].type === 'video') {
      setStep('edit');
      return;
    }
    resetSelection();
  };

  const handleResumePendingUploadDraft = useCallback(async () => {
    const draft = await readPendingUploadDraft();
    if (!draft) {
      setPendingUploadAvailable(false);
      Alert.alert('Reprise indisponible', 'Aucun brouillon d’upload en attente.');
      return;
    }
    restorePendingUploadDraft(draft);
    setPendingUploadAvailable(true);
    Alert.alert('Brouillon restauré', 'Votre upload en attente a été restauré. Vous pouvez publier maintenant.');
  }, [readPendingUploadDraft, restorePendingUploadDraft]);

  const handleDiscardPendingUploadDraft = useCallback(() => {
    Alert.alert(
      'Supprimer le brouillon ?',
      'Cette action efface la reprise d’upload en attente sur cet appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void clearPendingUploadDraft();
            void clearPendingMultipartSession();
            void clearActiveVideoUploadLock();
            autoResumeAttemptedRef.current = false;
            if (!uploading) {
              resetSelection();
            }
          },
        },
      ],
    );
  }, [clearPendingUploadDraft, clearPendingMultipartSession, clearActiveVideoUploadLock, resetSelection, uploading]);

  if (step === 'edit' && selectedMedia.length > 0 && contentType === 'video') {
    return (
      <VideoEditor
        videoUri={selectedMedia[0].uri}
        initialSpeed={integratedCameraSpeed}
        onDone={(result) => {
          setEditorResult(result);
          setStep('details');
        }}
        onCancel={resetSelection}
      />
    );
  }

  if (step === 'details') {
    const hasMedia = selectedMedia.length > 0;
    const isTextBased = contentType === 'text' || contentType === 'article';
    const canPublish = isTextBased ? (contentType === 'text' ? description.trim() : title.trim() && articleBody.trim()) : (hasMedia && title.trim());

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={goBackFromDetails} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {contentType === 'text' ? 'Publication' : contentType === 'article' ? 'Article' : contentType === 'photo' ? 'Photo' : 'Vidéo'}
          </Text>
          <TouchableOpacity
            style={[styles.publishBtn, (!canPublish || uploading) && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={!canPublish || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.publishBtnText}>Publier</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
          {pendingUploadAvailable ? (
            <View style={styles.pendingDraftBanner}>
              <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pendingDraftTitle}>Upload en attente détecté</Text>
                <Text style={styles.pendingDraftSub}>Reprendre la préparation ou supprimer ce brouillon local.</Text>
              </View>
              <TouchableOpacity style={styles.pendingDraftAction} onPress={() => void handleResumePendingUploadDraft()}>
                <Text style={styles.pendingDraftActionText}>Reprendre</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDiscardPendingUploadDraft} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {soundSeed?.title ? (
            <View style={styles.soundSeedBanner}>
              <Ionicons name="musical-notes" size={20} color={Colors.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.soundSeedLabel}>Son du fil</Text>
                <Text style={styles.soundSeedTitle} numberOfLines={2}>
                  {soundSeed.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSoundSeed(null)} hitSlop={12} accessibilityLabel="Retirer ce son">
                <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}
          {/* Media Preview (for photo/video) */}
          {hasMedia && (
            <View style={styles.previewContainer}>
              {contentType === 'video' ? (
                <SelectedVideoPreview uri={selectedMedia[0].uri} />
              ) : (
                <Image source={{ uri: selectedMedia[0].uri }} style={styles.preview} />
              )}
              {selectedMedia.length > 1 && (
                <View style={styles.multiMediaBadge}>
                  <Text style={styles.multiMediaText}>{selectedMedia.length} photos</Text>
                </View>
              )}
              <TouchableOpacity style={styles.changeMediaBtn} onPress={resetSelection}>
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.changeMediaText}>Changer</Text>
              </TouchableOpacity>
              {contentType === 'video' ? (
                <>
                  <View style={styles.videoIndicator}>
                    <Ionicons name="videocam" size={14} color="#FFF" />
                    <Text style={styles.videoIndicatorText}>Vidéo</Text>
                  </View>
                  {hasMeaningfulEditorEffects(editorResult) ? (
                    <View style={styles.editorBadge}>
                      <Ionicons name="color-wand-outline" size={14} color="#FFF" />
                      <Text style={styles.editorBadgeText}>Effets appliqués</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {contentType !== 'text' && (
              <>
                <Text style={styles.formLabel}>Titre {isTextBased ? '' : '*'}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={contentType === 'article' ? "Titre de l'article..." : "Titre de votre contenu..."}
                  placeholderTextColor={Colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={150}
                />
              </>
            )}

            <Text style={styles.formLabel}>
              {contentType === 'text' ? "Quoi de neuf ?" : contentType === 'article' ? 'Contenu de l\'article' : 'Description'}
            </Text>
            <TextInput
              style={[styles.formInput, contentType === 'text' || contentType === 'article' ? styles.formTextAreaLarge : styles.formTextArea]}
              placeholder={contentType === 'text' ? "Partagez vos pensées..." : contentType === 'article' ? "Rédigez votre article ici..." : "Décrivez votre contenu..."}
              placeholderTextColor={Colors.textMuted}
              value={contentType === 'article' ? articleBody : description}
              onChangeText={contentType === 'article' ? setArticleBody : setDescription}
              multiline
              numberOfLines={contentType === 'text' || contentType === 'article' ? 8 : 3}
              maxLength={contentType === 'article' ? 5000 : 2000}
            />
            {contentType === 'article' && (
              <Text style={styles.charCount}>{articleBody.length}/5000</Text>
            )}

            {/* Option d'ajouter des photos au texte/article */}
            {isTextBased && (
              <TouchableOpacity style={styles.addMediaBtn} onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return;
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, selectionLimit: 5 });
                if (!result.canceled && result.assets.length > 0) {
                  setSelectedMedia(result.assets.map(a => ({
                    uri: a.uri,
                    type: 'image' as const,
                    mimeType: a.mimeType ?? null,
                    fileName: a.fileName ?? null,
                  })));
                }
              }}>
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
                <Text style={styles.addMediaBtnText}>{selectedMedia.length > 0 ? `${selectedMedia.length} photo(s) ajoutée(s)` : 'Ajouter des photos'}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.formLabel}>Hashtags</Text>
            <TextInput
              style={styles.formInput}
              placeholder="#mali #culture #afriwonder"
              placeholderTextColor={Colors.textMuted}
              value={hashtags}
              onChangeText={setHashtags}
            />

            <View style={styles.suggestedTags}>
              {['AfriWonder', 'Mali', 'Afrique', 'Culture', 'Danse', 'Food'].map(tag => (
                <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => setHashtags(prev => prev ? `${prev} #${tag}` : `#${tag}`)}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {contentType === 'video' && (
              <>
                <Text style={styles.formLabel}>Catégorie</Text>
                <TouchableOpacity style={styles.selectField} onPress={() => setPickerOpen('category')}>
                  <Text style={[styles.selectFieldText, !category && styles.selectFieldPlaceholder]} numberOfLines={1}>
                    {category ? labelOf(CATEGORY_OPTIONS, category, category) : 'Choisir une catégorie'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.formLabel}>Musique</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Aucune musique — collez le titre du son"
                  placeholderTextColor={Colors.textMuted}
                  value={musicTitle}
                  onChangeText={setMusicTitle}
                  maxLength={200}
                />

                <Text style={styles.formLabel}>Langue</Text>
                <TouchableOpacity style={styles.selectField} onPress={() => setPickerOpen('language')}>
                  <Text style={styles.selectFieldText} numberOfLines={1}>
                    {labelOf(LANGUAGE_OPTIONS, language, 'Français')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Options de publication</Text>

                <View style={styles.optionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionRowLabel}>Cacher les likes</Text>
                    <Text style={styles.optionRowHint}>Le nombre de likes sera masqué pour les autres.</Text>
                  </View>
                  <SwitchPill value={hideLikes} onValueChange={setHideLikes} />
                </View>

                <View style={styles.optionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionRowLabel}>Désactiver les commentaires</Text>
                    <Text style={styles.optionRowHint}>Personne ne pourra commenter cette vidéo.</Text>
                  </View>
                  <SwitchPill value={commentsDisabled} onValueChange={setCommentsDisabled} />
                </View>

                <Text style={styles.formLabel}>Qui peut commenter</Text>
                <TouchableOpacity
                  style={[styles.selectField, commentsDisabled && { opacity: 0.45 }]}
                  onPress={() => !commentsDisabled && setPickerOpen('commentVisibility')}
                  disabled={commentsDisabled}
                >
                  <Text style={styles.selectFieldText} numberOfLines={1}>
                    {labelOf(COMMENT_VISIBILITY_OPTIONS, commentVisibility, 'Tout le monde')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.formLabel}>Programmer la publication (optionnel)</Text>
                <TouchableOpacity style={styles.selectField} onPress={() => setScheduledPickerOpen(true)}>
                  <View style={styles.scheduleFieldLeft}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                    <Text style={[styles.selectFieldText, !scheduledAt && styles.selectFieldPlaceholder]} numberOfLines={1}>
                      {scheduledAt ? formatScheduledAtForDisplay(scheduledAt) : 'jj/mm/aaaa --:--'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
                <View style={styles.scheduleChips}>
                  <ScheduleChip label="Dans 1 h" onPress={() => setScheduledAt(setRelativeIso(60))} />
                  <ScheduleChip label="Dans 3 h" onPress={() => setScheduledAt(setRelativeIso(180))} />
                  <ScheduleChip label="Demain 9h" onPress={() => setScheduledAt(setTomorrowMorningIso())} />
                  {scheduledAt ? <ScheduleChip label="Effacer" onPress={() => setScheduledAt('')} destructive /> : null}
                </View>

                <Text style={styles.formLabel}>Miniature personnalisée (optionnel)</Text>
                <View style={styles.thumbnailRow}>
                  {customThumbnail?.uri ? (
                    <Image source={{ uri: customThumbnail.uri }} style={styles.thumbnailPreview} />
                  ) : (
                    <View style={[styles.thumbnailPreview, styles.thumbnailPlaceholder]}>
                      <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
                    </View>
                  )}
                  <TouchableOpacity style={styles.thumbnailBtn} onPress={() => void pickCustomThumbnail()}>
                    <Ionicons name={customThumbnail ? 'refresh' : 'cloud-upload-outline'} size={18} color={Colors.text} />
                    <Text style={styles.thumbnailBtnText}>
                      {customThumbnail ? 'Changer la miniature' : 'Choisir un fichier'}
                    </Text>
                  </TouchableOpacity>
                  {customThumbnail ? (
                    <TouchableOpacity onPress={() => setCustomThumbnail(null)} style={styles.thumbnailRemove} hitSlop={10}>
                      <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Visibilité</Text>
                <View style={styles.visibilityList}>
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const selected = visibility === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.visibilityRow, selected && styles.visibilityRowActive]}
                        onPress={() => setVisibility(opt.value)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={opt.icon} size={20} color={selected ? Colors.primary : Colors.textSecondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.visibilityLabel, selected && { color: Colors.primary }]}>{opt.label}</Text>
                          <Text style={styles.visibilitySub}>{opt.sub}</Text>
                        </View>
                        {selected ? <Ionicons name="checkmark" size={20} color={Colors.primary} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {uploading ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressPercentInline}>
                {clampPublishUploadPercent(uploadProgress)}%
              </Text>
              <Text style={styles.progressText}>
                {getPublishUploadStatusLabel({
                  percent: uploadProgress,
                  status: uploadStatus,
                  retryAttempt: uploadRetryAttempt,
                  isVideo: contentType === 'video',
                })}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <UploadProgressOverlay
          visible={uploading}
          percent={uploadProgress}
          status={uploadStatus}
          retryAttempt={uploadRetryAttempt}
          isVideo={contentType === 'video'}
          onCancel={handleCancelUpload}
        />

        <Modal
          transparent
          visible={pickerOpen !== null}
          animationType="fade"
          onRequestClose={() => setPickerOpen(null)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(null)}>
            <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerTitle}>
                {pickerOpen === 'category'
                  ? 'Catégorie'
                  : pickerOpen === 'language'
                    ? 'Langue'
                    : 'Qui peut commenter'}
              </Text>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {(pickerOpen === 'category'
                  ? CATEGORY_OPTIONS
                  : pickerOpen === 'language'
                    ? LANGUAGE_OPTIONS
                    : COMMENT_VISIBILITY_OPTIONS
                ).map((opt) => {
                  const current =
                    pickerOpen === 'category' ? category : pickerOpen === 'language' ? language : commentVisibility;
                  const selected = current === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.pickerItem}
                      onPress={() => {
                        if (pickerOpen === 'category') setCategory(opt.value);
                        else if (pickerOpen === 'language') setLanguage(opt.value);
                        else setCommentVisibility(opt.value as 'everyone' | 'friends' | 'no_one');
                        setPickerOpen(null);
                      }}
                    >
                      <Text style={[styles.pickerItemText, selected && styles.pickerItemTextActive]}>
                        {opt.label}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={20} color={Colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerOpen(null)}>
                <Text style={styles.pickerCancelText}>Fermer</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <DateTimePickerSheet
          visible={scheduledPickerOpen}
          value={scheduledAt}
          onClose={() => setScheduledPickerOpen(false)}
          onConfirm={(v) => {
            setScheduledAt(v);
            setScheduledPickerOpen(false);
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  // Selection screen
  return (
    <>
      <Modal visible={countdownTick != null && countdownTick > 0} transparent animationType="fade">
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNum}>{countdownTick}</Text>
          <Text style={styles.countdownHint}>Préparez-vous…</Text>
        </View>
      </Modal>
      <IntegratedCameraRecorder
        visible={integratedCameraOpen}
        onClose={() => setIntegratedCameraOpen(false)}
        onCaptured={handleIntegratedCameraCaptured}
        initialDurationCap={integratedCameraDurationCap}
        initialSpeed={integratedCameraSpeed}
        initialEffect={integratedCameraEffect}
      />
      <WebVideoRecorder
        visible={webRecorderOpen}
        onClose={() => setWebRecorderOpen(false)}
        onCaptured={handleWebRecorderCaptured}
        maxDurationSec={integratedCameraDurationCap}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer</Text>
      </View>

      <ScrollView
        style={styles.selectionScroll}
        contentContainerStyle={styles.selectionScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {pendingUploadAvailable ? (
          <View style={styles.pendingDraftBanner}>
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pendingDraftTitle}>Upload interrompu détecté</Text>
              <Text style={styles.pendingDraftSub}>Touchez « Reprendre » pour restaurer votre publication.</Text>
            </View>
            <TouchableOpacity style={styles.pendingDraftAction} onPress={() => void handleResumePendingUploadDraft()}>
              <Text style={styles.pendingDraftActionText}>Reprendre</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDiscardPendingUploadDraft} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {soundSeed?.title ? (
          <View style={styles.soundSeedBanner}>
            <Ionicons name="musical-notes" size={20} color={Colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.soundSeedLabel}>Publier avec ce son</Text>
              <Text style={styles.soundSeedTitle} numberOfLines={2}>
                {soundSeed.title}
              </Text>
              <Text style={styles.soundSeedHint}>Enregistrez ou choisissez une vidéo — le titre audio sera associé à votre publication.</Text>
            </View>
            <TouchableOpacity onPress={() => setSoundSeed(null)} hitSlop={12} accessibilityLabel="Retirer ce son">
              <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {remixSeed ? (
          <View style={styles.soundSeedBanner}>
            <Ionicons name="git-branch-outline" size={20} color={Colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.soundSeedLabel}>{`Mode ${remixActionLabel(remixSeed.kind)}`}</Text>
              <Text style={styles.soundSeedTitle} numberOfLines={2}>
                {remixSeed.sourceCreatorUsername
                  ? `Vous réagissez à @${remixSeed.sourceCreatorUsername}`
                  : 'Vous réagissez à une vidéo AfriWonder'}
                {remixSeed.sourceTitle ? ` — ${remixSeed.sourceTitle}` : ''}
              </Text>
              <Text style={styles.soundSeedHint}>{remixActionHint(remixSeed.kind)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setRemixSeed(null);
                remixSeedKeyConsumed.current = null;
              }}
              hitSlop={12}
              accessibilityLabel="Annuler le mode remix"
            >
              <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.goLiveHero}
          onPress={() => {
            if (!requireAuth('lancer un live')) return;
            const uname = String(user?.username || 'AfriWonder').replace(/^@+/, '');
            const prefilled_title = `Live ${uname} · ${new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`.slice(0, 80);
            router.push({
              pathname: '/live/stream',
              params: { prefilled_title, prefilled_category: 'general' },
            } as never);
          }}
          accessibilityLabel="Go Live"
        >
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.goLiveHeroGrad}>
            <Ionicons name="radio" size={32} color="#FFF" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.goLiveHeroTitle}>Go Live</Text>
              <Text style={styles.goLiveHeroSub}>
                Parcours rapide CDC : onglet Créer → Go Live → « Démarrer tout de suite » (titre prérempli) = 3 actions + décompte 3-2-1.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.liveHubRow}
          onPress={() => router.push('/live' as never)}
          accessibilityLabel="Hub lives et replays"
        >
          <Ionicons name="albums-outline" size={22} color={Colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.liveHubTitle}>Lives et replays</Text>
            <Text style={styles.liveHubSub}>Découvrir, rejoindre un direct ou un replay.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.countdownBlock}>
          <Text style={styles.countdownLabel}>Minuterie avant enregistrement</Text>
          <View style={styles.countdownChips}>
            {([0, 3, 5, 10] as const).map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.countdownChip, cameraCountdownSec === sec && styles.countdownChipActive]}
                onPress={() => setCameraCountdownSec(sec)}
                accessibilityLabel={sec === 0 ? 'Pas de compte à rebours' : `Compte à rebours ${sec} secondes`}
              >
                <Text style={[styles.countdownChipText, cameraCountdownSec === sec && styles.countdownChipTextActive]}>
                  {sec === 0 ? 'Non' : `${sec}s`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.optionsGrid}>
          <TouchableOpacity style={styles.optionCard} onPress={handleRecordVideo}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="videocam" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Enregistrer</Text>
            <Text style={styles.optionSubtitle}>Capturer une vidéo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handlePickVideo}>
            <View style={[styles.optionIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="film" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Vidéo</Text>
            <Text style={styles.optionSubtitle}>Courte ou longue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handlePickImage}>
            <View style={[styles.optionIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="images" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Photo</Text>
            <Text style={styles.optionSubtitle}>Plusieurs images</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleTextPost}>
            <View style={[styles.optionIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="chatbubble-ellipses" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Texte</Text>
            <Text style={styles.optionSubtitle}>Publication rapide</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleArticlePost}>
            <View style={[styles.optionIcon, { backgroundColor: '#00BCD4' }]}>
              <Ionicons name="document-text" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Article</Text>
            <Text style={styles.optionSubtitle}>Rédiger un article</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Conseils</Text>
          {[
            { icon: 'bulb', text: 'Utilisez une bonne lumière naturelle' },
            { icon: 'film', text: 'Les vidéos longues sont maintenant supportées' },
            { icon: 'musical-notes', text: 'Ajoutez de la musique tendance' },
            { icon: 'document-text', text: 'Partagez vos idées en articles' },
          ].map((tip, i) => (
            <View key={i} style={styles.tipItem}>
              <Ionicons name={tip.icon as any} size={20} color={Colors.accent} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  title: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },
  publishBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: BorderRadius.full, minWidth: 80, alignItems: 'center',
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  selectionScroll: { flex: 1 },
  selectionScrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  pendingDraftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
  },
  pendingDraftTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
  pendingDraftSub: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  pendingDraftAction: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingDraftActionText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: '700' },
  soundSeedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  soundSeedLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase' },
  soundSeedTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginTop: 2 },
  soundSeedHint: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 6, lineHeight: 16 },
  countdownBlock: { marginBottom: Spacing.lg },
  countdownLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700', marginBottom: Spacing.sm, textTransform: 'uppercase' },
  countdownChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  countdownChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countdownChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.1)' },
  countdownChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  countdownChipTextActive: { color: Colors.primary },
  countdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNum: { fontSize: 120, fontWeight: '800', color: '#FFF' },
  countdownHint: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.md, marginTop: Spacing.md },
  optionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    gap: Spacing.md, marginBottom: Spacing.xl,
  },
  optionCard: {
    width: '30%', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  optionIcon: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  optionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: 4 },
  optionSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center' },
  tipsContainer: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  tipsTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.lg },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  tipText: { color: Colors.textSecondary, fontSize: FontSizes.md, flex: 1 },
  // Details step styles
  detailsContent: { flex: 1, padding: Spacing.lg },
  previewContainer: { width: '100%', height: 220, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl, position: 'relative' },
  preview: { width: '100%', height: '100%', backgroundColor: Colors.surface },
  changeMediaBtn: {
    position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full, gap: 4,
  },
  changeMediaText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '600' },
  videoIndicator: {
    position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, gap: 4,
  },
  videoIndicatorText: { color: '#FFF', fontSize: FontSizes.xs },
  editorBadge: {
    position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,107,0,0.85)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, gap: 4,
  },
  editorBadgeText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '600' },
  formContainer: { gap: Spacing.xs },
  formLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.md },
  formInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border,
  },
  formTextArea: { height: 80, textAlignVertical: 'top' },
  formTextAreaLarge: { height: 200, textAlignVertical: 'top' },
  charCount: { color: Colors.textMuted, fontSize: FontSizes.xs, textAlign: 'right', marginTop: 2 },
  multiMediaBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  multiMediaText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '600' },
  addMediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', marginTop: Spacing.sm },
  addMediaBtnText: { color: Colors.primary, fontSize: FontSizes.sm },
  suggestedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  tagChip: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary,
  },
  tagChipText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '500' },
  progressContainer: { marginTop: Spacing.xl, alignItems: 'center', paddingBottom: Spacing.md },
  progressPercentInline: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  progressBar: { width: '100%', height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  uploadCancelBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2C2C34',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadCancelBtnText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: '700' },
  liveHubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liveHubTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  liveHubSub: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 4, lineHeight: 16 },
  goLiveHero: { marginBottom: Spacing.lg, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  goLiveHeroGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  goLiveHeroTitle: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: '900' },
  goLiveHeroSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, marginTop: 4, lineHeight: 18 },

  /* Champs de sélection (catégorie / langue / qui peut commenter) */
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectFieldText: { color: Colors.text, fontSize: FontSizes.md, flex: 1, marginRight: 6 },
  selectFieldPlaceholder: { color: Colors.textMuted },
  scheduleFieldLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },

  /* Toggles "Cacher les likes" / "Désactiver les commentaires" */
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionRowLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  optionRowHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },

  /* Programmer la publication */
  scheduleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  chipDestructive: { borderColor: '#FF2D55' },
  chipTextDestructive: { color: '#FF2D55' },

  /* Miniature personnalisée */
  thumbnailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  thumbnailPreview: { width: 56, height: 90, borderRadius: 8, backgroundColor: Colors.surface },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  thumbnailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnailBtnText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  thumbnailRemove: { padding: 4 },

  /* Visibilité (Public / Wonder / Privé) */
  visibilityList: { gap: 8, marginTop: 4 },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  visibilityRowActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.08)' },
  visibilityLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  visibilitySub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },

  /* Modal picker */
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: 24 },
  pickerHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  pickerTitle: { textAlign: 'center', fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, paddingVertical: 10 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pickerItemText: { color: Colors.text, fontSize: FontSizes.md },
  pickerItemTextActive: { color: Colors.primary, fontWeight: '700' },
  pickerCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pickerCancelText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
});
