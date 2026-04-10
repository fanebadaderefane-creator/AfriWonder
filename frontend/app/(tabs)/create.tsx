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
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: string }[]>([]);
  const [contentType, setContentType] = useState<'video' | 'photo' | 'text' | 'article'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [articleBody, setArticleBody] = useState('');
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
      setSelectedMedia([{ uri: result.assets[0].uri, type: 'video' }]);
      setContentType('video');
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
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedMedia(result.assets.map(a => ({ uri: a.uri, type: 'image' })));
      setContentType('photo');
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
      // Pas de limite de durée pour les vidéos longues
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedMedia([{ uri: result.assets[0].uri, type: 'video' }]);
      setContentType('video');
      setStep('details');
    }
  };

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

  const handlePublish = async () => {
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
      const hashtagArray = hashtags.split(/[,#\s]+/).filter(h => h.trim()).map(h => h.trim());
      let mediaUrls: string[] = [];
      let videoUrl: string | undefined;

      // Upload media files if any
      if (selectedMedia.length > 0) {
        setUploadProgress(10);
        for (let i = 0; i < selectedMedia.length; i++) {
          const media = selectedMedia[i];
          const formData = new FormData();
          const ext = media.uri.split('.').pop() || (media.type === 'video' ? 'mp4' : 'jpg');
          formData.append('file', { uri: media.uri, name: `upload_${i}.${ext}`, type: media.type === 'video' ? `video/${ext}` : `image/${ext}` } as any);
          formData.append('type', media.type);

          const uploadRes = await mobileApiClient.post('/mobile/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000, // 5 min pour les vidéos longues
          });
          const fileUrl = uploadRes.data?.data?.url || '';
          if (media.type === 'video') videoUrl = fileUrl;
          else mediaUrls.push(fileUrl);

          setUploadProgress(10 + Math.round((i + 1) / selectedMedia.length * 40));
        }
      }

      setUploadProgress(60);

      // Publier via l'API complémentaire (mobile posts)
      await mobileApiClient.post('/mobile/posts', {
        content_type: contentType,
        title: title.trim() || (contentType === 'text' ? undefined : undefined),
        text: contentType === 'article' ? articleBody.trim() : description.trim(),
        media_urls: mediaUrls,
        video_url: videoUrl,
        hashtags: hashtagArray,
      });

      setUploadProgress(80);

      // Si c'est une vidéo, aussi publier sur le backend PWA pour le feed vidéo
      if (contentType === 'video' && videoUrl) {
        try {
          await apiClient.post('/videos', {
            title: title.trim(),
            description: description.trim() || title.trim(),
            video_url: videoUrl,
            thumbnail_url: videoUrl,
            hashtags: hashtagArray,
            media_type: 'video',
          });
        } catch (e) { console.log('PWA video post failed (non-critical):', e); }
      }

      setUploadProgress(100);

      Alert.alert('Publié !', `Votre ${contentType === 'text' ? 'publication' : contentType === 'article' ? 'article' : contentType === 'photo' ? 'photo' : 'vidéo'} a été publié(e) avec succès`, [{
        text: 'OK', onPress: () => {
          resetSelection();
          router.replace('/(tabs)');
        }
      }]);
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
    setSelectedMedia([]);
    setContentType('video');
    setTitle('');
    setDescription('');
    setArticleBody('');
    setHashtags('');
  };

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
          <TouchableOpacity onPress={resetSelection} style={styles.backBtn}>
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
          {/* Media Preview (for photo/video) */}
          {hasMedia && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedMedia[0].uri }} style={styles.preview} />
              {selectedMedia.length > 1 && (
                <View style={styles.multiMediaBadge}>
                  <Text style={styles.multiMediaText}>{selectedMedia.length} photos</Text>
                </View>
              )}
              <TouchableOpacity style={styles.changeMediaBtn} onPress={resetSelection}>
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.changeMediaText}>Changer</Text>
              </TouchableOpacity>
              {contentType === 'video' && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="videocam" size={14} color="#FFF" />
                  <Text style={styles.videoIndicatorText}>Vidéo</Text>
                </View>
              )}
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
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, selectionLimit: 5 });
                if (!result.canceled && result.assets.length > 0) {
                  setSelectedMedia(result.assets.map(a => ({ uri: a.uri, type: 'image' })));
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

        <TouchableOpacity style={styles.liveCard} onPress={() => router.push('/live/stream' as any)}>
          <View style={styles.liveIcon}>
            <Ionicons name="radio" size={28} color="#FFF" />
          </View>
          <View style={styles.liveInfo}>
            <Text style={styles.liveTitle}>Démarrer un Live</Text>
            <Text style={styles.liveSubtitle}>Diffusez en direct, le replay sera enregistré</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.liveCard, { borderLeftColor: '#FFEAA7', borderLeftWidth: 3 }]} onPress={() => router.push('/live' as any)}>
          <View style={[styles.liveIcon, { backgroundColor: '#FFEAA7' }]}>
            <Ionicons name="play-circle" size={28} color="#333" />
          </View>
          <View style={styles.liveInfo}>
            <Text style={styles.liveTitle}>Mes Lives & Replays</Text>
            <Text style={styles.liveSubtitle}>Voir, découper et republier vos lives</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

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
});
