import React from 'react';
import { Text, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';

/**
 * Family Pairing — page d'introduction.
 * Côté produit : apparier deux comptes via QR code, puis un panneau de droits
 * (`screen_time_min`, `restricted_mode`, `dm_control`) hérité par l'enfant.
 */
export default function FamilyPairingScreen() {
  return (
    <SettingsScreen title="Family Pairing">
      <View style={styles.hero}>
        <Ionicons name="people-circle" size={56} color="#FF2D55" />
        <Text style={styles.title}>Pair a parent or teen account</Text>
        <Text style={styles.subtitle}>
          Family Pairing lets a parent link their AfriWonder account to a teen’s account to enable
          well-being settings, screen time and direct message controls.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.cta}
          onPress={() => router.push('/profile-qr' as never)}
        >
          <Ionicons name="qr-code-outline" size={18} color="#FFF" />
          <Text style={styles.ctaText}>Start with a QR code</Text>
        </TouchableOpacity>
      </View>

      <SettingsSection title="Controls available after pairing">
        <SettingsRow
          variant="navigate"
          icon="hourglass-outline"
          label="Screen time"
          onPress={() => router.push('/settings/time-wellbeing' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="shield-checkmark-outline"
          label="Restricted mode"
          onPress={() => router.push('/settings/time-wellbeing' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="paper-plane-outline"
          label="Direct messages"
          onPress={() => router.push('/settings/privacy/direct-messages' as never)}
        />
      </SettingsSection>

      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          The teen account inherits these restrictions and cannot disable them while the link is
          active.
        </Text>
        <TouchableOpacity onPress={() => Alert.alert('Family Pairing', 'Pairing API coming soon.')}>
          <Text style={styles.calloutLink}>Learn more</Text>
        </TouchableOpacity>
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 16,
  },
  title: { color: '#111', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  subtitle: { color: '#5F5F5F', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 22,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  callout: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
  },
  calloutText: { color: '#5F5F5F', fontSize: 13, lineHeight: 19 },
  calloutLink: { color: '#FF2D55', fontWeight: '700', marginTop: 8, fontSize: 13 },
});
