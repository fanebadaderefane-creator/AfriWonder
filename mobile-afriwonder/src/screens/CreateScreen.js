import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

import Constants from 'expo-constants';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const isExpoGo = () => Constants.appOwnership === 'expo';

// Même listes que PWA Create.jsx
const CATEGORIES = [
  'divertissement', 'musique', 'danse', 'cuisine', 'mode',
  'business', 'education', 'sport', 'actualites', 'humour', 'lifestyle', 'tech',
];

const LANGUAGES = [
  { code: 'francais', name: 'Français' },
  { code: 'wolof', name: 'Wolof' },
  { code: 'bambara', name: 'Bambara' },
  { code: 'hausa', name: 'Hausa' },
  { code: 'lingala', name: 'Lingala' },
  { code: 'swahili', name: 'Swahili' },
  { code: 'anglais', name: 'English' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Tout le monde' },
  { value: 'abonnes', label: 'Abonnés', description: 'Vos abonnés seulement' },
  { value: 'prive', label: 'Privé', description: 'Vous seul' },
];

function extractHashtagsFromDescription(description) {
  if (!description) return [];
  const matches = description.match(/#[\w]+/g);
  return matches ? matches.map((t) => t.substring(1)) : [];
}

function descriptionWithoutHashtags(description) {
  if (!description) return '';
  return description
    .replace(/\n\n#[\w\s#]+/g, '')
    .replace(/\n\n🎵 Musique:.*/g, '')
    .trim();
}

function VideoPreviewChild({ uri }) {
  const player = useVideoPlayer(uri || '', (p) => {
    if (p) {
      p.loop = true;
      p.muted = true;
    }
  });
  if (!uri) return null;
  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="contain"
    />
  );
}

function EditPreviewStep({ previewUrl, isImage, onBack, onNext }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={26} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prévisualisation</Text>
        <TouchableOpacity style={styles.headerNextBtn} onPress={onNext}>
          <Text style={styles.headerNextText}>Suivant</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.previewWrap}>
        {previewUrl && (
          isImage ? (
            <Image source={{ uri: previewUrl }} style={styles.previewMedia} resizeMode="contain" />
          ) : (
            <VideoPreviewChild uri={previewUrl} />
          )
        )}
      </View>
    </SafeAreaView>
  );
}

