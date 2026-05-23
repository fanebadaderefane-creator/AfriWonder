import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Language, LANGUAGE_META } from '../../src/i18n/translations';

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = async (lang: Language) => {
    await setLanguage(lang);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.chooseLanguage')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Choisissez votre langue preferee</Text>

        {(Object.keys(LANGUAGE_META) as Language[]).map((lang) => {
          const meta = LANGUAGE_META[lang];
          const isSelected = language === lang;

          return (
            <TouchableOpacity
              key={lang}
              style={[styles.langCard, isSelected && styles.langCardSelected]}
              onPress={() => handleSelect(lang)}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>{meta.flag}</Text>
              <View style={styles.langInfo}>
                <Text style={styles.langName}>{meta.name}</Text>
                <Text style={styles.langNative}>{meta.nativeName}</Text>
              </View>
              {isSelected ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                </View>
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#888" />
          <Text style={styles.infoText}>
            Langues : FR, EN, AR (RTL), Wolof, Bambara, Swahili, Hausa. Les variantes communautaires évoluent — votre aide est la bienvenue.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#222',
    gap: 14,
  },
  langCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  langFlag: { fontSize: 32 },
  langInfo: { flex: 1 },
  langName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  langNative: { color: '#888', fontSize: 13, marginTop: 2 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  infoText: { flex: 1, color: '#888', fontSize: 13, lineHeight: 18 },
});
