import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CourseEnrollScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const title = route.params?.title || 'Formation';

  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEnroll = useCallback(async () => {
    if (saving) return;
    if (!id) {
      Alert.alert('Erreur', 'Identifiant de la formation manquant.');
      return;
    }
    setSaving(true);
    try {
      await api.courses.enroll(id, { note: note.trim() || undefined });
      Alert.alert('Inscription confirmée', 'Vous êtes inscrit à cette formation.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de vous inscrire.');
    } finally {
      setSaving(false);
    }
  }, [id, note, saving, navigation]);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#059669" />
        </TouchableOpacity>
        <Text style={st.title} numberOfLines={1}>Inscription — {title}</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Note pour l&apos;organisateur (optionnel)</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={note}
          onChangeText={setNote}
          placeholder="Présentez votre motivation, votre niveau..."
          multiline
        />
        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleEnroll} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Inscription...' : 'Confirmer l’inscription'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  btn: {
    marginTop: 24,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

