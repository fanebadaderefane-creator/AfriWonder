import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import propertiesApi, { Property } from '../../../src/api/propertiesApi';
import { toAbsoluteMediaUrl } from '../../../src/utils/absoluteMediaUrl';
import { useAuthStore } from '../../../src/store/authStore';
import { getDemoPropertyById, isAfriWonderDemoId } from '../../../src/demo/superAppDemoSeed';
import { appAlert } from '../../../src/utils/appAlert';
import { DemoContentBanner } from '../../../src/components/common/DemoContentBanner';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const [p, setP] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitDate, setVisitDate] = useState('');
  const [visitMsg, setVisitMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFromDemo(false);
    try {
      const prop = await propertiesApi.get(String(id));
      setP(prop);
    } catch {
      const demo = getDemoPropertyById(String(id));
      if (demo) {
        setP(demo);
        setFromDemo(true);
      } else {
        setP(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const requestVisit = async () => {
    if (isAfriWonderDemoId(String(id))) {
      appAlert('Démonstration', 'Annonce fictive : aucune demande de visite réelle.');
      return;
    }
    if (!token) {
      Alert.alert('Connexion', 'Connectez-vous pour demander une visite.');
      return;
    }
    setSending(true);
    try {
      await propertiesApi.requestVisit(String(id), visitDate.trim() || undefined, visitMsg.trim() || undefined);
      Alert.alert('Demande envoyée', 'Le propriétaire ou l’agence vous recontactera.');
      setVisitMsg('');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Demande non enregistrée.';
      Alert.alert('Erreur', msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!p) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bien</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Annonce introuvable ou non vérifiée.</Text>
        </View>
      </View>
    );
  }

  const imgs = (p.images || []).map((u) => toAbsoluteMediaUrl(u)).filter(Boolean);
  const cover = p.cover_image ? toAbsoluteMediaUrl(p.cover_image) : imgs[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {p.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {fromDemo ? <DemoContentBanner /> : null}
        {cover ? <Image source={{ uri: cover }} style={styles.hero} /> : null}
        {imgs.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {imgs.slice(0, 8).map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.thumb} />
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.price}>
          {p.price.toLocaleString('fr-FR')} {p.currency || 'FCFA'}
        </Text>
        <Text style={styles.type}>
          {p.listing_type === 'rent' ? 'Location' : p.listing_type === 'sale' ? 'Vente' : 'Terrain'}
          {p.city ? ` · ${p.city}` : ''}
        </Text>
        <Text style={styles.addr}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} /> {p.address}
        </Text>
        <View style={styles.specs}>
          {p.bedrooms != null ? <Text style={styles.spec}>{p.bedrooms} ch.</Text> : null}
          {p.bathrooms != null ? <Text style={styles.spec}>{p.bathrooms} sdb</Text> : null}
          {p.surface_m2 != null ? <Text style={styles.spec}>{p.surface_m2} m²</Text> : null}
        </View>
        {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}

        <Text style={styles.section}>Demander une visite</Text>
        <TextInput
          value={visitDate}
          onChangeText={setVisitDate}
          style={styles.input}
          placeholder="Date souhaitée (ex. 15/06/2026)"
          placeholderTextColor={Colors.textMuted}
        />
        <TextInput
          value={visitMsg}
          onChangeText={setVisitMsg}
          style={[styles.input, styles.area]}
          placeholder="Message optionnel"
          placeholderTextColor={Colors.textMuted}
          multiline
        />
        <TouchableOpacity style={styles.cta} onPress={() => void requestVisit()} disabled={sending}>
          {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>Envoyer la demande</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontWeight: '800', fontSize: FontSizes.md, textAlign: 'center' },
  body: { paddingHorizontal: Spacing.lg },
  hero: { width: '100%', height: 220, borderRadius: BorderRadius.lg, backgroundColor: Colors.card },
  thumbRow: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  thumb: { width: 72, height: 72, borderRadius: BorderRadius.sm, marginRight: Spacing.sm, backgroundColor: Colors.card },
  price: { color: Colors.primary, fontSize: FontSizes.xxl, fontWeight: '800', marginTop: Spacing.md },
  type: { color: Colors.textSecondary, marginTop: 4 },
  addr: { color: Colors.textSecondary, marginTop: Spacing.sm },
  specs: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  spec: { color: Colors.text, fontWeight: '600' },
  desc: { color: Colors.textSecondary, marginTop: Spacing.lg, lineHeight: 22 },
  section: { color: Colors.text, fontWeight: '700', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  area: { minHeight: 80, textAlignVertical: 'top' },
  cta: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  ctaText: { color: '#FFF', fontWeight: '800' },
  muted: { color: Colors.textSecondary },
});
