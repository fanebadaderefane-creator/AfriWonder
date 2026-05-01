import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import type { AppPalette } from '../../src/theme/themePalettes';
import addressesApi, { Address, AddressInput } from '../../src/api/addressesApi';

export default function SettingsAddressesScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createAddressStyles(colors), [colors]);
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await addressesApi.list();
      setList(rows);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async () => {
    const s = street.trim();
    const c = city.trim();
    if (!s || !c) {
      Alert.alert('Adresse', 'Renseignez au moins la rue et la ville.');
      return;
    }
    setSaving(true);
    try {
      const input: AddressInput = {
        street: s,
        city: c,
        phone: phone.trim() || undefined,
        is_default: list.length === 0,
      };
      await addressesApi.create(input);
      setStreet('');
      setCity('');
      setPhone('');
      setFormOpen(false);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = (id: string) => {
    Alert.alert('Supprimer', 'Retirer cette adresse ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          void (async () => {
            try {
              await addressesApi.remove(id);
              setList((prev) => prev.filter((a) => a.id !== id));
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible.');
            }
          })(),
      },
    ]);
  };

  const onSetDefault = (id: string) =>
    void (async () => {
      try {
        await addressesApi.update(id, { is_default: true });
        await load();
      } catch (e) {
        Alert.alert('Erreur', e instanceof Error ? e.message : 'Mise à jour impossible.');
      }
    })();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes adresses</Text>
        <TouchableOpacity
          onPress={() => setFormOpen((v) => !v)}
          style={styles.backBtn}
          accessibilityLabel={formOpen ? 'Fermer le formulaire' : 'Ajouter une adresse'}
          accessibilityRole="button"
        >
          <Ionicons name={formOpen ? 'close' : 'add'} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {formOpen && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Nouvelle adresse</Text>
              <TextInput
                style={styles.input}
                placeholder="Rue, quartier"
                placeholderTextColor={colors.textSecondary}
                value={street}
                onChangeText={setStreet}
              />
              <TextInput
                style={styles.input}
                placeholder="Ville"
                placeholderTextColor={colors.textSecondary}
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={styles.input}
                placeholder="Téléphone (optionnel)"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
                onPress={() => void onAdd()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          )}

          {list.length === 0 && !formOpen ? (
            <Text style={styles.empty}>Aucune adresse enregistrée. Appuyez sur + pour en ajouter une.</Text>
          ) : null}

          {list.map((a) => (
            <View key={a.id} style={styles.card}>
              {a.is_default ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Par défaut</Text>
                </View>
              ) : null}
              <Text style={styles.line}>
                {a.street}
                {a.city ? `, ${a.city}` : ''}
              </Text>
              {a.phone ? <Text style={styles.sub}>{a.phone}</Text> : null}
              <View style={styles.rowActions}>
                {!a.is_default ? (
                  <TouchableOpacity onPress={() => onSetDefault(a.id)}>
                    <Text style={styles.link}>Définir par défaut</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => onRemove(a.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function createAddressStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
    },
    backBtn: {
      minWidth: MIN_TOUCH_TARGET,
      minHeight: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: colors.text, flex: 1, textAlign: 'center' },
    scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { color: colors.textSecondary, fontSize: FontSizes.md, marginTop: Spacing.lg },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    formTitle: { fontSize: FontSizes.md, fontWeight: '600', color: colors.text, marginBottom: Spacing.xs },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      color: colors.text,
      fontSize: FontSizes.md,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: FontSizes.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    badge: { alignSelf: 'flex-start', backgroundColor: colors.primary + '33', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: Spacing.sm },
    badgeText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    line: { color: colors.text, fontSize: FontSizes.md },
    sub: { color: colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
    rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
    link: { color: colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
    deleteBtn: { padding: Spacing.xs },
  });
}
