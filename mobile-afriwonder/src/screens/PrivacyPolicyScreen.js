import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Politique de confidentialite</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.para}>Collecte : nous collectons les informations que vous fournissez et les donnees d usage pour faire fonctionner AfriWonder.</Text>
        <Text style={styles.para}>Utilisation : vos donnees servent a personnaliser votre experience et gerer le wallet, formations et services. Nous ne vendons pas vos donnees.</Text>
        <Text style={styles.para}>Partage : donnees partagees avec des prestataires techniques sous contrat. Communication aux autorites si la loi l exige.</Text>
        <Text style={styles.para}>Securite : chiffrement et acces restreint.</Text>
        <Text style={styles.para}>Vos droits : acces, rectification, suppression. Contact : support@afriwonder.app</Text>
        <Text style={styles.para}>Derniere mise a jour : 2026.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  para: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 16 },
});
