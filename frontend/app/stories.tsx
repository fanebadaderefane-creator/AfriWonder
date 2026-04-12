import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

function firstParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  return typeof v === 'string' ? v.trim() : String(v[0] || '').trim();
}

const STORIES_DATA = [
  { id: 's1', user: 'Vous', avatar: 'https://picsum.photos/60/60?random=200', isOwn: true, stories: [] },
  { id: 's2', user: 'Aminata', avatar: 'https://picsum.photos/60/60?random=201', hasNew: true, stories: [{ image: 'https://picsum.photos/400/700?random=210' }] },
  { id: 's3', user: 'Moussa', avatar: 'https://picsum.photos/60/60?random=202', hasNew: true, stories: [{ image: 'https://picsum.photos/400/700?random=211' }] },
  { id: 's4', user: 'Fanta', avatar: 'https://picsum.photos/60/60?random=203', hasNew: false, stories: [{ image: 'https://picsum.photos/400/700?random=212' }] },
  { id: 's5', user: 'Ibrahim', avatar: 'https://picsum.photos/60/60?random=204', hasNew: true, stories: [{ image: 'https://picsum.photos/400/700?random=213' }] },
];

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; userName?: string; userAvatar?: string; previewUrl?: string }>();
  const externalUserId = useMemo(() => firstParam(params.userId), [params.userId]);
  const externalName = useMemo(() => firstParam(params.userName) || 'Créateur', [params.userName]);
  const externalAvatar = useMemo(() => firstParam(params.userAvatar), [params.userAvatar]);
  const externalPreview = useMemo(() => {
    const raw = firstParam(params.previewUrl);
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.previewUrl]);

  const [viewingStory, setViewingStory] = useState<string | null>(null);
  const currentStory = STORIES_DATA.find(s => s.id === viewingStory);

  /** Ouverture depuis Moments : afficher tout de suite l’aperçu (image du moment ou avatar). */
  if (externalUserId) {
    const bgUri = externalPreview || externalAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(externalName)}&background=222&color=fff&size=512`;
    return (
      <View style={[styles.storyViewer, { paddingTop: insets.top }]}>
        <Image source={{ uri: bgUri }} style={styles.storyFullImage} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        <View style={styles.storyHeader}>
          <View style={styles.storyProgress}><View style={styles.storyProgressFill} /></View>
          <View style={styles.storyUserRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.storyBackBtn}
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Image source={{ uri: externalAvatar || bgUri }} style={styles.storyUserAvatar} />
            <Text style={styles.storyUserName}>{externalName}</Text>
            <Text style={styles.storyTime}>Moments</Text>
          </View>
        </View>
        <View style={[styles.externalCaptionWrap, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Text style={styles.externalCaption}>
            {externalPreview
              ? 'Aperçu depuis le fil Moments. Les stories dédiées arriveront ici bientôt.'
              : 'Pas d’image publique sur ce moment — profil du créateur.'}
          </Text>
        </View>
      </View>
    );
  }

  if (viewingStory && currentStory && currentStory.stories.length > 0) {
    return (
      <View style={[styles.storyViewer, { paddingTop: insets.top }]}>
        <Image source={{ uri: currentStory.stories[0].image }} style={styles.storyFullImage} />
        <View style={styles.storyHeader}>
          <View style={styles.storyProgress}><View style={styles.storyProgressFill} /></View>
          <View style={styles.storyUserRow}>
            <Image source={{ uri: currentStory.avatar }} style={styles.storyUserAvatar} />
            <Text style={styles.storyUserName}>{currentStory.user}</Text>
            <Text style={styles.storyTime}>Il y a 2h</Text>
            <TouchableOpacity onPress={() => setViewingStory(null)} style={styles.storyClose}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.storyActions, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <TouchableOpacity style={styles.storyReply}>
            <Text style={styles.storyReplyText}>Repondre...</Text>
          </TouchableOpacity>
          <TouchableOpacity><Ionicons name="heart-outline" size={28} color={Colors.text} /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="send" size={24} color={Colors.text} /></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Stories</Text>
        <TouchableOpacity><Ionicons name="camera" size={24} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Votre Story</Text>
        <TouchableOpacity style={styles.addStoryCard}>
          <View style={styles.addStoryCircle}><Ionicons name="add" size={28} color={Colors.primary} /></View>
          <View><Text style={styles.addStoryTitle}>Ajouter a votre story</Text><Text style={styles.addStorySubtitle}>Partagez un moment</Text></View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Stories recentes</Text>
        <View style={styles.storiesGrid}>
          {STORIES_DATA.filter(s => !s.isOwn).map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyCard} onPress={() => setViewingStory(story.id)}>
              <Image source={{ uri: story.stories[0]?.image || story.avatar }} style={styles.storyCardImage} />
              <View style={styles.storyCardOverlay}>
                <View style={[styles.storyCardAvatar, story.hasNew && styles.storyCardAvatarNew]}>
                  <Image source={{ uri: story.avatar }} style={styles.storyCardAvatarImg} />
                </View>
                <Text style={styles.storyCardName}>{story.user}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md, marginTop: Spacing.lg },
  addStoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md },
  addStoryCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addStoryTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  addStorySubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  storiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  storyCard: { width: (width - Spacing.xl * 2 - Spacing.md) / 2, height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  storyCardImage: { width: '100%', height: '100%' },
  storyCardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: Spacing.md, backgroundColor: 'rgba(0,0,0,0.2)' },
  storyCardAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.surface, marginBottom: 4 },
  storyCardAvatarNew: { borderColor: Colors.primary },
  storyCardAvatarImg: { width: '100%', height: '100%', borderRadius: 16 },
  storyCardName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  // Story Viewer
  storyViewer: { flex: 1, backgroundColor: '#000' },
  storyFullImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  storyHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  storyProgress: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, marginBottom: Spacing.sm },
  storyProgressFill: { width: '60%', height: '100%', backgroundColor: Colors.text, borderRadius: 1 },
  storyUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  storyUserAvatar: { width: 32, height: 32, borderRadius: 16 },
  storyUserName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  storyTime: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, flex: 1 },
  storyClose: { padding: 4 },
  storyBackBtn: { padding: 4, marginRight: 4 },
  storyActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  externalCaptionWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg },
  externalCaption: { color: 'rgba(255,255,255,0.92)', fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  storyReply: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  storyReplyText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.md },
});
