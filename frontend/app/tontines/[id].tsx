/**
 * Détail d'une tontine — membres, cycles, actions (démarrer, contribuer, quitter).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import tontinesApi, { Tontine, TontineCycle, TontineMember } from '../../src/api/tontinesApi';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { useAuthStore } from '../../src/store/authStore';

const STATUS_LABEL: Record<string, string> = {
  draft: 'En préparation', active: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
};

export default function TontineDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [tontine, setTontine] = useState<Tontine | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await tontinesApi.getDetail(id);
      setTontine(detail?.tontine ?? null);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger cette tontine.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const isCreator = tontine && user && tontine.creator_id === user.id;
  const myMembership = tontine?.members?.find((m) => m.user_id === user?.id);
  const acceptedMembers = tontine?.members?.filter((m) => m.status === 'accepted') ?? [];
  const currentCycle = tontine?.cycles?.find((c) => c.status === 'collecting');

  const shareInviteCode = async () => {
    if (!tontine) return;
    const msg = `Rejoins ma tontine "${tontine.name}" sur AfriWonder.\nCode : ${tontine.invite_code}\n\nContribution : ${tontine.contribution_amount.toLocaleString('fr-FR')} FCFA / cycle\nMembres : ${tontine.max_members}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelled
    }
  };

  const handleStart = async () => {
    if (!tontine) return;
    if (acceptedMembers.length < 2) {
      Alert.alert('Pas assez de membres', 'Au moins 2 membres doivent avoir rejoint pour démarrer.');
      return;
    }
    Alert.alert(
      'Démarrer la tontine ?',
      `${acceptedMembers.length} membres vont être répartis sur ${acceptedMembers.length} cycles ${tontine.frequency === 'weekly' ? 'hebdomadaires' : tontine.frequency === 'biweekly' ? 'bi-mensuels' : 'mensuels'}. Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer',
          onPress: async () => {
            setAction(true);
            try {
              await tontinesApi.start(tontine.id);
              await load();
              Alert.alert('Tontine démarrée ✓', 'Le premier cycle est ouvert. Les membres peuvent contribuer.');
            } catch (err: unknown) {
              Alert.alert('Erreur', getAlertMessageForCaughtError(err));
            } finally {
              setAction(false);
            }
          },
        },
      ],
    );
  };

  const handleContribute = async (cycle: TontineCycle) => {
    if (!tontine) return;
    Alert.alert(
      'Confirmer la contribution',
      `Débiter ${tontine.contribution_amount.toLocaleString('fr-FR')} ${tontine.currency} de votre portefeuille pour le cycle ${cycle.cycle_number} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer',
          onPress: async () => {
            setAction(true);
            try {
              await tontinesApi.contribute(tontine.id, cycle.cycle_number);
              await load();
              Alert.alert('Paiement effectué ✓', 'Votre contribution a été enregistrée.');
            } catch (err: unknown) {
              Alert.alert('Erreur', getAlertMessageForCaughtError(err));
            } finally {
              setAction(false);
            }
          },
        },
      ],
    );
  };

  const handleLeave = async () => {
    if (!tontine) return;
    Alert.alert(
      'Quitter la tontine ?',
      'Vous pourrez la rejoindre à nouveau tant qu\'elle n\'a pas démarré.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            setAction(true);
            try {
              await tontinesApi.leave(tontine.id);
              router.back();
            } catch (err: unknown) {
              Alert.alert('Erreur', getAlertMessageForCaughtError(err));
              setAction(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!tontine) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.errorText}>Tontine introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = tontine.cycles
    ? tontine.cycles.filter((c) => c.status === 'completed').length / tontine.cycles.length
    : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tontine.name}</Text>
        <TouchableOpacity onPress={shareInviteCode} style={styles.backBtn}>
          <Ionicons name="share-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
      >
        {/* Carte statut */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Statut</Text>
            <Text style={styles.statusValue}>{STATUS_LABEL[tontine.status]}</Text>
          </View>
          {tontine.status === 'active' && tontine.cycles ? (
            <>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {tontine.cycles.filter((c) => c.status === 'completed').length} / {tontine.cycles.length} cycles terminés
              </Text>
            </>
          ) : null}
        </View>

        {/* Infos clés */}
        <View style={styles.infoGrid}>
          <InfoCell icon="cash-outline" label="Contribution" value={`${tontine.contribution_amount.toLocaleString('fr-FR')} ${tontine.currency}`} />
          <InfoCell icon="people-outline" label="Membres" value={`${acceptedMembers.length} / ${tontine.max_members}`} />
          <InfoCell icon="calendar-outline" label="Fréquence" value={tontine.frequency === 'weekly' ? 'Hebdo' : tontine.frequency === 'biweekly' ? 'Bi-mensuelle' : 'Mensuelle'} />
          <InfoCell icon="trophy-outline" label="Pot" value={`${(tontine.contribution_amount * acceptedMembers.length).toLocaleString('fr-FR')} ${tontine.currency}`} />
        </View>

        {/* Code d'invitation */}
        {tontine.status === 'draft' ? (
          <View style={styles.inviteCard}>
            <Text style={styles.inviteLabel}>Code d'invitation</Text>
            <Text style={styles.inviteCode}>{tontine.invite_code}</Text>
            <TouchableOpacity style={styles.inviteBtn} onPress={shareInviteCode}>
              <Ionicons name="share-outline" size={18} color="#FFF" />
              <Text style={styles.inviteBtnText}>Partager avec mes amis</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Membres */}
        <Text style={styles.sectionTitle}>Membres ({acceptedMembers.length})</Text>
        {tontine.members?.map((m) => <MemberRow key={m.id} member={m} isCreator={tontine.creator_id === m.user_id} />)}

        {/* Cycles */}
        {tontine.status === 'active' || tontine.status === 'completed' ? (
          <>
            <Text style={styles.sectionTitle}>Cycles</Text>
            {tontine.cycles?.map((c) => (
              <CycleRow
                key={c.id}
                cycle={c}
                tontine={tontine}
                myUserId={user?.id}
                onContribute={() => handleContribute(c)}
                disabled={action}
              />
            ))}
          </>
        ) : null}

        {/* Actions bas de page */}
        <View style={styles.actionsWrap}>
          {isCreator && tontine.status === 'draft' ? (
            <TouchableOpacity style={[styles.primaryBtn, action && styles.btnDisabled]} onPress={handleStart} disabled={action}>
              {action ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="play" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Démarrer la tontine</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {myMembership && !isCreator && tontine.status === 'draft' ? (
            <TouchableOpacity style={styles.ghostDangerBtn} onPress={handleLeave} disabled={action}>
              <Ionicons name="exit-outline" size={18} color="#FF3B30" />
              <Text style={styles.ghostDangerBtnText}>Quitter la tontine</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      {currentCycle && currentCycle.beneficiary_user_id !== user?.id ? (
        <ContributionBanner
          amount={tontine.contribution_amount}
          currency={tontine.currency}
          cycleNumber={currentCycle.cycle_number}
          beneficiary={currentCycle.beneficiary?.full_name || currentCycle.beneficiary?.username || 'un membre'}
          alreadyPaid={Boolean((currentCycle.contributions || {})[user?.id ?? '']?.paid)}
          onPress={() => handleContribute(currentCycle)}
          bottomOffset={insets.bottom + 12}
          disabled={action}
        />
      ) : null}
    </View>
  );
}

function InfoCell({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MemberRow({ member, isCreator }: { member: TontineMember; isCreator: boolean }) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberOrder}>
        <Text style={styles.memberOrderText}>{member.payout_order}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>
          {member.user?.full_name || `@${member.user?.username}`}
          {isCreator ? <Text style={styles.creatorBadge}>  · créateur</Text> : null}
        </Text>
        <Text style={styles.memberStatus}>
          {member.status === 'accepted' ? 'Membre actif' : member.status === 'invited' ? 'Invité' : 'Parti'}
        </Text>
      </View>
    </View>
  );
}

function CycleRow({
  cycle, tontine, myUserId, onContribute, disabled,
}: {
  cycle: TontineCycle; tontine: Tontine; myUserId?: string; onContribute: () => void; disabled: boolean;
}) {
  const myContrib = (cycle.contributions || {})[myUserId ?? ''];
  const paidCount = cycle.contributions ? Object.values(cycle.contributions).filter((c) => c.paid).length : 0;
  const statusLabel = cycle.status === 'collecting' ? 'En cours' : cycle.status === 'completed' ? 'Versé' : cycle.status === 'pending' ? 'En attente' : 'Retard';
  const statusColor = cycle.status === 'collecting' ? '#FFB020' : cycle.status === 'completed' ? '#4CAF50' : cycle.status === 'pending' ? Colors.textMuted : '#FF3B30';

  const isMyCycle = cycle.beneficiary_user_id === myUserId;

  return (
    <View style={styles.cycleCard}>
      <View style={styles.cycleHeaderRow}>
        <Text style={styles.cycleTitle}>Cycle {cycle.cycle_number}</Text>
        <Text style={[styles.cycleStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <Text style={styles.cycleBeneficiary}>
        Bénéficiaire : {cycle.beneficiary?.full_name || `@${cycle.beneficiary?.username}`}
        {isMyCycle ? ' (vous)' : ''}
      </Text>
      <Text style={styles.cycleInfo}>
        Pot : {cycle.total_amount.toLocaleString('fr-FR')} {tontine.currency} · Contributions : {paidCount} / {(tontine.members?.filter((m) => m.status === 'accepted').length || 0)}
      </Text>
      {cycle.status === 'collecting' && !myContrib?.paid && !isMyCycle ? (
        <TouchableOpacity style={[styles.cyclePayBtn, disabled && styles.btnDisabled]} onPress={onContribute} disabled={disabled}>
          <Ionicons name="wallet-outline" size={18} color="#FFF" />
          <Text style={styles.cyclePayText}>Contribuer {tontine.contribution_amount.toLocaleString('fr-FR')} {tontine.currency}</Text>
        </TouchableOpacity>
      ) : null}
      {myContrib?.paid ? (
        <View style={styles.paidBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.paidText}>Vous avez contribué</Text>
        </View>
      ) : null}
    </View>
  );
}

function ContributionBanner({
  amount, currency, cycleNumber, beneficiary, alreadyPaid, onPress, bottomOffset, disabled,
}: {
  amount: number; currency: string; cycleNumber: number; beneficiary: string;
  alreadyPaid: boolean; onPress: () => void; bottomOffset: number; disabled: boolean;
}) {
  if (alreadyPaid) return null;
  return (
    <TouchableOpacity
      style={[styles.stickyBanner, { bottom: bottomOffset }, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.stickyBannerTitle}>Cycle {cycleNumber} — pour {beneficiary}</Text>
        <Text style={styles.stickyBannerHint}>Contribuez maintenant</Text>
      </View>
      <Text style={styles.stickyBannerAmount}>{amount.toLocaleString('fr-FR')} {currency}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },
  errorText: { color: Colors.text, fontSize: FontSizes.md },
  btnGhost: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  btnGhostText: { color: Colors.text, fontWeight: '600' },

  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 100 },

  statusCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  statusValue: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary },
  progressText: { color: Colors.textSecondary, fontSize: FontSizes.sm },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  infoCell: {
    flexBasis: '48%',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  infoLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  infoValue: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },

  inviteCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  inviteCode: { color: Colors.primary, fontSize: 32, fontWeight: '800', letterSpacing: 4 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  inviteBtnText: { color: '#FFF', fontWeight: '700' },

  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', marginTop: Spacing.md },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  memberOrder: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  memberOrderText: { color: '#FFF', fontWeight: '800' },
  memberName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  memberStatus: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  creatorBadge: { color: Colors.primary, fontSize: FontSizes.sm },

  cycleCard: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: 4,
  },
  cycleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cycleTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  cycleStatus: { fontSize: FontSizes.sm, fontWeight: '700' },
  cycleBeneficiary: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  cycleInfo: { color: Colors.textMuted, fontSize: FontSizes.xs },
  cyclePayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  cyclePayText: { color: '#FFF', fontWeight: '700' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  paidText: { color: '#4CAF50', fontSize: FontSizes.sm, fontWeight: '600' },

  actionsWrap: { gap: Spacing.md, marginTop: Spacing.lg },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  ghostDangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#FF3B30',
  },
  ghostDangerBtnText: { color: '#FF3B30', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  stickyBanner: {
    position: 'absolute', left: Spacing.xl, right: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
    elevation: 8,
  },
  stickyBannerTitle: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  stickyBannerHint: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.sm },
  stickyBannerAmount: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.lg },
});
