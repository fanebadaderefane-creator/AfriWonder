import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';

export function LiveCoHostInviteModal({
  visible,
  busy,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Invitation co-host</Text>
          <Text style={styles.body}>
            Le créateur vous invite à monter à l’antenne (caméra + micro). Acceptez pour apparaître en grille live.
          </Text>
          <TouchableOpacity style={styles.primary} onPress={onAccept} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Accepter et activer ma caméra</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={onDecline} disabled={busy}>
            <Text style={styles.secondaryText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: '#141520',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: '800' },
  body: { color: 'rgba(255,255,255,0.75)', marginTop: Spacing.sm, fontSize: FontSizes.md },
  primary: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
  secondary: { marginTop: Spacing.sm, padding: Spacing.sm, alignItems: 'center' },
  secondaryText: { color: Colors.textSecondary },
});
