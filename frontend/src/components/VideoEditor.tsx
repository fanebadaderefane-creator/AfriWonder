import React, { useState, useRef, useEffect, useCallback, createElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  PanResponder,
  Animated,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIDEO_H = SCREEN_H * 0.55;
const MIN_TRIM_GAP = 5;

function hapticLight() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export type StickerCategory = 'tout' | 'nature' | 'joie' | 'musique' | 'urban' | 'patrimoine';

export const STICKER_TABS: { key: StickerCategory; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'nature', label: 'Nature' },
  { key: 'joie', label: 'Joie' },
  { key: 'musique', label: 'Musique' },
  { key: 'urban', label: 'Urban' },
  { key: 'patrimoine', label: 'Patrimoine' },
];

/** Stickers & symboles — filtrables par onglet (sans drapeaux : unité culturelle). */
export const AFRICAN_STICKERS: { id: string; emoji: string; label: string; cat: Exclude<StickerCategory, 'tout'> }[] = [
  { id: 's1', emoji: '🦁', label: 'Lion', cat: 'nature' },
  { id: 's2', emoji: '🐘', label: 'Éléphant', cat: 'nature' },
  { id: 's3', emoji: '🌍', label: 'Afrique', cat: 'nature' },
  { id: 's4', emoji: '🌴', label: 'Palmier', cat: 'nature' },
  { id: 's5', emoji: '☀️', label: 'Soleil', cat: 'nature' },
  { id: 's6', emoji: '🌺', label: 'Fleur', cat: 'nature' },
  { id: 's7', emoji: '🦅', label: 'Aigle', cat: 'nature' },
  { id: 's8', emoji: '🌙', label: 'Lune', cat: 'nature' },
  { id: 's9', emoji: '⛰️', label: 'Montagne', cat: 'nature' },
  { id: 's10', emoji: '🌊', label: 'Océan', cat: 'nature' },
  { id: 's11', emoji: '🥁', label: 'Djembe', cat: 'musique' },
  { id: 's12', emoji: '🎵', label: 'Note', cat: 'musique' },
  { id: 's13', emoji: '🎤', label: 'Micro', cat: 'musique' },
  { id: 's14', emoji: '🎧', label: 'Casque', cat: 'musique' },
  { id: 's15', emoji: '🎸', label: 'Guitare', cat: 'musique' },
  { id: 's16', emoji: '🎹', label: 'Piano', cat: 'musique' },
  { id: 's17', emoji: '🎺', label: 'Trompette', cat: 'musique' },
  { id: 's18', emoji: '🪘', label: 'Percu', cat: 'musique' },
  { id: 's19', emoji: '💃', label: 'Danse', cat: 'joie' },
  { id: 's20', emoji: '🕺', label: 'Danseur', cat: 'joie' },
  { id: 's21', emoji: '🎉', label: 'Fête', cat: 'joie' },
  { id: 's22', emoji: '🎊', label: 'Confetti', cat: 'joie' },
  { id: 's23', emoji: '❤️', label: 'Cœur', cat: 'joie' },
  { id: 's24', emoji: '🙌', label: 'Mains', cat: 'joie' },
  { id: 's25', emoji: '👏', label: 'Bravo', cat: 'joie' },
  { id: 's26', emoji: '🤩', label: 'Wow', cat: 'joie' },
  { id: 's27', emoji: '😂', label: 'Rire', cat: 'joie' },
  { id: 's28', emoji: '✨', label: 'Éclat', cat: 'joie' },
  { id: 's29', emoji: '🔥', label: 'Feu', cat: 'urban' },
  { id: 's30', emoji: '👑', label: 'Roi', cat: 'urban' },
  { id: 's31', emoji: '💎', label: 'Diamant', cat: 'urban' },
  { id: 's32', emoji: '🏆', label: 'Trophée', cat: 'urban' },
  { id: 's33', emoji: '💪', label: 'Force', cat: 'urban' },
  { id: 's34', emoji: '⚡', label: 'Énergie', cat: 'urban' },
  { id: 's35', emoji: '🎬', label: 'Ciné', cat: 'urban' },
  { id: 's36', emoji: '📸', label: 'Photo', cat: 'urban' },
  { id: 's37', emoji: '⭐', label: 'Étoile', cat: 'urban' },
  { id: 's38', emoji: '🎭', label: 'Masque', cat: 'joie' },
  { id: 's39', emoji: '🍲', label: 'Plat', cat: 'joie' },
  { id: 's40', emoji: '🧡', label: 'Orange', cat: 'joie' },
  { id: 's41', emoji: '🧵', label: 'Kente', cat: 'patrimoine' },
  { id: 's42', emoji: '🎨', label: 'Bogolan', cat: 'patrimoine' },
  { id: 's43', emoji: '🏺', label: 'Terre cuite', cat: 'patrimoine' },
  { id: 's44', emoji: '📿', label: 'Perles', cat: 'patrimoine' },
];