export default function CreateScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [step, setStep] = useState('select'); // 'select' | 'edit' | 'details' | 'uploading'
  const [selectedFile, setSelectedFile] = useState(null); // { uri, type, name }
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    category: 'divertissement',
    language: 'francais',
    visibility: 'public',
    hashtags: [],
    music_title: '',
    music_id: '',
    thumbnail_url: '',
  });
  const [hashtagInput, setHashtagInput] = useState('');
  const [editingVideoId, setEditingVideoId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigation.replace('Auth');
    }
  }, [user, navigation]);

  const isImage = selectedFile?.type?.startsWith('image/');

  const handlePickImage = useCallback(async () => {
    const msgUnavailable = 'Galerie non disponible dans Expo Go. Utilisez un build de développement (npx expo run:android) ou la PWA pour uploader.';
    if (isExpoGo()) {
      Alert.alert('Expo Go', msgUnavailable);
      return;
    }
    let ImagePicker;
    try {
      const mod = await import('expo-image-picker');
      ImagePicker = mod.default ?? mod;
    } catch (e) {
      Alert.alert('Non disponible', msgUnavailable);
      return;
    }
    if (typeof ImagePicker?.requestMediaLibraryPermissionsAsync !== 'function') {
      Alert.alert('Non disponible', msgUnavailable);
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Autorisez l\'accès à la galerie pour choisir une photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
      });
      setPreviewUrl(asset.uri);
      setStep('edit');
    } catch (e) {
      Alert.alert('Non disponible', msgUnavailable);
    }
  }, []);

  const handlePickVideo = useCallback(async () => {
    const msgUnavailable = 'Galerie vidéo non disponible dans Expo Go. Utilisez un build de développement (npx expo run:android) ou la PWA pour uploader.';
    if (isExpoGo()) {
      Alert.alert('Expo Go', msgUnavailable);
      return;
    }
    let ImagePicker;
    try {
      const mod = await import('expo-image-picker');
      ImagePicker = mod.default ?? mod;
    } catch (e) {
      Alert.alert('Non disponible', msgUnavailable);
      return;
    }
    if (typeof ImagePicker?.requestMediaLibraryPermissionsAsync !== 'function') {
      Alert.alert('Non disponible', msgUnavailable);
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Autorisez l\'accès à la galerie pour choisir une vidéo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Videos,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        type: asset.mimeType || 'video/mp4',
        name: asset.fileName || `video_${Date.now()}.mp4`,
      });
      setPreviewUrl(asset.uri);
      setStep('edit');
    } catch (e) {
      Alert.alert('Non disponible', msgUnavailable);
    }
  }, []);

  const handleFilmer = useCallback(async () => {
    const msgUnavailable = 'Caméra non disponible dans Expo Go. Utilisez un build de développement (npx expo run:android) ou la PWA pour filmer.';
    if (isExpoGo()) {
      Alert.alert('Expo Go', msgUnavailable);
      return;
    }
    let ImagePicker;
    try {
      const mod = await import('expo-image-picker');
      ImagePicker = mod.default ?? mod;
    } catch (e) {
      Alert.alert('Non disponible', msgUnavailable);
      return;
    }
    if (typeof ImagePicker?.requestCameraPermissionsAsync !== 'function') {
      Alert.alert('Non disponible', msgUnavailable);
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Autorisez l\'accès à la caméra pour filmer.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Videos,
        allowsEditing: false,
        videoQuality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        type: asset.mimeType || 'video/mp4',
        name: asset.fileName || `video_${Date.now()}.mp4`,
      });
      setPreviewUrl(asset.uri);
      setStep('edit');
    } catch (e) {
      Alert.alert('Non disponible', msgUnavailable);
    }
  }, []);

  const handleBackToSelect = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setStep('select');
  }, []);

  const handleAddHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (!tag || videoData.hashtags.length >= 10) return;
    if (videoData.hashtags.includes(tag)) return;
    setVideoData((prev) => ({ ...prev, hashtags: [...prev.hashtags, tag] }));
    setHashtagInput('');
  }, [hashtagInput, videoData.hashtags]);

  const handleRemoveHashtag = useCallback((tag) => {
    setVideoData((prev) => ({ ...prev, hashtags: prev.hashtags.filter((t) => t !== tag) }));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!editingVideoId && !selectedFile) {
      Alert.alert('Erreur', 'Sélectionnez une vidéo ou une image.');
      return;
    }
    if (!videoData.title.trim()) {
      Alert.alert('Erreur', 'Ajoutez un titre.');
      return;
    }

    if (editingVideoId) {
      setStep('uploading');
      setUploadProgress(50);
      try {
        const hashtagsText = videoData.hashtags?.length > 0
          ? '\n\n#' + videoData.hashtags.join(' #')
          : '';
        const fullDescription = [videoData.description || '', hashtagsText].filter(Boolean).join('');
        await api.videos.update(editingVideoId, {
          title: videoData.title,
          description: fullDescription,
          category: videoData.category || 'divertissement',
          visibility: videoData.visibility || 'public',
          hashtags: videoData.hashtags?.length > 0 ? videoData.hashtags : undefined,
          music_title: videoData.music_title || undefined,
          thumbnail_url: videoData.thumbnail_url || undefined,
        });
        setUploadProgress(100);
        Alert.alert('Succès', 'Vidéo mise à jour avec succès !', [
          { text: 'OK', onPress: () => navigation.navigate('App') },
        ]);
      } catch (error) {
        setStep('details');
        Alert.alert('Erreur', error?.apiMessage || error?.message || 'Erreur lors de la mise à jour');
      }
      return;
    }

    setStep('uploading');
    setUploadProgress(0);

    try {
      let videoUrl = '';
      if (isImage) {
        const imageResult = await api.upload.image(selectedFile);
        videoUrl = imageResult?.file_url ?? imageResult?.url ?? '';
        setUploadProgress(90);
      } else {
        const uploadResult = await api.upload.video(selectedFile, (progress) => {
          setUploadProgress((prev) => Math.max(prev, Math.min(progress, 90)));
        });
        videoUrl = uploadResult?.file_url ?? uploadResult?.url ?? '';
      }

      if (!videoUrl) {
        Alert.alert('Erreur', 'Upload réussi mais URL manquante.');
        setStep('details');
        return;
      }

      setUploadProgress(100);

      const hashtagsText = videoData.hashtags?.length > 0 ? '\n\n#' + videoData.hashtags.join(' #') : '';
      const fullDescription = [videoData.description || '', hashtagsText].filter(Boolean).join('');

      await api.videos.create({
        title: videoData.title,
        description: fullDescription,
        video_url: videoUrl,
        thumbnail_url: videoData.thumbnail_url || videoUrl,
        category: videoData.category || 'divertissement',
        visibility: videoData.visibility || 'public',
        hashtags: videoData.hashtags?.length > 0 ? videoData.hashtags : undefined,
        music_title: videoData.music_title || undefined,
        media_type: isImage ? 'image' : 'video',
      });

      Alert.alert(
        'Succès',
        isImage ? 'Image publiée avec succès ! 🎉' : 'Vidéo publiée avec succès ! 🎉',
        [{ text: 'OK', onPress: () => navigation.navigate('App') }]
      );
    } catch (error) {
      setStep('details');
      const msg = error?.response?.data?.error ?? error?.apiMessage ?? error?.message ?? 'Erreur lors de la publication';
      Alert.alert('Erreur', typeof msg === 'string' ? msg : 'Erreur lors de la publication');
    }
  }, [editingVideoId, selectedFile, videoData, isImage, navigation]);

  // —— Step: Select ——
  if (step === 'select') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('App')}>
            <Ionicons name="close" size={26} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.selectContent}>
          <TouchableOpacity style={[styles.selectCard, styles.selectCardPhoto]} onPress={handlePickImage} activeOpacity={0.9}>
            <View style={styles.selectIconWrap}>
              <Ionicons name="image-outline" size={32} color="#FFF" />
            </View>
            <View style={styles.selectTextWrap}>
              <Text style={styles.selectTitle}>Photo</Text>
              <Text style={styles.selectSubtitle}>Choisir une image depuis la galerie</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectCard, styles.selectCardVideo]} onPress={handlePickVideo} activeOpacity={0.9}>
            <View style={styles.selectIconWrap}>
              <Ionicons name="videocam-outline" size={32} color="#FFF" />
            </View>
            <View style={styles.selectTextWrap}>
              <Text style={styles.selectTitle}>Vidéo</Text>
              <Text style={styles.selectSubtitle}>Choisir une vidéo depuis la galerie</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectCardOutline} onPress={handleFilmer} activeOpacity={0.9}>
            <View style={styles.selectIconWrapOutline}>
              <Ionicons name="camera-outline" size={32} color="#F9FAFB" />
            </View>
            <View style={styles.selectTextWrap}>
              <Text style={styles.selectTitle}>Filmer</Text>
              <Text style={styles.selectSubtitleOutline}>Utiliser la caméra</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectCardOutline}
            onPress={() => navigation.navigate('StartLive')}
            activeOpacity={0.9}
          >
            <View style={[styles.selectIconWrapOutline, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Ionicons name="radio-outline" size={32} color="#3B82F6" />
            </View>
            <View style={styles.selectTextWrap}>
              <Text style={styles.selectTitle}>Passer en Live</Text>
              <Text style={styles.selectSubtitleOutline}>Diffusez en direct</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // —— Step: Edit (preview) ——
  if (step === 'edit') {
    return (
      <EditPreviewStep
        previewUrl={previewUrl}
        isImage={isImage}
        onBack={handleBackToSelect}
        onNext={() => setStep('details')}
      />
    );
  }

  // —— Step: Details ——
  if (step === 'details') {
    return (
      <SafeAreaView style={styles.detailsContainer} edges={['top', 'bottom']}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity
            style={styles.detailsBackBtn}
            onPress={() => (editingVideoId ? navigation.navigate('App') : setStep('edit'))}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.detailsHeaderTitle}>
            {editingVideoId ? 'Modifier la vidéo' : 'Détails'}
          </Text>
          <TouchableOpacity style={styles.publishBtnHeader} onPress={handlePublish}>
            <Text style={styles.publishBtnHeaderText}>Publier</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.detailsRow}>
            <View style={styles.thumbWrap}>
              {previewUrl && (
                isImage ? (
                  <Image source={{ uri: previewUrl }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Ionicons name="videocam-outline" size={28} color="#9CA3AF" />
                  </View>
                )
              )}
            </View>
            <TextInput
              style={styles.descriptionInput}
              placeholder={isImage ? 'Décrivez votre image...' : 'Décrivez votre vidéo...'}
              placeholderTextColor="#9CA3AF"
              value={videoData.description}
              onChangeText={(t) => setVideoData((prev) => ({ ...prev, description: t }))}
              multiline
              numberOfLines={4}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              placeholder={isImage ? 'Donnez un titre à votre image' : 'Donnez un titre à votre vidéo'}
              placeholderTextColor="#9CA3AF"
              value={videoData.title}
              onChangeText={(t) => setVideoData((prev) => ({ ...prev, title: t }))}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Hashtags</Text>
            <View style={styles.hashtagRow}>
              <TextInput
                style={[styles.input, styles.hashtagInput]}
                placeholder="Ajouter un hashtag"
                placeholderTextColor="#9CA3AF"
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={handleAddHashtag}
              />
              <TouchableOpacity style={styles.hashtagAddBtn} onPress={handleAddHashtag}>
                <Ionicons name="pricetag-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            {videoData.hashtags.length > 0 && (
              <View style={styles.hashtagChips}>
                {videoData.hashtags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.hashtagChip}
                    onPress={() => handleRemoveHashtag(tag)}
                  >
                    <Text style={styles.hashtagChipText}>#{tag}</Text>
                    <Ionicons name="close" size={14} color="#3B82F6" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, videoData.category === cat && styles.categoryChipActive]}
                  onPress={() => setVideoData((prev) => ({ ...prev, category: cat }))}
                >
                  <Text style={[styles.categoryChipText, videoData.category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Visibilité</Text>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.visibilityRow, videoData.visibility === opt.value && styles.visibilityRowActive]}
                onPress={() => setVideoData((prev) => ({ ...prev, visibility: opt.value }))}
              >
                <View style={styles.visibilityTextWrap}>
                  <Text style={styles.visibilityLabel}>{opt.label}</Text>
                  <Text style={styles.visibilityDesc}>{opt.description}</Text>
                </View>
                {videoData.visibility === opt.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // —— Step: Uploading ——
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.uploadingContent}>
        <View style={styles.uploadingIconWrap}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
        <Text style={styles.uploadingTitle}>Publication en cours...</Text>
        <Text style={styles.uploadingSubtitle}>Ne fermez pas l'application</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
        </View>
        <Text style={styles.progressPct}>{uploadProgress}%</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  headerNextBtn: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerNextText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  selectContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  selectCardPhoto: {
    backgroundColor: '#059669',
  },
  selectCardVideo: {
    backgroundColor: '#2563EB',
  },
  selectCardOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 16,
  },
  selectIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIconWrapOutline: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTextWrap: {
    flex: 1,
  },
  selectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  selectSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  selectSubtitleOutline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  previewWrap: {
    flex: 1,
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    color: '#9CA3AF',
    marginTop: 8,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailsBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  publishBtnHeader: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  publishBtnHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  detailsScroll: {
    flex: 1,
  },
  detailsScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  thumbWrap: {
    width: 96,
    height: 128,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  hashtagRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  hashtagInput: {
    flex: 1,
  },
  hashtagAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
  },
  hashtagChipText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    marginBottom: 8,
  },
  visibilityRowActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  visibilityTextWrap: {},
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  visibilityDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  uploadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  uploadingIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  uploadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  uploadingSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  progressTrack: {
    width: '100%',
    maxWidth: 280,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressPct: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
