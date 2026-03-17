import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function ArticleDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const idOrSlug = route.params?.id || route.params?.slug || '';
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(!!idOrSlug);

  useEffect(() => {
    if (!idOrSlug) { setLoading(false); return; }
    api.news.getByIdOrSlug(idOrSlug).then((res) => setArticle(res?.article || res)).catch(() => setArticle(null)).finally(() => setLoading(false));
  }, [idOrSlug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Article</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={styles.loader} />
      </SafeAreaView>
    );
  }
  if (!article) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Article</Text>
        </View>
        <Text style={styles.empty}>Article introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('News')}><Text style={styles.backBtnText}>Retour Actualites</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{article.title || 'Article'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {article.cover_url ? <Image source={{ uri: article.cover_url }} style={styles.cover} /> : null}
        <Text style={styles.body}>{article.content || article.description || article.summary || ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  loader: { marginTop: 24 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  backBtn: { marginHorizontal: 24, padding: 14, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' },
  backBtnText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 32 },
  cover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, backgroundColor: '#f3f4f6' },
  body: { fontSize: 15, color: '#374151', lineHeight: 24 },
});
