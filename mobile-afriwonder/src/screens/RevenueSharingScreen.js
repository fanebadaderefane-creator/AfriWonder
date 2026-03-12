import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function RevenueSharingScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <Ionicons name="arrow-back" size={24} color="#2563eb" onPress={() => navigation.goBack()} />
        <Text style={st.title}>Partage de revenus</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.text}>
          Ici, vous pourrez configurer le partage des revenus entre collaborateurs, co-créateurs et partenaires. Cette
          vue est une première version en lecture seule.
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
  title: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: '#111' },
  content: { padding: 16, paddingBottom: 32 },
  text: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
});

