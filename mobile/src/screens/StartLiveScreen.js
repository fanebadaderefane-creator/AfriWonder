import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Même constantes que PWA StartLive.jsx
const CATEGORIES = [
  { value: 'other', label: 'Divertissement', icon: '🎭' },
  { value: 'music', label: 'Musique', icon: '🎵' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'other', label: 'Talk Show', icon: '🎙️' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'other', label: 'Boutique', icon: '🛍️' },
  { value: 'other', label: 'Battle', icon: '⚔️' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'art', label: 'Art', icon: '🎨' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

const TITLE_MAX = 100;

export default function StartLiveScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [language, setLanguage] = useState('fr');
  const [battleMode, setBattleMode] = useState(false);
  const [shopLive, setShopLive] = useState(false);

  useEffect(() => {
    if (!user) {
      navigation.replace('Auth');
    }
  }, [user, navigation]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    navigation.navigate('LiveStream', {
      title: title.trim(),
      category,
      language,
      description: '',
      ...(battleMode && { battle: '1' }),
      ...(shopLive && { shop: '1' }),
    });
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="videocam-outline" size={20} color="#60A5FA" />
          </View>
          <Text style={styles.headerTitle}>Lancer un Live</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="sparkles" size={24} color="#93C5FD" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Prêt à diffuser ?</Text>
            <Text style={styles.heroSubtitle}>Configurez votre live et commencez</Text>
            <View style={styles.heroTags}>
              <View style={styles.heroTag}>
                <View style={styles.heroTagDot} />
                <Text style={styles.heroTagText}>Live</Text>
              </View>
              <View style={styles.heroTag}><Text style={styles.heroTagText}>Qualité HD</Text></View>
              <View style={styles.heroTag}><Text style={styles.heroTagText}>Créateur · {user?.full_name || user?.username || 'Vous'}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Titre du live <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Concert Live, Gaming Session, Talk Show..."
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
          />
          <Text style={styles.hint}>{title.length}/{TITLE_MAX} caractères</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.pickerWrap}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={`${c.value}-${c.label}`}
                style={[styles.pickerOption, category === c.value && styles.pickerOptionActive]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={[styles.pickerOptionText, category === c.value && styles.pickerOptionTextActive]}>{c.icon} {c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Langue</Text>
          <View style={styles.pickerWrap}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.value}
                style={[styles.pickerOption, language === l.value && styles.pickerOptionActive]}
                onPress={() => setLanguage(l.value)}
              >
                <Text style={[styles.pickerOptionText, language === l.value && styles.pickerOptionTextActive]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Options</Text>
          <View style={styles.optionRow}>
            <View style={styles.optionTextWrap}>
              <Ionicons name="flash" size={20} color="#60A5FA" />
              <View>
                <Text style={styles.optionTitle}>Mode Battle</Text>
                <Text style={styles.optionSubtitle}>Affronter un autre créateur</Text>
              </View>
            </View>
            <Switch value={battleMode} onValueChange={setBattleMode} trackColor={{ false: '#4B5563', true: '#2563EB' }} thumbColor="#FFF" />
          </View>
          <View style={styles.optionRow}>
            <View style={styles.optionTextWrap}>
              <Ionicons name="cart-outline" size={20} color="#60A5FA" />
              <View>
                <Text style={styles.optionTitle}>Boutique Live</Text>
                <Text style={styles.optionSubtitle}>Vendre des produits pendant le live</Text>
              </View>
            </View>
            <Switch value={shopLive} onValueChange={setShopLive} trackColor={{ false: '#4B5563', true: '#2563EB' }} thumbColor="#FFF" />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !title.trim() && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!title.trim()}
          activeOpacity={0.9}
        >
          <Ionicons name="videocam" size={22} color="#FFF" />
          <Text style={styles.submitBtnText}>Commencer le Live</Text>
        </TouchableOpacity>

        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={20} color="#60A5FA" />
          <Text style={styles.tipText}>Astuce: Assurez-vous d'avoir une bonne connexion Internet avant de démarrer votre live.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, maxWidth: 500, alignSelf: 'center', width: '100%' },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  heroIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  heroSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1F2937' },
  heroTagDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  heroTagText: { fontSize: 12, color: '#D1D5DB' },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#D1D5DB', marginBottom: 8 },
  required: { color: '#60A5FA' },
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F9FAFB',
  },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  pickerOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pickerOptionText: { fontSize: 14, color: '#9CA3AF' },
  pickerOptionTextActive: { color: '#FFF', fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(31,41,55,0.8)',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 8,
  },
  optionTextWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  optionSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  tipText: { flex: 1, fontSize: 13, color: '#D1D5DB' },
});
