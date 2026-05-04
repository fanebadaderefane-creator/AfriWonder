import React, { useState, useEffect, useRef, useCallback, createElement } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Image, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
  Switch, Pressable,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../../src/store/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { isAxiosError } from 'axios';
import apiClient from '../../src/api/client';
import { tryRefreshAccessToken } from '../../src/api/tokenRefresh';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { getBackendOrigin } from '../../src/config/backendBase';
import { cacheDirectory, copyAsync, uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
import VideoEditor, { type VideoEditorResult } from '../../src/components/VideoEditor';
import IntegratedCameraRecorder, {
  type CameraDurationPreset,
  type CameraSpeedPreset,
  type IntegratedCameraResult,
  type CameraEffectId,
} from '../../src/components/create/IntegratedCameraRecorder';
import WebVideoRecorder from '../../src/components/create/WebVideoRecorder';
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
  const dir = cacheDirectory;
  if (!dir) return u;
  const safeExt = extHint.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
  const dest = `${dir}afw-create-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  try {
    await copyAsync({ from: u, to: dest });
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

type PresignUploadResponse = {
  uploadUrl: string;
  file_url: string;
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

  useFocusEffect(
    useCallback(() => {
      return () => {
        soundSeedKeyConsumed.current = null;
      };
    }, []),
  );

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

  const requireAuth = (action: string) => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', `Veuillez vous connecter pour ${action}`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
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

  const uploadMultipartWithRetry = async (
    path: '/upload/video' | '/upload/image' | '/upload/audio',
    buildForm: () => Promise<FormData>,
    timeoutMs: number,
  ) => {
    const attempts = 2;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const form = await buildForm();
        return await apiClient.post(path, form, {
          timeout: timeoutMs,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
      } catch (error: unknown) {
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAY_MS * attempt));
      }
    }
    throw lastError;
  };

  const requestVideoPresign = async (filename: string, contentType: string): Promise<PresignUploadResponse> => {
    const res = await apiClient.post('/upload/presign', {
      kind: 'video',
      filename,
      contentType,
    }, { timeout: STANDARD_UPLOAD_TIMEOUT_MS });
    const d = res.data?.data;
    const uploadUrl = String(d?.uploadUrl || '').trim();
    const fileUrl = String(d?.file_url || '').trim();
    if (!uploadUrl || !fileUrl) {
      throw new Error('Réponse presign invalide');
    }
    return { uploadUrl, file_url: fileUrl };
  };

  const tryDirectR2VideoUpload = async (media: SelectedMedia, index: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;
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
      const putRes = await uploadAsync(presign.uploadUrl, fileUri, {
        httpMethod: 'PUT',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': contentType,
        },
      });
      if (putRes.status < 200 || putRes.status >= 300) {
        throw new Error(`PUT direct R2 refusé (${putRes.status})`);
      }
      return presign.file_url;
    } catch (e) {
      console.warn('Direct R2 video upload failed, fallback to backend /upload/video', e);
      return null;
    }
  };

  const postWithRetry = async <T = any>(path: string, body: unknown) => {
    const attempts = 2;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const res = await apiClient.post(path, body, { timeout: 120000 });
        return res as T;
      } catch (error: unknown) {
        lastError = error;
        if (!isRetriableNetworkError(error) || attempt >= attempts) break;
        await tryRefreshAccessToken();
        await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAY_MS * attempt));
      }
    }
    throw lastError;
  };

  const handlePublish = async () => {
    if (!requireAuth('publier')) return;

    if (contentType === 'text' || contentType === 'article') {
      if (!description.trim() && contentType === 'text') { Alert.alert('Contenu requis', 'Écrivez quelque chose'); return; }
      if (!title.trim() && contentType === 'article') { Alert.alert('Titre requis', 'Ajoutez un titre à votre article'); return; }
    } else {
      if (selectedMedia.length === 0) return;
      if (!title.trim()) { Alert.alert('Titre requis', 'Ajoutez un titre'); return; }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      /** Jeton frais avant chaîne upload + POST (complète le refresh proportionnel au timeout dans `apiClient`). */
      await tryRefreshAccessToken();

      const hashtagArray = hashtags.split(/[,#\s]+/).filter(h => h.trim()).map(h => h.trim());
      let mediaUrls: string[] = [];
      let videoUrl: string | undefined;
      let videoThumb: string | undefined;

      // Upload médias → `/api/upload/image` ou `/api/upload/video` (Express)
      if (selectedMedia.length > 0) {
        setUploadProgress(10);
        for (let i = 0; i < selectedMedia.length; i++) {
          const media = selectedMedia[i];
          if (media.type === 'video') {
            const directR2Url = await tryDirectR2VideoUpload(media, i);
            if (directR2Url) {
              videoUrl = directR2Url;
            } else {
              const uploadRes = await uploadMultipartWithRetry('/upload/video', async () => {
                const formData = new FormData();
                await appendUploadFile(formData, media, i);
                return formData;
              }, MOBILE_MEDIA_UPLOAD_TIMEOUT_MS);
              const d = uploadRes.data?.data;
              videoUrl = d?.file_url || d?.url || '';
              videoThumb = d?.thumbnail_url || undefined;
            }
          } else {
            const uploadRes = await uploadMultipartWithRetry('/upload/image', async () => {
              const formData = new FormData();
              await appendUploadFile(formData, media, i);
              return formData;
            }, STANDARD_UPLOAD_TIMEOUT_MS);
            const d = uploadRes.data?.data;
            const fileUrl = d?.file_url || d?.url || '';
            mediaUrls.push(fileUrl);
          }

          setUploadProgress(10 + Math.round((i + 1) / selectedMedia.length * 40));
        }
      }

      setUploadProgress(60);

      let voiceOverRemoteUrl: string | null = null;
      if (contentType === 'video' && editorResult?.voiceOverUri) {
        const voiceUri = String(editorResult.voiceOverUri || '').trim();
        if (!voiceUri) throw new Error('Piste voix off invalide');
        setUploadProgress(55);
        const audioRes = await uploadMultipartWithRetry('/upload/audio', async () => {
          const audioForm = new FormData();
          await appendUploadVoice(audioForm, voiceUri, 0);
          return audioForm;
        }, STANDARD_UPLOAD_TIMEOUT_MS);
        voiceOverRemoteUrl = audioRes.data?.data?.file_url || null;
        if (!voiceOverRemoteUrl) {
          throw new Error('URL voix off manquante après upload');
        }
        setUploadProgress(59);
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
        await postWithRetry('/videos', {
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
        });
      } else if (contentType === 'text') {
        await postWithRetry('/posts', {
          text: description.trim(),
          ...(mediaUrls.length > 0 ? { images: mediaUrls } : {}),
          visibility: 'public',
        });
      } else if (contentType === 'article') {
        const text = `# ${title.trim()}\n\n${articleBody.trim()}`;
        await postWithRetry('/posts', {
          text,
          ...(mediaUrls.length > 0 ? { images: mediaUrls } : {}),
          visibility: 'public',
        });
      } else if (contentType === 'photo') {
        await postWithRetry('/posts', {
          text: description.trim() || undefined,
          images: mediaUrls,
          visibility: 'public',
        });
      }

      setUploadProgress(100);

      const publishedLabel =
        contentType === 'text' ? 'publication'
          : contentType === 'article' ? 'article'
            : contentType === 'photo' ? 'photo'
              : 'vidéo';
      const successBody = `Votre ${publishedLabel} a été publié(e) avec succès`;
      const goHomeAfterPublish = () => {
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
      const base = getAlertMessageForCaughtError(error);
      const ax = isAxiosError(error) ? error : null;
      const noResponse = Boolean(ax && !ax.response);
      const netLike = noResponse || /network|failed to connect|socket|aborted/i.test(String(ax?.message || ''));
      let msg = base;
      if (netLike) {
        const origin = getBackendOrigin();
        const checklist = Platform.OS === 'web'
          ? `\n\nÀ vérifier :\n• L'API tourne sur ${origin}\n• Pas de blocage CORS / firewall\n• Onglet réseau (F12) pour voir l'URL exacte qui échoue`
          : `\n\nÀ vérifier (dev mobile) :\n• Le téléphone est sur le MÊME WiFi que ton PC\n• L'API tourne (PC : npm run dev → \"Server running on 0.0.0.0:3000\")\n• Le firewall Windows autorise le port 3000\n• URL tentée : ${origin}\n• Astuce : ajoute EXPO_PUBLIC_DEV_PC_LAN_HOST=<IP-de-ton-PC> dans frontend/.env si la détection auto échoue`;

        if (contentType === 'video') {
          msg = `Impossible d'envoyer la vidéo : connexion au serveur interrompue.\n\n${base}${checklist}`;
        } else if (selectedMedia.length > 0) {
          msg = `Impossible d'envoyer le média.\n\n${base}${checklist}`;
        } else {
          msg = `Impossible d'envoyer la publication.\n\n${base}${checklist}`;
        }
      }
      Alert.alert('Erreur', msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

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

          {uploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {uploadProgress < 30 ? 'Upload en cours...' : uploadProgress < 70 ? 'Traitement...' : 'Finalisation...'}
              </Text>
            </View>
          )}
        </ScrollView>

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
  progressContainer: { marginTop: Spacing.xl, alignItems: 'center' },
  progressBar: { width: '100%', height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.sm },
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
