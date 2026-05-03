import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import newsApi, { NewsArticle } from '../../src/api/newsApi';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';
import { getDemoNewsArticleById, isAfriWonderDemoId } from '../../src/demo/superAppDemoSeed';
import { DemoContentBanner } from '../../src/components/common/DemoContentBanner';

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function formatPublished(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ArticleDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liking, setLiking] = useState(false);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!articleId) {
      setError('Article introuvable.');
      setLoading(false);
      return;
    }
    setError(null);
    setFromDemo(false);
    try {
      const a = await newsApi.get(articleId);
      setArticle(a);
    } catch (err) {
      const demo = getDemoNewsArticleById(articleId);
      if (demo) {
        setArticle(demo);
        setFromDemo(true);
      } else {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || (err as { message?: string })?.message
          || 'Impossible de charger cet article.';
        setError(msg);
        setArticle(null);
      }
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const heroUri = toAbsoluteMediaUrl(
    (article?.image_url || article?.cover_image || '').trim()
  );

  const authorAvatar = toAbsoluteMediaUrl(
    (article?.author?.avatar || '').trim()
  );

  const bodyText = stripHtml(article?.content || article?.summary || '');

  const onShare = async () => {
    if (!article?.title) return;
    try {
      await Share.share({ message: `${article.title}\n\n${article.summary || ''}`.trim() });
    } catch {
      /* annulé */
    }
  };

  const onLike = async () => {
    if (!articleId) return;
    if (isAfriWonderDemoId(articleId)) {
      Alert.alert('Démonstration', 'Article fictif : pas d’enregistrement de réaction.');
      return;
    }
    setLiking(true);
    try {
      await newsApi.like(articleId);
      Alert.alert('Merci', 'Réaction enregistrée.');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Connexion requise ou action impossible.';
      Alert.alert('Like', msg);
    } finally {
      setLiking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Article introuvable.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sourceLabel = article.source_name?.trim() || 'AfriWonder';
  const authorName = article.author?.display_name?.trim() || article.author?.username?.trim() || 'Rédaction';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => void onLike()} disabled={liking}>
            <Ionicons name="heart-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void onShare()}>
            <Ionicons name="share-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView key={articleId} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {fromDemo ? <DemoContentBanner /> : null}
        <ImageOrPlaceholder uri={heroUri} style={styles.heroImage} icon="newspaper-outline" iconSize={48} />
        <View style={styles.meta}>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>{sourceLabel}</Text>
          </View>
          {article.category ? (
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{article.category}</Text>
            </View>
          ) : null}
        </View>
        {formatPublished(article.published_at || article.created_at) ? (
          <Text style={styles.date}>
            {formatPublished(article.published_at || article.created_at)}
          </Text>
        ) : null}
        <Text style={styles.title}>{article.title}</Text>
        <View style={styles.authorRow}>
          <ImageOrPlaceholder uri={authorAvatar} style={styles.authorAvatar} icon="person" iconSize={22} />
          <View>
            <Text style={styles.authorName}>{authorName}</Text>
            {article.country ? (
              <Text style={styles.authorRole}>{article.country}</Text>
            ) : null}
          </View>
        </View>
        {!bodyText ? (
          <Text style={styles.paragraph}>Contenu indisponible pour cet article.</Text>
        ) : (
          bodyText.split('\n\n').map((block, i) => (
            <Text key={i} style={styles.paragraph}>
              {block.trim()}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryBtnText: { color: Colors.text, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  content: { paddingBottom: Spacing.xxxl },
  heroImage: { width: '100%', height: 220, marginBottom: Spacing.lg },
  meta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  sourceBadge: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  sourceText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  catBadge: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  catText: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: '600' },
  date: { color: Colors.textSecondary, fontSize: FontSizes.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, lineHeight: 28 },
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.xxl },
  authorAvatar: { width: 40, height: 40, borderRadius: 20 },
  authorName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  authorRole: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  paragraph: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 24, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
});
