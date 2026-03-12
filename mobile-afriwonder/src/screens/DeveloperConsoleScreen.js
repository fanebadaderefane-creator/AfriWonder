import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function DeveloperConsoleScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title}>Console développeur</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.subtitle}>Mini-Apps AfriWonder</Text>
        <Text style={st.text}>
          Cette console permettra aux développeurs de gérer leurs mini-apps, clés API et webhooks directement depuis
          l&apos;app mobile.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  subtitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 },
  text: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
});

