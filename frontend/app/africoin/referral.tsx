import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';

const CODE = 'AFRICOIN';

export default function AfricoinReferralScreen() {
  const insets = useSafeAreaInsets();

  const copy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(CODE);
      Alert.alert('Copié', 'Lien / code copié dans le presse-papiers.');
    } catch {
      Alert.alert('Erreur', 'Impossible de copier.');
    }
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parrainage</Text>
        <TouchableOpacity onPress={() => router.push('/africoin/cashback' as never)} style={styles.iconBtn} accessibilityLabel="Cash back">
          <Ionicons name="document-text-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>
          Invite tes ami(e)s et obtiens jusqu&apos;à <Text style={styles.pink}>3 % de cash back</Text> sur leurs achats de
          Pièces
        </Text>

        <View style={styles.codeBox}>
          <Text style={styles.code}>{CODE}</Text>
          <TouchableOpacity onPress={() => void copy()} style={styles.copyPill}>
            <Text style={styles.copyText}>Copier</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.inviteBtn} onPress={() => Alert.alert('Inviter', 'Partage le code depuis ton téléphone (à brancher sur Share API).')}>
          <Text style={styles.inviteBtnText}>Inviter maintenant</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={22} color="#111" />
            <Text style={styles.statLabel}>Cash back total</Text>
            <Text style={styles.statVal}>USD 0.00</Text>
          </View>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/africoin/referral-friends' as never)} activeOpacity={0.9}>
            <Ionicons name="person-add-outline" size={22} color="#111" />
            <Text style={styles.statLabel}>Ami(e)s ayant rechargé</Text>
            <Text style={styles.statVal}>0</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.h2}>Comment ça marche</Text>
        {[
          'Invite tes ami(e)s à recharger depuis AfriWonder avec ton code.',
          'Obtiens jusqu’à 3 % de cash back sur leurs achats de Pièces.',
          'Tes ami(e)s reçoivent des coupons cash back (ex. 5 % sur une commande).',
          'Ils peuvent aussi recharger pour débloquer des cadeaux spéciaux.',
        ].map((t, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{t}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: FontSizes.lg, color: '#111' },
  body: { padding: Spacing.lg, paddingBottom: 40 },
  headline: { fontSize: 20, fontWeight: '900', color: '#111', lineHeight: 26, marginBottom: 16 },
  pink: { color: '#fe2c55' },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  code: { flex: 1, fontFamily: 'monospace', fontWeight: '900', fontSize: 18, color: '#111' },
  copyPill: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fe2c55' },
  copyText: { color: '#fe2c55', fontWeight: '800' },
  inviteBtn: { backgroundColor: '#fe2c55', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 18 },
  inviteBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, gap: 6 },
  statLabel: { fontSize: 12, color: '#555', fontWeight: '700' },
  statVal: { fontSize: 16, fontWeight: '900', color: '#111' },
  h2: { fontWeight: '900', fontSize: 16, marginBottom: 10, color: '#111' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },
});
