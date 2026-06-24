import React, { useState, useEffect } from 'react';
import { Alert, Modal, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import apiClient from '../api/client';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';

export function LiveViewerTipButton({
  liveId,
  disabled,
}: {
  liveId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('500');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const sendTip = async () => {
    const amount = Math.floor(Number(amountStr.replace(/\s/g, '')) || 0);
    if (amount < 100) {
      Alert.alert('Don', 'Minimum 100 FCFA.');
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/tip`, {
        amount,
        message: message.trim() || undefined,
      });
      setOpen(false);
      Alert.alert('Merci !', 'Votre don a été envoyé au créateur.');
    } catch (e: unknown) {
      Alert.alert('Don', getAlertMessageForCaughtError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, disabled && { opacity: 0.35 }]}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityLabel="Envoyer un don FCFA"
      >
        <Text style={styles.pillText}>Don FCFA</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Don direct (FCFA)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="Montant FCFA"
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, 200))}
              placeholder="Message (optionnel)"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.primary} onPress={() => void sendTip()} disabled={busy}>
              <Text style={styles.primaryText}>{busy ? '…' : 'Envoyer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function LiveCreatorSubscribeButton({
  creatorId,
  disabled,
  onSubscribedChange,
}: {
  creatorId: string;
  disabled?: boolean;
  onSubscribedChange?: (subscribed: boolean) => void;
}) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get(`/live/creator/${encodeURIComponent(creatorId)}/subscribe`);
        const d = (res.data?.data ?? res.data) as { subscribed?: boolean } | null;
        if (!cancelled && typeof d?.subscribed === 'boolean') {
          setSubscribed(d.subscribed);
          onSubscribedChange?.(d.subscribed);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorId, onSubscribedChange]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await apiClient.delete(`/live/creator/${encodeURIComponent(creatorId)}/subscribe`);
        setSubscribed(false);
        onSubscribedChange?.(false);
        Alert.alert('Abonnement', 'Abonnement don récurrent désactivé.');
      } else {
        await apiClient.post(`/live/creator/${encodeURIComponent(creatorId)}/subscribe`, {});
        setSubscribed(true);
        onSubscribedChange?.(true);
        Alert.alert('Abonnement', 'Vous soutenez ce créateur chaque mois (don récurrent).');
      }
    } catch (e: unknown) {
      Alert.alert('Abonnement', getAlertMessageForCaughtError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.pill, styles.pillSub, disabled && { opacity: 0.35 }]}
      disabled={disabled || busy}
      onPress={() => void toggle()}
      accessibilityLabel={subscribed ? 'Se désabonner du soutien mensuel' : 'Soutien mensuel créateur'}
    >
      <Text style={styles.pillText}>{subscribed ? 'Soutien actif' : 'Soutien mensuel'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.2)',
    marginLeft: 6,
  },
  pillSub: { backgroundColor: 'rgba(96,165,250,0.25)' },
  pillText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#141520',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: '800', marginBottom: Spacing.md },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: Spacing.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  primary: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
  cancel: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md, padding: Spacing.sm },
});
