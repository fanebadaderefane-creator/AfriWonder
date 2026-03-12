import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { MOCK_EVENTS } from '../data/eventsMock';

export default function EventDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id || '';
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    api.events
      .getById(id)
      .then((data) => setEvent(data))
      .catch(() => setEvent(MOCK_EVENTS.find((e) => e.id === id) || null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={st.root}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.title}>Événement</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={st.loader} />
      </SafeAreaView>
    );
  }

  const ev = event || MOCK_EVENTS.find((e) => e.id === id);

  if (!ev) {
    return (
      <SafeAreaView style={st.root}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.title}>Événement</Text>
        </View>
        <Text style={st.empty}>Événement introuvable</Text>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.navigate('Events')}>
          <Text style={st.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title} numberOfLines={1}>{ev.title}</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        {ev.image ? <Image source={{ uri: ev.image }} style={st.cover} /> : null}
        <Text style={st.desc}>{ev.description || ''}</Text>
        {ev.location ? <Text style={st.meta}><Ionicons name="location-outline" size={16} /> {ev.location}</Text> : null}
        {ev.start_date ? (
          <Text style={st.meta}>
            <Ionicons name="calendar-outline" size={16} /> {new Date(ev.start_date).toLocaleString('fr-FR')}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  loader: { marginTop: 24 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  backBtn: {
    marginHorizontal: 24,
    padding: 14,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 32 },
  cover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, backgroundColor: '#f3f4f6' },
  desc: { fontSize: 15, color: '#374151', lineHeight: 24 },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 8 },
});

