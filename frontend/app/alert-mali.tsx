import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius, FontSizes } from '../src/theme/colors';
import { goBackOrFallback } from '../src/utils/goBack';
import { MALI_EMERGENCY_CONTACTS, type MaliEmergencyContact } from '../src/emergency/maliEmergencyNumbers';

const BG = '#0a0f0c';
const HEADER_GREEN = '#0d1f14';
const CARD_TOP = '#1a2220';
const BRAND_GREEN = '#22C55E';

function EmergencyCard({ item, onRequestCall }: { item: MaliEmergencyContact; onRequestCall: (item: MaliEmergencyContact) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      onPress={() => onRequestCall(item)}
      accessibilityRole="button"
      accessibilityLabel={`Appeler ${item.name}, numéro ${item.number}`}
    >
      <View style={styles.cardTop}>
        <View style={[styles.serviceIcon, { backgroundColor: item.accentColor }]}>
          <MaterialCommunityIcons name={item.icon} size={28} color="#FFF" />
        </View>
        <View style={styles.cardCenter}>
          <Text style={[styles.categoryTag, { color: item.accentColor }]}>{item.categoryLabel}</Text>
          <Text style={styles.serviceName} numberOfLines={3}>
            {item.name}
          </Text>
        </View>
        <Text style={[styles.bigNumber, { color: item.accentColor }]}>{item.number}</Text>
      </View>
      <LinearGradient
        colors={[item.accentColor, item.accentColorEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.callBar}
        pointerEvents="none"
      >
        <View style={styles.callBarLeft}>
          <MaterialCommunityIcons name="phone" size={22} color="#FFF" />
          <Text style={styles.callBarLabel}>APPELER</Text>
        </View>
        <View style={styles.numberBadge}>
          <Text style={[styles.numberBadgeText, { color: item.accentColor }]}>{item.number}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function AlertMaliScreen() {
  const insets = useSafeAreaInsets();

  const openDialer = useCallback((number: string) => {
    const url = `tel:${number}`;
    void Linking.canOpenURL(url).then((ok) => {
      if (ok) {
        void Linking.openURL(url);
      } else {
        Alert.alert('Appel', "Impossible d'ouvrir le composeur sur cet appareil.");
      }
    });
  }, []);

  const requestCall = useCallback(
    (contact: MaliEmergencyContact) => {
      Alert.alert(
        "Confirmer l'appel",
        `Contacter ${contact.name} au ${contact.number} ?`,
        [
          { text: 'ANNULER', style: 'cancel' },
          {
            text: `APPELER · ${contact.number}`,
            onPress: () => openDialer(contact.number),
          },
        ],
        { cancelable: true }
      );
    },
    [openDialer]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => goBackOrFallback('/menu-plus')}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#E8F5E9" />
        </Pressable>
        <Text style={styles.topBarTitle}>AlertMali</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
      >
        <LinearGradient colors={[HEADER_GREEN, BG]} style={styles.heroBlock}>
          <View style={styles.heroTopRow}>
            <Text style={styles.flagEmoji} accessibilityLabel="Drapeau du Mali">
              🇲🇱
            </Text>
            <View style={styles.freePill}>
              <Text style={styles.freePillText}>GRATUIT · 24H/24 · 7J/7</Text>
            </View>
          </View>

          <View style={styles.heroTitleRow}>
            <View style={styles.heroIconCircle}>
              <MaterialCommunityIcons name="phone-alert" size={36} color="#FFF" />
            </View>
            <View style={styles.heroTitles}>
              <Text style={styles.mainTitle}>ALERTMALI</Text>
              <Text style={styles.subTitle}>Numéros d&apos;urgence · Mali</Text>
            </View>
          </View>

          <View style={styles.verifyBanner}>
            <MaterialCommunityIcons name="check-decagram" size={22} color={BRAND_GREEN} />
            <Text style={styles.verifyText}>Numéros publics · Ministère de la Sécurité et de la Protection civile</Text>
          </View>

          <Text style={styles.supportersTitle}>AVEC LE SOUTIEN DE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.supportersRow}>
            <View style={[styles.supporterCard, styles.supporterCardGreen]}>
              <MaterialCommunityIcons name="office-building" size={28} color="#FFF" />
              <Text style={styles.supporterCardText}>Ministère de la Sécurité</Text>
            </View>
            <View style={[styles.supporterCard, styles.supporterCardOutline]}>
              <View style={styles.famasCircle}>
                <MaterialCommunityIcons name="shield-crown" size={26} color={BRAND_GREEN} />
              </View>
              <Text style={styles.supporterCardTextMuted}>FAMAS</Text>
            </View>
            <View style={[styles.supporterCard, styles.supporterCardDashed]}>
              <MaterialCommunityIcons name="plus" size={28} color="rgba(255,255,255,0.35)" />
              <Text style={styles.supporterPlaceholderText}>Votre organisation</Text>
            </View>
          </ScrollView>
        </LinearGradient>

        <View style={styles.listPad}>
          {MALI_EMERGENCY_CONTACTS.map((item) => (
            <EmergencyCard key={item.id} item={item} onRequestCall={requestCall} />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerFlag}>🇲🇱</Text>
          <Text style={styles.footerBrand}>AlertMali · Numéros d&apos;urgence</Text>
          <Text style={styles.footerHint}>En cas d&apos;urgence, restez calme et décrivez clairement la situation.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
  },
  topBarTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: BRAND_GREEN },
  scrollContent: { flexGrow: 1 },
  heroBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  flagEmoji: { fontSize: 28 },
  freePill: {
    backgroundColor: 'rgba(34,197,94,0.95)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  freePillText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.3 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: { flex: 1, minWidth: 0 },
  mainTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  } as TextStyle,
  subTitle: { color: 'rgba(255,255,255,0.65)', fontSize: FontSizes.sm, marginTop: 4 },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  verifyText: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm, lineHeight: 20 },
  supportersTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  supportersRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xs },
  supporterCard: {
    width: 140,
    minHeight: 88,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  supporterCardGreen: { backgroundColor: 'rgba(34,197,94,0.35)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)' },
  supporterCardOutline: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 2,
    borderColor: BRAND_GREEN,
  },
  supporterCardDashed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  famasCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supporterCardText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '700', textAlign: 'center' },
  supporterCardTextMuted: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, fontWeight: '800' },
  supporterPlaceholderText: { color: 'rgba(255,255,255,0.4)', fontSize: FontSizes.xs, textAlign: 'center' },
  listPad: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: CARD_TOP },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  serviceIcon: { width: 52, height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardCenter: { flex: 1, minWidth: 0 },
  categoryTag: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  serviceName: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '800' },
  bigNumber: { fontSize: 28, fontWeight: '900', marginLeft: 4 },
  callBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  callBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  callBarLabel: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '900', letterSpacing: 1 },
  numberBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  numberBadgeText: { fontSize: FontSizes.md, fontWeight: '900' },
  footer: { alignItems: 'center', paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl },
  footerFlag: { fontSize: 24, marginBottom: Spacing.sm },
  footerBrand: { color: BRAND_GREEN, fontSize: FontSizes.sm, fontWeight: '800' },
  footerHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