const QUICK_EMOJIS = ['😂', '❤️', '🔥', '👏', '🙌', '✨', '💯', '🎉', '👀', '🤍', '🙏', '💃'];

const QUICK_TEXT_SNIPPETS = ['#AfriWonder', 'Merci 🙏', 'Téranga', '100% Afrique', 'On avance'];

const VIDEO_FILTERS = [
  { id: 'none', label: 'Original', overlay: 'transparent' },
  { id: 'afrique_chaud', label: 'Africain chaud', overlay: 'rgba(255,120,40,0.2)' },
  { id: 'sahel', label: 'Sahel', overlay: 'rgba(255,165,0,0.15)' },
  { id: 'savane', label: 'Savane', overlay: 'rgba(200,150,50,0.2)' },
  { id: 'terre', label: 'Terre', overlay: 'rgba(160,82,45,0.18)' },
  { id: 'lagune', label: 'Lagune', overlay: 'rgba(0,180,170,0.14)' },
  { id: 'ocean', label: 'Océan', overlay: 'rgba(0,100,200,0.15)' },
  { id: 'jungle', label: 'Jungle', overlay: 'rgba(0,150,50,0.15)' },
  { id: 'desert', label: 'Désert', overlay: 'rgba(210,180,100,0.2)' },
  { id: 'nuit', label: 'Nuit', overlay: 'rgba(20,0,80,0.25)' },
  { id: 'vintage', label: 'Vintage', overlay: 'rgba(180,140,80,0.2)' },
  { id: 'noir', label: 'N&B', overlay: 'rgba(0,0,0,0)' },
  { id: 'rose', label: 'Rose', overlay: 'rgba(255,80,120,0.12)' },
  { id: 'or', label: 'Or', overlay: 'rgba(255,200,0,0.15)' },
  { id: 'froid', label: 'Froid', overlay: 'rgba(100,150,255,0.15)' },
];

export const MUSIC_TRACKS = [
  { id: 'm0', title: 'Aucune musique', artist: '', genre: '' },
  { id: 'm1', title: 'Afrobeats Vibe', artist: 'AfriWonder Beats', genre: 'Afrobeats' },
  { id: 'm2', title: 'Coupé-Décalé Fire', artist: 'DJ Abidjan', genre: 'Coupé-décalé' },
  { id: 'm3', title: 'Mbalax Rhythm', artist: 'Dakar Sounds', genre: 'Mbalax' },
  { id: 'm4', title: 'Bamako Flow', artist: 'Mali Music', genre: 'Hip-hop' },
  { id: 'm5', title: 'Gnawa Trance', artist: 'Essaouira Vibes', genre: 'Gnawa' },
  { id: 'm6', title: 'Amapiano Beat', artist: 'Johannesburg Sound', genre: 'Amapiano' },
  { id: 'm7', title: 'Highlife Classic', artist: 'Accra Gold', genre: 'Highlife' },
  { id: 'm8', title: 'Raï moderne', artist: 'Oran Mix', genre: 'Raï' },
  { id: 'm9', title: 'Afro Pop Hit', artist: 'Lagos Star', genre: 'Afro Pop' },
  { id: 'm10', title: 'Kizomba Love', artist: 'Luanda Nights', genre: 'Kizomba' },
  { id: 'm11', title: 'Soukous Groove', artist: 'Kinshasa Express', genre: 'Soukous' },
  { id: 'm12', title: 'Bongo Flava', artist: 'Dar es Salaam', genre: 'Bongo Flava' },
  { id: 'm13', title: 'Ethio Jazz', artist: 'Addis Nights', genre: 'Jazz' },
  { id: 'm14', title: 'Shaabi Cairo', artist: 'Nile Beats', genre: 'Shaabi' },
  { id: 'm15', title: 'Afro House Lagos', artist: 'Eko Underground', genre: 'Afro House' },
  { id: 'm16', title: 'Azonto Accra', artist: 'Coastal Crew', genre: 'Azonto' },
  { id: 'm17', title: 'Mapouka Sud', artist: 'Libreville Sound', genre: 'Mapouka' },
  { id: 'm18', title: 'Gqom Durban', artist: 'SA Waves', genre: 'Gqom' },
];

const SPEED_OPTIONS = [
  { value: 0.3, label: '0.3x' },
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
];

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

export type EditorTransitionId = 'none' | 'fade' | 'slide' | 'zoom';

export interface VideoEditorResult {
  filter: string;
  texts: TextOverlay[];
  stickers: StickerOverlay[];
  musicTrackId: string | null;
  /** Titre affichable pour `music_title` côté API si pas de son du fil. */
  musicTitle: string | null;
  speed: number;
  trimStart: number;
  trimEnd: number;
  /** Grille des tiers — aide au cadrage (aperçu + métadonnées). */
  gridEnabled: boolean;
  /** URI locale d’un enregistrement voix (upload séparé à la publication). */
  voiceOverUri: string | null;
  transitionId: EditorTransitionId;
}

interface VideoEditorProps {
  videoUri: string;
  onDone: (result: VideoEditorResult) => void;
  onCancel: () => void;
}

