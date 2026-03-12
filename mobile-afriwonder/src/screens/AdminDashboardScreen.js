import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#ca8a04" />
        </TouchableOpacity>
        <Text style={st.title}>Admin AfriWonder</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.text}>
          Espace réservé à l&apos;équipe AfriWonder pour la modération et le pilotage de la plateforme.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fefce8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  title: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: '#9a3412' },
  content: { padding: 16, paddingBottom: 32 },
  text: { fontSize: 14, color: '#78350f', lineHeight: 20 },
});

