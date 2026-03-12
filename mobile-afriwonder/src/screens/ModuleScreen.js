import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Écran générique pour les modules PWA portés en RN.
 * Même noms que la PWA (Marketplace, Events, Transport, etc.).
 * Le contenu sera rempli à l’identique de la PWA, module par module.
 */
export default function ModuleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { module = '', title = '' } = route.params || {};
  const displayTitle = title || module || 'Module';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          {displayTitle} — contenu identique à la PWA, à venir en React Native.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholder: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