function EditorVideoWeb({ uri, speed }: { uri: string; speed: number }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.playbackRate = speed;
    } catch {
      /* */
    }
  }, [speed]);
  return createElement('video', {
    ref: videoRef,
    key: uri,
    src: uri,
    style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block', backgroundColor: '#111' },
    controls: false,
    muted: true,
    playsInline: true,
    loop: true,
    autoPlay: true,
  });
}

function RuleOfThirdsGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.gridLineV, { left: '33.33%' }]} />
      <View style={[styles.gridLineV, { left: '66.66%' }]} />
      <View style={[styles.gridLineH, { top: '33.33%' }]} />
      <View style={[styles.gridLineH, { top: '66.66%' }]} />
    </View>
  );
}

function EditorVideoNative({ uri, speed }: { uri: string; speed: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.play();
    } catch {
      /* */
    }
  });
  useEffect(() => {
    try {
      player.playbackRate = speed;
    } catch {
      /* */
    }
  }, [speed, player]);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        player.play();
      } catch {
        /* */
      }
    }, 80);
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
  return <VideoView style={styles.videoPreview} player={player} contentFit="contain" nativeControls={false} />;
}

const DraggableItem: React.FC<{
  children: React.ReactNode;
  initialX: number;
  initialY: number;
  onPositionChange: (x: number, y: number) => void;
  onDelete: () => void;
}> = ({ children, initialX, initialY, onPositionChange, onDelete }) => {
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    pan.setValue({ x: initialX, y: initialY });
  }, [initialX, initialY, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        hapticLight();
        pan.setOffset({
          x: (pan.x as unknown as { _value: number })._value,
          y: (pan.y as unknown as { _value: number })._value,
        });
        pan.setValue({ x: 0, y: 0 });
        setShowDelete(true);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const newX = (pan.x as unknown as { _value: number })._value;
        const newY = (pan.y as unknown as { _value: number })._value;
        onPositionChange(newX, newY);
        setTimeout(() => setShowDelete(false), 2000);
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.draggableItem, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      {children}
      {showDelete ? (
        <TouchableOpacity style={styles.deleteOverlayBtn} onPress={onDelete}>
          <Ionicons name="close-circle" size={20} color="#FF3D00" />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

const TRANSITION_OPTIONS: { id: EditorTransitionId; label: string }[] = [
  { id: 'none', label: 'Aucune' },
  { id: 'fade', label: 'Fondu' },
  { id: 'slide', label: 'Glissé' },
  { id: 'zoom', label: 'Zoom' },
];

const VideoEditor: React.FC<VideoEditorProps> = ({ videoUri, onDone, onCancel }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'trim' | 'filters' | 'text' | 'stickers' | 'music' | 'speed' | 'voice'>('filters');

  const [selectedFilter, setSelectedFilter] = useState('none');
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [selectedMusic, setSelectedMusic] = useState('m0');
  const [speed, setSpeed] = useState(1);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [transitionId, setTransitionId] = useState<EditorTransitionId>('none');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceOverUri, setVoiceOverUri] = useState<string | null>(null);

  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(24);
  const [stickerTab, setStickerTab] = useState<StickerCategory>('tout');
  const [musicGenre, setMusicGenre] = useState<string>('all');

  useEffect(() => {
    return () => {
      const r = recordingRef.current;
      if (r) {
        r.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const musicGenres = React.useMemo(() => {
    const g = new Set<string>();
    MUSIC_TRACKS.forEach((t) => {
      if (t.genre) g.add(t.genre);
    });
    return ['all', ...Array.from(g).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, []);

  const visibleMusicTracks = React.useMemo(
    () =>
      musicGenre === 'all'
        ? MUSIC_TRACKS
        : MUSIC_TRACKS.filter((t) => t.id === 'm0' || t.genre === musicGenre),
    [musicGenre],
  );

  const filteredStickers = React.useMemo(
    () => AFRICAN_STICKERS.filter((s) => stickerTab === 'tout' || s.cat === stickerTab),
    [stickerTab],
  );

  const setTrimStartSafe = useCallback(
    (next: number) => {
      hapticLight();
      const n = Math.max(0, Math.min(Math.round(next), trimEnd - MIN_TRIM_GAP));
      setTrimStart(n);
    },
    [trimEnd],
  );

  const setTrimEndSafe = useCallback(
    (next: number) => {
      hapticLight();
      const n = Math.min(100, Math.max(Math.round(next), trimStart + MIN_TRIM_GAP));
      setTrimEnd(n);
    },
    [trimStart],
  );

  const currentFilter = VIDEO_FILTERS.find((f) => f.id === selectedFilter);
  const filterOverlay = currentFilter?.overlay || 'transparent';

  const addText = useCallback(() => {
    if (!newText.trim()) return;
    const overlay: TextOverlay = {
      id: `txt_${Date.now()}`,
      text: newText.trim(),
      x: SCREEN_W / 2 - 50,
      y: VIDEO_H / 2 - 20,
      color: textColor,
      fontSize: textSize,
      fontWeight: 'bold',
    };
    setTextOverlays((prev) => [...prev, overlay]);
    setNewText('');
    setShowTextInput(false);
  }, [newText, textColor, textSize]);

  const addSticker = useCallback((emoji: string) => {
    hapticLight();
    const sticker: StickerOverlay = {
      id: `stk_${Date.now()}`,
      emoji,
      x: SCREEN_W / 2 - 25 + Math.random() * 60 - 30,
      y: VIDEO_H / 2 - 25 + Math.random() * 60 - 30,
      size: 50,
    };
    setStickerOverlays((prev) => [...prev, sticker]);
  }, []);

  const handleDone = useCallback(() => {
    const track = MUSIC_TRACKS.find((t) => t.id === selectedMusic);
    onDone({
      filter: selectedFilter,
      texts: textOverlays,
      stickers: stickerOverlays,
      musicTrackId: selectedMusic === 'm0' ? null : selectedMusic,
      musicTitle: selectedMusic === 'm0' || !track ? null : track.title.slice(0, 200),
      speed,
      trimStart,
      trimEnd,
      gridEnabled,
      voiceOverUri,
      transitionId,
    });
  }, [
    onDone,
    selectedFilter,
    textOverlays,
    stickerOverlays,
    selectedMusic,
    speed,
    trimStart,
    trimEnd,
    gridEnabled,
    voiceOverUri,
    transitionId,
  ]);

  const startVoiceRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Voix off', "L'enregistrement vocal est disponible sur l'application mobile (iOS / Android).");
      return;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission', 'Le micro est nécessaire pour enregistrer une voix off.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      hapticLight();
    } catch {
      Alert.alert('Erreur', "Impossible de démarrer l'enregistrement vocal.");
    }
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI() ?? null;
      recordingRef.current = null;
      setIsRecording(false);
      if (uri) setVoiceOverUri(uri);
      hapticLight();
    } catch {
      setIsRecording(false);
    }
  }, []);

  const clearVoiceRecording = useCallback(() => {
    setVoiceOverUri(null);
    hapticLight();
  }, []);

  const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF3D00', '#FF6B00', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF1493', '#00BCD4'];

  const renderTrimPanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Découper la vidéo</Text>
      <Text style={styles.panelHint}>
        Choisissez la portion à garder (du début à la fin). Idéal pour retirer les temps morts avant la publication.
      </Text>
      <View style={styles.trimContainer}>
        <View style={styles.trimTrack}>
          <View style={[styles.trimActive, { left: `${trimStart}%`, right: `${100 - trimEnd}%` }]} />
          <TouchableOpacity
            style={[styles.trimHandle, { left: `${trimStart}%` }]}
            onPress={() => setTrimStartSafe(trimStart - 3)}
          >
            <View style={styles.trimHandleBar} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.trimHandle, { left: `${trimEnd}%` }]}
            onPress={() => setTrimEndSafe(trimEnd + 3)}
          >
            <View style={styles.trimHandleBar} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.trimStepBlock}>
        <Text style={styles.trimSectionLabel}>Début de la séquence</Text>
        <View style={styles.trimStepper}>
          <TouchableOpacity style={styles.trimStepBtn} onPress={() => setTrimStartSafe(trimStart - 5)}>
            <Ionicons name="remove" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.trimStepValue}>{trimStart}%</Text>
          <TouchableOpacity style={styles.trimStepBtn} onPress={() => setTrimStartSafe(trimStart + 5)}>
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.trimStepBlock}>
        <Text style={styles.trimSectionLabel}>Fin de la séquence</Text>
        <View style={styles.trimStepper}>
          <TouchableOpacity style={styles.trimStepBtn} onPress={() => setTrimEndSafe(trimEnd - 5)}>
            <Ionicons name="remove" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.trimStepValue}>{trimEnd}%</Text>
          <TouchableOpacity style={styles.trimStepBtn} onPress={() => setTrimEndSafe(trimEnd + 5)}>
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.trimDurationHint}>
        Zone conservée : environ {Math.max(0, trimEnd - trimStart)}% de la durée
      </Text>
      <View style={styles.trimButtons}>
        <TouchableOpacity
          style={styles.trimBtn}
          onPress={() => {
            hapticLight();
            setTrimStart(0);
            setTrimEnd(100);
          }}
        >
          <Ionicons name="refresh" size={16} color={Colors.primary} />
          <Text style={styles.trimBtnText}>Toute la vidéo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFiltersPanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Filtres & ambiance</Text>
      <Text style={styles.panelHint}>Teintes chaudes, nuit africaine, or… Choisissez l’ambiance avant d’ajouter texte et stickers.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
        {VIDEO_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterItem, selectedFilter === f.id && styles.filterItemActive]}
            onPress={() => {
              hapticLight();
              setSelectedFilter(f.id);
            }}
          >
            <View
              style={[
                styles.filterPreview,
                { backgroundColor: f.overlay === 'transparent' ? '#333' : f.overlay },
                selectedFilter === f.id && styles.filterPreviewRing,
              ]}
            >
              {f.id === 'noir' ? <View style={styles.filterBW} /> : null}
              {selectedFilter === f.id ? <Ionicons name="checkmark-circle" size={22} color="#FFF" /> : null}
            </View>
            <Text style={[styles.filterLabel, selectedFilter === f.id && styles.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTextPanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Texte</Text>
      <Text style={styles.panelHint}>Titres, slogans, hashtags : positionnez le texte sur la vidéo après ajout.</Text>
      <Text style={styles.panelSubtitle}>Idées rapides</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipRow}>
        {QUICK_TEXT_SNIPPETS.map((snippet) => (
          <TouchableOpacity
            key={snippet}
            style={styles.quickChip}
            onPress={() => {
              hapticLight();
              setNewText(snippet);
              setShowTextInput(true);
            }}
          >
            <Text style={styles.quickChipText}>{snippet}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.addTextBtn} onPress={() => { hapticLight(); setShowTextInput(true); }}>
        <Ionicons name="text" size={20} color="#FFF" />
        <Text style={styles.addTextBtnText}>Écrire votre texte</Text>
      </TouchableOpacity>
      <Text style={styles.panelSubtitle}>Couleur</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsRow}>
        {TEXT_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.colorDot, { backgroundColor: c }, textColor === c && styles.colorDotActive]}
            onPress={() => {
              hapticLight();
              setTextColor(c);
            }}
          />
        ))}
      </ScrollView>
      <Text style={styles.panelSubtitle}>Taille : {textSize}px</Text>
      <View style={styles.sizeRow}>
        {[16, 20, 24, 32, 40, 52].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sizeBtn, textSize === s && styles.sizeBtnActive]}
            onPress={() => {
              hapticLight();
              setTextSize(s);
            }}
          >
            <Text style={[styles.sizeBtnText, textSize === s && styles.sizeBtnTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {textOverlays.length > 0 ? (
        <Text style={styles.overlayCount}>{textOverlays.length} texte(s) — glisser pour déplacer</Text>
      ) : null}
    </View>
  );

  const renderStickersPanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Stickers & emojis</Text>
      <Text style={styles.panelHint}>Exprimez-vous : nature, fête, musique… Touchez un emoji pour le placer sur la vidéo.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerTabRow}>
        {STICKER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.stickerTabChip, stickerTab === tab.key && styles.stickerTabChipActive]}
            onPress={() => {
              hapticLight();
              setStickerTab(tab.key);
            }}
          >
            <Text style={[styles.stickerTabChipText, stickerTab === tab.key && styles.stickerTabChipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.panelSubtitle}>Réactions express</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickEmojiRow}>
        {QUICK_EMOJIS.map((em) => (
          <TouchableOpacity key={em} style={styles.quickEmojiBtn} onPress={() => addSticker(em)}>
            <Text style={styles.quickEmojiLarge}>{em}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.panelSubtitle}>Galerie AfriWonder</Text>
      <View style={styles.stickersGrid}>
        {filteredStickers.map((s) => (
          <TouchableOpacity key={s.id} style={styles.stickerItem} onPress={() => addSticker(s.emoji)}>
            <Text style={styles.stickerEmoji}>{s.emoji}</Text>
            <Text style={styles.stickerLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {stickerOverlays.length > 0 ? (
        <Text style={styles.overlayCount}>{stickerOverlays.length} élément(s) — maintenez et glissez pour déplacer</Text>
      ) : null}
    </View>
  );

  const renderMusicPanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Musique</Text>
      <Text style={styles.panelHint}>Ambiances inspirées du continent — la piste choisie sera proposée comme titre sonore à la publication.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreChipRow}>
        {musicGenres.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genreChip, musicGenre === g && styles.genreChipActive]}
            onPress={() => {
              hapticLight();
              setMusicGenre(g);
            }}
          >
            <Text style={[styles.genreChipText, musicGenre === g && styles.genreChipTextActive]}>
              {g === 'all' ? 'Tous' : g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.musicList} nestedScrollEnabled>
        {visibleMusicTracks.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.musicItem, selectedMusic === t.id && styles.musicItemActive]}
            onPress={() => {
              hapticLight();
              setSelectedMusic(t.id);
            }}
          >
            <View style={[styles.musicIcon, selectedMusic === t.id && styles.musicIconActive]}>
              <Ionicons
                name={selectedMusic === t.id ? 'pause' : 'play'}
                size={18}
                color={selectedMusic === t.id ? '#FFF' : Colors.textSecondary}
              />
            </View>
            <View style={styles.musicInfo}>
              <Text style={[styles.musicTitle, selectedMusic === t.id && styles.musicTitleActive]}>{t.title}</Text>
              {t.artist ? (
                <Text style={styles.musicArtist}>
                  {t.artist} • {t.genre}
                </Text>
              ) : null}
            </View>
            {selectedMusic === t.id ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSpeedPanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Vitesse</Text>
      <Text style={styles.panelHint}>Ralenti pour le détail, accéléré pour l’énergie — idéal pour danses et moments forts.</Text>
      <View style={styles.speedRow}>
        {SPEED_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.speedBtn, speed === s.value && styles.speedBtnActive]}
            onPress={() => {
              hapticLight();
              setSpeed(s.value);
            }}
          >
            <Text style={[styles.speedBtnText, speed === s.value && styles.speedBtnTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.speedHint}>
        {speed < 1
          ? 'Ralenti — effet cinématique'
          : speed === 1
            ? 'Vitesse normale'
            : 'Accéléré — effet dynamique'}
      </Text>
    </View>
  );

  const renderVoicePanel = () => (
    <View style={styles.panelContent}>
      <Text style={styles.panelTitle}>Voix & montage</Text>
      <Text style={styles.panelHint}>
        Enregistrez une piste vocale par-dessus la vidéo (upload à la publication). Les transitions et le montage multi-clips
        seront appliqués côté serveur dans une prochaine version.
      </Text>
      <Text style={styles.panelSubtitle}>Voix off</Text>
      {Platform.OS === 'web' ? (
        <Text style={styles.voiceWebHint}>Enregistrement vocal : ouvrez AfriWonder sur téléphone pour cette étape.</Text>
      ) : (
        <View style={styles.voiceActions}>
          {!isRecording ? (
            <TouchableOpacity style={styles.voicePrimaryBtn} onPress={startVoiceRecording}>
              <Ionicons name="mic" size={22} color="#FFF" />
              <Text style={styles.voicePrimaryBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.voicePrimaryBtn, styles.voiceStopBtn]} onPress={stopVoiceRecording}>
              <Ionicons name="stop" size={22} color="#FFF" />
              <Text style={styles.voicePrimaryBtnText}>Arrêter</Text>
            </TouchableOpacity>
          )}
          {voiceOverUri && !isRecording ? (
            <TouchableOpacity style={styles.voiceSecondaryBtn} onPress={clearVoiceRecording}>
              <Text style={styles.voiceSecondaryBtnText}>Effacer la piste</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {voiceOverUri ? (
        <Text style={styles.voiceOkHint}>Piste vocale prête — elle sera envoyée avec la vidéo.</Text>
      ) : null}
      <Text style={styles.panelSubtitle}>Transition entre clips</Text>
      <View style={styles.transitionRow}>
        {TRANSITION_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.transitionChip, transitionId === t.id && styles.transitionChipActive]}
            onPress={() => {
              hapticLight();
              setTransitionId(t.id);
            }}
          >
            <Text style={[styles.transitionChipText, transitionId === t.id && styles.transitionChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.panelSubtitle}>Découpe en segments</Text>
      <Text style={styles.segmentHint}>
        Pour l’instant, importez une seule vidéo. Le montage de plusieurs clips et l’assemblage automatique arriveront prochainement
        dans le studio.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['#2a1a0a', '#0d0d0d', '#000000']} style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Studio AfriWonder</Text>
            <Text style={styles.headerSubtitle}>Montage express — style & chaleur</Text>
          </View>
          <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.videoPreviewContainer}>
        <TouchableOpacity
          style={[styles.gridToggleBtn, gridEnabled && styles.gridToggleBtnActive]}
          onPress={() => {
            hapticLight();
            setGridEnabled((g) => !g);
          }}
          accessibilityLabel={gridEnabled ? 'Masquer la grille' : 'Afficher la grille des tiers'}
        >
          <Ionicons name="grid" size={20} color={gridEnabled ? '#111' : '#FFF'} />
        </TouchableOpacity>
        {Platform.OS === 'web' ? (
          <EditorVideoWeb uri={videoUri} speed={speed} />
        ) : (
          <EditorVideoNative uri={videoUri} speed={speed} />
        )}
        {gridEnabled ? <RuleOfThirdsGrid /> : null}

        {filterOverlay !== 'transparent' && selectedFilter !== 'noir' ? (
          <View style={[styles.filterOverlayView, { backgroundColor: filterOverlay }]} pointerEvents="none" />
        ) : null}
        {selectedFilter === 'noir' ? (
          <View style={styles.filterOverlayView} pointerEvents="none">
            <View style={styles.bwOverlay} />
          </View>
        ) : null}

        {textOverlays.map((t) => (
          <DraggableItem
            key={t.id}
            initialX={t.x}
            initialY={t.y}
            onPositionChange={(x, y) =>
              setTextOverlays((prev) => prev.map((item) => (item.id === t.id ? { ...item, x, y } : item)))
            }
            onDelete={() => setTextOverlays((prev) => prev.filter((item) => item.id !== t.id))}
          >
            <Text
              style={{
                color: t.color,
                fontSize: t.fontSize,
                fontWeight: t.fontWeight,
                textShadowColor: 'rgba(0,0,0,0.8)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {t.text}
            </Text>
          </DraggableItem>
        ))}

        {stickerOverlays.map((s) => (
          <DraggableItem
            key={s.id}
            initialX={s.x}
            initialY={s.y}
            onPositionChange={(x, y) =>
              setStickerOverlays((prev) => prev.map((item) => (item.id === s.id ? { ...item, x, y } : item)))
            }
            onDelete={() => setStickerOverlays((prev) => prev.filter((item) => item.id !== s.id))}
          >
            <Text style={{ fontSize: s.size }}>{s.emoji}</Text>
          </DraggableItem>
        ))}

        {speed !== 1 ? (
          <View style={styles.speedBadge} pointerEvents="none">
            <Text style={styles.speedBadgeText}>{speed}x</Text>
          </View>
        ) : null}

        {(voiceOverUri || selectedMusic !== 'm0') ? (
          <View style={styles.previewBadgesColumn} pointerEvents="none">
            {voiceOverUri ? (
              <View style={styles.voiceBadge}>
                <Ionicons name="mic" size={12} color="#FFF" />
                <Text style={styles.voiceBadgeText}>Voix off</Text>
              </View>
            ) : null}
            {selectedMusic !== 'm0' ? (
              <View style={styles.musicBadge}>
                <Ionicons name="musical-notes" size={12} color="#FFF" />
                <Text style={styles.musicBadgeText} numberOfLines={1}>
                  {MUSIC_TRACKS.find((t) => t.id === selectedMusic)?.title}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.videoBottomFade}
          pointerEvents="none"
        />
      </View>

      <LinearGradient colors={['#141414', '#0a0a0a']} style={styles.toolTabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolTabsScroll}
          nestedScrollEnabled
        >
          {(
            [
              { key: 'trim' as const, icon: 'cut-outline' as const, label: 'Découper' },
              { key: 'filters' as const, icon: 'color-palette-outline' as const, label: 'Filtres' },
              { key: 'text' as const, icon: 'text' as const, label: 'Texte' },
              { key: 'stickers' as const, icon: 'happy-outline' as const, label: 'Stickers' },
              { key: 'music' as const, icon: 'musical-notes-outline' as const, label: 'Musique' },
              { key: 'speed' as const, icon: 'speedometer-outline' as const, label: 'Vitesse' },
              { key: 'voice' as const, icon: 'mic-outline' as const, label: 'Voix' },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.toolTab, activeTab === tab.key && styles.toolTabActive]}
              onPress={() => {
                hapticLight();
                setActiveTab(tab.key);
              }}
            >
              <Ionicons name={tab.icon as never} size={20} color={activeTab === tab.key ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.toolTabLabel, activeTab === tab.key && styles.toolTabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView style={styles.panelContainer} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {activeTab === 'trim' && renderTrimPanel()}
        {activeTab === 'filters' && renderFiltersPanel()}
        {activeTab === 'text' && renderTextPanel()}
        {activeTab === 'stickers' && renderStickersPanel()}
        {activeTab === 'music' && renderMusicPanel()}
        {activeTab === 'speed' && renderSpeedPanel()}
        {activeTab === 'voice' && renderVoicePanel()}
      </ScrollView>

      <Modal visible={showTextInput} transparent animationType="fade">
        <View style={styles.textInputModal}>
          <View style={styles.textInputCard}>
            <Text style={styles.textInputTitle}>Ajouter du texte</Text>
            <TextInput
              style={styles.textInputField}
              placeholder="Tapez votre texte..."
              placeholderTextColor={Colors.textMuted}
              value={newText}
              onChangeText={setNewText}
              autoFocus
              maxLength={80}
              multiline
            />
            <View style={styles.textInputActions}>
              <TouchableOpacity
                style={styles.textInputCancel}
                onPress={() => {
                  setShowTextInput(false);
                  setNewText('');
                }}
              >
                <Text style={styles.textInputCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textInputAdd, !newText.trim() && { opacity: 0.4 }]}
                onPress={addText}
                disabled={!newText.trim()}
              >
                <Text style={styles.textInputAddText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VideoEditor;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleBlock: { flex: 1, alignItems: 'center', minWidth: 0 },
  headerTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', textAlign: 'center' },
  headerSubtitle: { color: Colors.accent, fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  doneBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },

  videoPreviewContainer: { width: SCREEN_W, height: VIDEO_H, backgroundColor: '#111', position: 'relative' },
  videoPreview: { width: '100%', height: '100%' },
  gridToggleBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 200,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  gridToggleBtnActive: {
    backgroundColor: 'rgba(255,215,0,0.95)',
    borderColor: 'rgba(255,140,0,0.9)',
  },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  videoBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
  filterOverlayView: { ...StyleSheet.absoluteFillObject },
  bwOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(128,128,128,0.45)',
  },

  draggableItem: { position: 'absolute', zIndex: 100 },
  deleteOverlayBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
  },

  speedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  previewBadgesColumn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    gap: 6,
    maxWidth: SCREEN_W * 0.85,
  },
  musicBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  musicBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  voiceBadge: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  voiceBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },

  toolTabsWrap: { borderTopWidth: 1, borderTopColor: 'rgba(255,107,0,0.25)' },
  toolTabsScroll: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
    alignItems: 'stretch',
  },
  toolTab: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginHorizontal: 2, minWidth: 72 },
  toolTabActive: { backgroundColor: 'rgba(255,107,0,0.14)' },
  toolTabLabel: { color: Colors.textMuted, fontSize: 9, marginTop: 2, fontWeight: '500' },
  toolTabLabelActive: { color: Colors.primary, fontWeight: '700' },

  panelContainer: { flex: 1, backgroundColor: '#111' },
  panelContent: { padding: Spacing.lg },
  panelTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: Spacing.sm },
  panelHint: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  panelSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  overlayCount: { color: Colors.textMuted, fontSize: 11, marginTop: Spacing.md, fontStyle: 'italic' },

  trimContainer: { marginVertical: Spacing.md },
  trimTrack: { height: 40, backgroundColor: '#222', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  trimActive: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,107,0,0.3)',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primary,
  },
  trimHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  trimHandleBar: { width: 4, height: 24, backgroundColor: Colors.primary, borderRadius: 2 },
  trimSectionLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  trimStepBlock: { marginBottom: Spacing.md },
  trimStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: BorderRadius.lg,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: '#333',
  },
  trimStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimStepValue: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', minWidth: 56, textAlign: 'center' },
  trimDurationHint: { color: Colors.accent, fontSize: 11, textAlign: 'center', marginBottom: Spacing.sm },
  trimButtons: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  trimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#222',
    borderRadius: 20,
  },
  trimBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  filtersScroll: { gap: 12, paddingBottom: 8 },
  filterItem: { alignItems: 'center', width: 70 },
  filterItemActive: {},
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterPreviewRing: { borderColor: Colors.primary },
  filterBW: { width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#888' },
  filterLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 4, fontWeight: '500' },
  filterLabelActive: { color: Colors.primary, fontWeight: '700' },

  addTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  addTextBtnText: { color: '#FFF', fontWeight: '600' },
  colorsRow: { gap: 10, paddingVertical: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#333' },
  colorDotActive: { borderColor: '#FFF', borderWidth: 3 },
  sizeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sizeBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#222', borderRadius: 12 },
  sizeBtnActive: { backgroundColor: Colors.primary },
  sizeBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  sizeBtnTextActive: { color: '#FFF' },

  stickerTabRow: { gap: 8, paddingBottom: Spacing.md },
  stickerTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  stickerTabChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.12)' },
  stickerTabChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  stickerTabChipTextActive: { color: Colors.primary },
  quickEmojiRow: { gap: 10, paddingVertical: 4, marginBottom: Spacing.md },
  quickEmojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  quickEmojiLarge: { fontSize: 26 },
  genreChipRow: { gap: 8, paddingBottom: Spacing.md },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  genreChipActive: { borderColor: Colors.accent, backgroundColor: 'rgba(255,215,0,0.12)' },
  genreChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  genreChipTextActive: { color: Colors.accent },
  quickChipRow: { gap: 8, marginBottom: Spacing.md },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#252018',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  quickChipText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },
  stickersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stickerItem: { width: (SCREEN_W - Spacing.lg * 2 - 24) / 4, alignItems: 'center', paddingVertical: 8 },
  stickerEmoji: { fontSize: 32 },
  stickerLabel: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },

  musicList: { maxHeight: 300 },
  musicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  musicItemActive: { backgroundColor: 'rgba(255,107,0,0.08)', borderRadius: 8 },
  musicIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicIconActive: { backgroundColor: Colors.primary },
  musicInfo: { flex: 1 },
  musicTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  musicTitleActive: { color: Colors.primary },
  musicArtist: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },

  speedRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: Spacing.md, flexWrap: 'wrap' },
  speedBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#222', borderRadius: 20 },
  speedBtnActive: { backgroundColor: Colors.primary },
  speedBtnText: { color: Colors.textMuted, fontWeight: '700', fontSize: 14 },
  speedBtnTextActive: { color: '#FFF' },
  speedHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  voiceWebHint: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: Spacing.sm },
  voiceActions: { gap: Spacing.sm, marginBottom: Spacing.sm },
  voicePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
  },
  voiceStopBtn: { backgroundColor: '#C62828' },
  voicePrimaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  voiceSecondaryBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  voiceSecondaryBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  voiceOkHint: { color: Colors.accent, fontSize: 12, marginBottom: Spacing.md },
  transitionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  transitionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  transitionChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.14)' },
  transitionChipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  transitionChipTextActive: { color: Colors.primary },
  segmentHint: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  textInputModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  textInputCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, width: '100%' },
  textInputTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  textInputField: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInputActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: Spacing.lg },
  textInputCancel: { paddingHorizontal: 20, paddingVertical: 10 },
  textInputCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  textInputAdd: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  textInputAddText: { color: '#FFF', fontWeight: 'bold' },
});
