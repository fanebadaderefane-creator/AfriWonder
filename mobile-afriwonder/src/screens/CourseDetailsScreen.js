import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { MOCK_FORMATIONS } from '../data/formationsMock';

export default function CourseDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id || '';
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.courses.getById(id).then(setCourse).catch(() => setCourse(MOCK_FORMATIONS.find((f) => f.id === id) || null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Formation</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={styles.loader} />
      </SafeAreaView>
    );
  }
  if (!course) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Formation</Text>
        </View>
        <Text style={styles.empty}>Formation introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Courses')}><Text style={styles.backBtnText}>Retour</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const title = course.title || course.name;
  const price = course.is_free ? 'Gratuit' : (course.price ? String(course.price) + ' FCFA' : '');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {course.cover_url ? <Image source={{ uri: course.cover_url }} style={styles.cover} /> : null}
        <Text style={styles.desc}>{course.description || ''}</Text>
        <Text style={styles.meta}>{course.duration || ''} - {course.total_enrollments || 0} inscrits</Text>
        <Text style={styles.price}>{price}</Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('CourseEnroll', { id, title })}>
          <Text style={styles.ctaText}>S inscrire</Text>
        </TouchableOpacity>
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
  desc: { fontSize: 15, color: '#374151', lineHeight: 24 },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  price: { fontSize: 18, fontWeight: '700', color: '#059669', marginTop: 12 },
  cta: { marginTop: 20, padding: 16, backgroundColor: '#059669', borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
