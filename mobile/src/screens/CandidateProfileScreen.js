import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CandidateProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cvUrl: '',
    portfolioUrl: '',
    skills: '',
    experience: '',
    education: '',
    availability: '',
    phone: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.jobs.getCandidateProfile();
        if (!mounted || !data) return;
        setForm({
          cvUrl: data.cv_url || '',
          portfolioUrl: data.portfolio_url || '',
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : data.skills || '',
          experience: data.experience || '',
          education: data.education || '',
          availability: data.availability || '',
          phone: data.phone || '',
        });
      } catch (_) {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const skillsArr =
        form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) || [];
      await api.jobs.updateCandidateProfile({
        cvUrl: form.cvUrl.trim() || undefined,
        portfolioUrl: form.portfolioUrl.trim() || undefined,
        skills: skillsArr,
        experience: form.experience.trim() || undefined,
        education: form.education.trim() || undefined,
        availability: form.availability.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      Alert.alert('Succès', 'Profil candidat mis à jour.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  }, [form, saving, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={st.root} edges={['top', 'bottom']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.title}>Profil candidat</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={st.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title}>Profil candidat</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>CV (URL)</Text>
        <TextInput
          style={st.input}
          value={form.cvUrl}
          onChangeText={(t) => setField('cvUrl', t)}
          placeholder="https://mon-cv.com/cv.pdf"
          autoCapitalize="none"
        />

        <Text style={st.label}>Portfolio (URL)</Text>
        <TextInput
          style={st.input}
          value={form.portfolioUrl}
          onChangeText={(t) => setField('portfolioUrl', t)}
          placeholder="Lien vers votre portfolio"
          autoCapitalize="none"
        />

        <Text style={st.label}>Compétences (séparées par des virgules)</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.skills}
          onChangeText={(t) => setField('skills', t)}
          placeholder="design, marketing, montage vidéo"
          multiline
        />

        <Text style={st.label}>Expérience</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.experience}
          onChangeText={(t) => setField('experience', t)}
          placeholder="Décrivez vos expériences principales"
          multiline
        />

        <Text style={st.label}>Formation</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.education}
          onChangeText={(t) => setField('education', t)}
          placeholder="Diplômes, certificats..."
          multiline
        />

        <Text style={st.label}>Disponibilité</Text>
        <TextInput
          style={st.input}
          value={form.availability}
          onChangeText={(t) => setField('availability', t)}
          placeholder="Temps plein, temps partiel..."
        />

        <Text style={st.label}>Téléphone</Text>
        <TextInput
          style={st.input}
          value={form.phone}
          onChangeText={(t) => setField('phone', t)}
          placeholder="+223..."
          keyboardType="phone-pad"
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7f0',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  loader: { marginTop: 24 },
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
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  btn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

