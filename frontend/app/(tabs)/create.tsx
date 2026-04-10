import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Image, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';
import mobileApiClient from '../../src/api/mobileClient';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'select' | 'details'>('select');

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
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedMedia({ uri: result.assets[0].uri, type: 'video' });
      setStep('details');
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedMedia({ uri: result.assets[0].uri, type: 'image' });
      setStep('details');
    }
  };

  const handleRecordVideo = async () => {
    if (!requireAuth('enregistrer une vidéo')) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Accès à la caméra nécessaire");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedMedia({ uri: result.assets[0].uri, type: 'video' });
      setStep('details');
    }
  };

  const handlePublish = async () => {
    if (!selectedMedia) return;
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Veuillez ajouter un titre à votre vidéo');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload file to FastAPI backend
      setUploadProgress(20);
      const formData = new FormData();
      const ext = selectedMedia.uri.split('.').pop() || (selectedMedia.type === 'video' ? 'mp4' : 'jpg');
      formData.append('file', {
        uri: selectedMedia.uri,
        name: `upload.${ext}`,
        type: selectedMedia.type === 'video' ? `video/${ext}` : `image/${ext}`,
      } as any);
      formData.append('type', selectedMedia.type);

      const uploadRes = await mobileApiClient.post('/mobile/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const uploadData = uploadRes.data?.data || uploadRes.data;
      const fileUrl = uploadData.url;
      setUploadProgress(60);

      // Step 2: Create video entry on PWA backend
      const hashtagArray = hashtags
        .split(/[,#\s]+/)
        .filter(h => h.trim())
        .map(h => h.trim());

      const videoRes = await apiClient.post('/videos', {
        title: title.trim(),
        description: description.trim() || title.trim(),
        video_url: fileUrl,
        thumbnail_url: fileUrl,
        hashtags: hashtagArray,
        media_type: selectedMedia.type,
      });
      setUploadProgress(100);

      const videoData = videoRes.data?.data || videoRes.data;

      Alert.alert(
        'Publié !',
        'Votre contenu a été publié avec succès',
        [{ text: 'OK', onPress: () => {
          setStep('select');
          setSelectedMedia(null);
          setTitle('');
          setDescription('');
          setHashtags('');
          router.replace('/(tabs)');
        }}]
      );
    } catch (error: any) {
      console.error('Publish error:', error);
      const msg = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Erreur lors de la publication';
      Alert.alert('Erreur', msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetSelection = () => {
    setStep('select');
    setSelectedMedia(null);
    setTitle('');
    setDescription('');
    setHashtags('');
  };

  if (step === 'details' && selectedMedia) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={resetSelection} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Publier</Text>
          <TouchableOpacity
            style={[styles.publishBtn, (!title.trim() || uploading) && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={!title.trim() || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.publishBtnText}>Publier</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
          {/* Preview */}
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedMedia.uri }} style={styles.preview} />
            <TouchableOpacity style={styles.changeMediaBtn} onPress={resetSelection}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.changeMediaText}>Changer</Text>
            </TouchableOpacity>
            {selectedMedia.type === 'video' && (
              <View style={styles.videoIndicator}>
                <Ionicons name="videocam" size={14} color="#FFF" />
                <Text style={styles.videoIndicatorText}>Vidéo</Text>
              </View>
            )}
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Titre *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Donnez un titre à votre vidéo..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Décrivez votre vidéo..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <Text style={styles.formLabel}>Hashtags</Text>
            <TextInput
              style={styles.formInput}
              placeholder="#mali #culture #danse"
              placeholderTextColor={Colors.textMuted}
              value={hashtags}
              onChangeText={setHashtags}
            />

            {/* Suggested hashtags */}
            <View style={styles.suggestedTags}>
              {['AfriWonder', 'Mali', 'Afrique', 'Culture', 'Danse', 'Food'].map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => setHashtags(prev => prev ? `${prev} #${tag}` : `#${tag}`)}
                >
                  <Text style={styles.tagChipText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upload progress */}
          {uploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {uploadProgress < 50 ? 'Upload en cours...' : uploadProgress < 90 ? 'Création de la vidéo...' : 'Finalisation...'}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Selection screen
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer</Text>
      </View>

      <View style={styles.content}>
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
            <Text style={styles.optionSubtitle}>Depuis la galerie</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handlePickImage}>
            <View style={[styles.optionIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="images" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Photo</Text>
            <Text style={styles.optionSubtitle}>Publier une image</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.liveCard} onPress={() => Alert.alert('Live', 'Fonctionnalité live bientôt disponible!')}>
          <View style={styles.liveIcon}>
            <Ionicons name="radio" size={28} color="#FFF" />
          </View>
          <View style={styles.liveInfo}>
            <Text style={styles.liveTitle}>Démarrer un Live</Text>
            <Text style={styles.liveSubtitle}>Diffusez en direct à votre communauté</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Conseils pour de bonnes vidéos</Text>
          {[
            { icon: 'bulb', text: 'Utilisez une bonne lumière naturelle' },
            { icon: 'time', text: 'Vidéos courtes (15-60 secondes)' },
            { icon: 'musical-notes', text: 'Ajoutez de la musique tendance' },
            { icon: 'pricetag', text: 'Utilisez des hashtags populaires' },
          ].map((tip, i) => (
            <View key={i} style={styles.tipItem}>
              <Ionicons name={tip.icon as any} size={20} color={Colors.accent} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
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
  content: { flex: 1, padding: Spacing.xl },
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
  liveCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, gap: Spacing.md,
  },
  liveIcon: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF0000',
    alignItems: 'center', justifyContent: 'center',
  },
  liveInfo: { flex: 1 },
  liveTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  liveSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
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
  formContainer: { gap: Spacing.xs },
  formLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.md },
  formInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border,
  },
  formTextArea: { height: 80, textAlignVertical: 'top' },
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
});
