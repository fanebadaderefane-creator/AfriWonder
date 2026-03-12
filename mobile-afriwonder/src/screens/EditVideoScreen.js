/**
 * EditVideoScreen — Modifier une vidéo (réécriture RN depuis PWA EditVideo.jsx)
 * Titre, description, hashtags, catégorie, langue, visibilité ; Sauvegarder / Supprimer.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'divertissement', 'musique', 'danse', 'cuisine', 'mode',
  'business', 'education', 'sport', 'actualites', 'humour', 'lifestyle', 'tech',
];

const LANGUAGES = [
  { code: 'francais', name: 'Français' },
  { code: 'wolof', name: 'Wolof' },
  { code: 'bambara', name: 'Bambara' },
  { code: 'anglais', name: 'English' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'abonnes', label: 'Abonnés' },
  { value: 'prive', label: 'Privé' },
];

function extractHashtags(description) {
  if (!description) return [];
  const matches = description.match(/#[\w]+/g);
  return matches ? matches.map((t) => t.substring(1)) : [];
}

function extractDescription(description) {
  if (!description) return '';
  return description
    .replace(/\n\n#[\w\s#]+/g, '')
    .replace(/\n\n🎵 Musique:.*/g, '')
    .trim();
}

export default function EditVideoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const videoId = route.params?.videoId ?? route.params?.id;

  const [video, setVideo] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [hashtagInput, setHashtagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadVideo = useCallback(async () => {
    if (!videoId) {
      setLoading(false);
      return;
    }
    try {
      const v = await api.videos.getById(videoId);
      if (user && v.creator_id !== user.id) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      setVideo(v);
      const hashtags = extractHashtags(v.description);
      const cleanDesc = extractDescription(v.description);
      setVideoData({
        title: v.title || '',
        description: cleanDesc,
        category: v.category || '',
        language: v.language || 'francais',
        visibility: v.visibility || 'public',
        hashtags: hashtags || [],
        music_title: v.music_title || '',
      });
    } catch {
      setVideo(null);
      setVideoData(null);
    } finally {
      setLoading(false);
    }
  }, [videoId, user?.id]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  const handleAddHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (!tag || !videoData || videoData.hashtags.length >= 10) return;
    if (videoData.hashtags.includes(tag)) return;
    setVideoData((prev) => ({ ...prev, hashtags: [...prev.hashtags, tag] }));
    setHashtagInput('');
  }, [hashtagInput, videoData]);

  const handleRemoveHashtag = useCallback((tag) => {
    setVideoData((prev) => ({ ...prev, hashtags: prev.hashtags.filter((t) => t !== tag) }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!videoId || !videoData || saving) return;
    setSaving(true);
    try {
      const hashtagsText = videoData.hashtags?.length
        ? '\n\n#' + videoData.hashtags.join(' #')
        : '';
      const fullDescription = [videoData.description || '', hashtagsText].filter(Boolean).join('');
      await api.videos.update(videoId, {
        title: videoData.title,
        description: fullDescription,
        category: videoData.category,
        visibility: videoData.visibility,
        hashtags: videoData.hashtags?.length ? videoData.hashtags : [],
        ...(videoData.music_title && { music_title: videoData.music_title }),
        ...(videoData.language && { language: videoData.language }),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }, [videoId, videoData, saving, navigation]);

  const handleDelete = useCallback(() => {
    if (!videoId) return;
    Alert.alert(
      'Supprimer la vidéo',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.videos.delete(videoId);
              navigation.goBack();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la vidéo');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [videoId, navigation]);

  if (!videoId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier la vidéo</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Vidéo introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (unauthorized) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier la vidéo</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Accès refusé</Text>
          <Text style={styles.errorSub}>Vous ne pouvez modifier que vos propres vidéos</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !videoData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier la vidéo</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier la vidéo</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {video?.thumbnail_url || video?.video_url ? (
            <View style={styles.previewWrap}>
              <Image
                source={{ uri: video.thumbnail_url || video.video_url }}
                style={styles.preview}
                resizeMode="cover"
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              value={videoData.title}
              onChangeText={(t) => setVideoData((prev) => ({ ...prev, title: t }))}
              placeholder="Donnez un titre à votre vidéo"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={videoData.description}
              onChangeText={(t) => setVideoData((prev) => ({ ...prev, description: t }))}
              placeholder="Décrivez votre vidéo..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Hashtags</Text>
            <View style={styles.hashtagRow}>
              <TextInput
                style={[styles.input, styles.hashtagInput]}
                value={hashtagInput}
                onChangeText={setHashtagInput}
                placeholder="Ajouter un hashtag"
                placeholderTextColor="#6B7280"
                onSubmitEditing={handleAddHashtag}
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={handleAddHashtag}>
                <Text style={styles.addTagText}>+</Text>
              </TouchableOpacity>
            </View>
            {videoData.hashtags.length > 0 && (
              <View style={styles.tagsWrap}>
                {videoData.hashtags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveHashtag(tag)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="#2563eb" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.optionsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.optionChip, videoData.category === cat && styles.optionChipActive]}
                  onPress={() => setVideoData((prev) => ({ ...prev, category: cat }))}
                >
                  <Text style={[styles.optionChipText, videoData.category === cat && styles.optionChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Visibilité</Text>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.visibilityRow, videoData.visibility === opt.value && styles.visibilityRowActive]}
                onPress={() => setVideoData((prev) => ({ ...prev, visibility: opt.value }))}
              >
                <View style={[styles.radio, videoData.visibility === opt.value && styles.radioActive]} />
                <Text style={[styles.visibilityLabel, videoData.visibility === opt.value && styles.visibilityLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="trash-outline" size={20} color="#FFF" />}
              <Text style={styles.deleteBtnText}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving || deleting}
            >
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save-outline" size={20} color="#FFF" />}
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB', flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#F97373' },
  errorSub: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  previewWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#1F2937', marginBottom: 20 },
  preview: { width: '100%', height: 200 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#9CA3AF', marginBottom: 8 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F9FAFB',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  hashtagRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  hashtagInput: { flex: 1 },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagText: { fontSize: 20, color: '#9CA3AF', fontWeight: '600' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(37,99,235,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 13, color: '#2563eb' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#111827' },
  optionChipActive: { backgroundColor: '#3B82F6' },
  optionChipText: { fontSize: 14, color: '#9CA3AF' },
  optionChipTextActive: { color: '#FFF', fontWeight: '600' },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1F2937',
    marginBottom: 8,
  },
  visibilityRowActive: { borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#374151', marginRight: 12 },
  radioActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  visibilityLabel: { fontSize: 15, color: '#9CA3AF' },
  visibilityLabelActive: { color: '#2563eb', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  bottomSpacer: { height: 24 },
});
