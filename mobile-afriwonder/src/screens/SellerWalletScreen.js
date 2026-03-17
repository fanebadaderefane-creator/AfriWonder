import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SellerWalletScreen({ navigation }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    method: 'orange_money',
    recipient: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const wallets = await api.entities.SellerWallet.filter(
          { seller_id: user.id },
        );
        let w =
          Array.isArray(wallets) && wallets.length > 0
            ? wallets[0]
            : null;
        if (!w) {
          w = await api.entities.SellerWallet.create({
            seller_id: user.id,
            balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
          });
        }
        const ps =
          (await api.entities.Payout.filter(
            { seller_id: user.id },
            '-created_date',
            50,
          )) || [];
        const txs =
          (await api.payments.getTransactions(
            { user_id: user.id },
            '-created_date',
            100,
          )) || [];
        if (!cancelled) {
          setWallet(w);
          setPayouts(Array.isArray(ps) ? ps : []);
          setTransactions(Array.isArray(txs) ? txs : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const submitWithdraw = async () => {
    if (!wallet || withdrawing) return;
    const amount = parseFloat(withdrawData.amount);
    if (!amount || amount < 1000) return;
    if (amount > (wallet.balance || 0)) return;
    setWithdrawing(true);
    try {
      await api.entities.Payout.create({
        seller_id: user.id,
        amount,
        method: withdrawData.method,
        recipient_details: withdrawData.recipient,
        status: 'pending',
      });
      await api.entities.SellerWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - amount,
        total_withdrawn: (wallet.total_withdrawn || 0) + amount,
      });
      setWithdrawVisible(false);
      setWithdrawData({
        amount: '',
        method: 'orange_money',
        recipient: '',
      });
      const ps =
        (await api.entities.Payout.filter(
          { seller_id: user.id },
          '-created_date',
          50,
        )) || [];
      setPayouts(Array.isArray(ps) ? ps : []);
      setWallet((w) =>
        w
          ? {
              ...w,
              balance: (w.balance || 0) - amount,
              total_withdrawn:
                (w.total_withdrawn || 0) + amount,
            }
          : w,
      );
    } finally {
      setWithdrawing(false);
    }
  };

  if (!user || loading || !wallet) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#22c55e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Wallet vendeur
          </Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Solde disponible
          </Text>
          <Text style={styles.balanceValue}>
            {(wallet.balance || 0).toLocaleString('fr-FR')}{' '}
            FCFA
          </Text>
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              (wallet.balance || 0) < 1000 &&
                styles.withdrawBtnDisabled,
            ]}
            disabled={(wallet.balance || 0) < 1000}
            onPress={() => setWithdrawVisible(true)}
          >
            <Ionicons
              name="download-outline"
              size={18}
              color="#16a34a"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.withdrawText}>
              Retirer
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons
              name="time-outline"
              size={18}
              color="#3b82f6"
            />
            <Text style={styles.statLabel}>En attente</Text>
            <Text style={styles.statValue}>
              {(wallet.pending_balance || 0).toLocaleString(
                'fr-FR',
              )}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name="trending-up-outline"
              size={18}
              color="#22c55e"
            />
            <Text style={styles.statLabel}>Total gagné</Text>
            <Text style={styles.statValue}>
              {(wallet.total_earned || 0).toLocaleString(
                'fr-FR',
              )}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={18}
              color="#0ea5e9"
            />
            <Text style={styles.statLabel}>Retiré</Text>
            <Text style={styles.statValue}>
              {(wallet.total_withdrawn || 0).toLocaleString(
                'fr-FR',
              )}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Historique des retraits
          </Text>
          {payouts.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucun retrait
            </Text>
          ) : (
            payouts.map((p) => (
              <View key={p.id} style={styles.payoutRow}>
                <View>
                  <Text style={styles.payoutAmount}>
                    {p.amount.toLocaleString('fr-FR')} FCFA
                  </Text>
                  <Text style={styles.payoutMeta}>
                    {p.method}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    p.status === 'completed'
                      ? styles.statusBadgeSuccess
                      : p.status === 'failed'
                      ? styles.statusBadgeError
                      : styles.statusBadgeInfo,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {p.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Transactions récentes
          </Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune transaction
            </Text>
          ) : (
            <FlatList
              data={transactions.slice(0, 10)}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.txRow}>
                  <View>
                    <Text style={styles.txTitle}>
                      {item._description || item.type}
                    </Text>
                    <Text style={styles.txMeta}>
                      {new Date(
                        item.created_date,
                      ).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      item.type === 'sale'
                        ? styles.txAmountPlus
                        : styles.txAmountMinus,
                    ]}
                  >
                    {item.type === 'sale' ? '+' : '-'}
                    {item.amount.toLocaleString('fr-FR')}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {withdrawVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Retirer des fonds
              </Text>
              <TouchableOpacity
                onPress={() => setWithdrawVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>
                  Montant (min. 1000 FCFA)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  style={styles.input}
                  value={withdrawData.amount}
                  onChangeText={(v) =>
                    setWithdrawData((d) => ({
                      ...d,
                      amount: v,
                    }))
                  }
                  placeholder="10000"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Méthode</Text>
                <View style={styles.methodRow}>
                  {[
                    ['orange_money', 'Orange Money'],
                    ['wave', 'Wave'],
                    ['mtn_money', 'MTN Money'],
                    ['bank_transfer', 'Virement'],
                  ].map(([val, label]) => {
                    const active =
                      withdrawData.method === val;
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.methodChip,
                          active && styles.methodChipActive,
                        ]}
                        onPress={() =>
                          setWithdrawData((d) => ({
                            ...d,
                            method: val,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            active &&
                              styles.methodChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>
                  {withdrawData.method === 'bank_transfer'
                    ? 'IBAN'
                    : 'Numéro'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={withdrawData.recipient}
                  onChangeText={(v) =>
                    setWithdrawData((d) => ({
                      ...d,
                      recipient: v,
                    }))
                  }
                  placeholder={
                    withdrawData.method === 'bank_transfer'
                      ? 'SN00...'
                      : '77 123 45 67'
                  }
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.modalPrimary,
                (withdrawing ||
                  !withdrawData.amount ||
                  parseFloat(withdrawData.amount) < 1000 ||
                  parseFloat(withdrawData.amount) >
                    (wallet.balance || 0)) &&
                  styles.modalPrimaryDisabled,
              ]}
              disabled={
                withdrawing ||
                !withdrawData.amount ||
                parseFloat(withdrawData.amount) < 1000 ||
                parseFloat(withdrawData.amount) >
                  (wallet.balance || 0)
              }
              onPress={submitWithdraw}
            >
              {withdrawing ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />
              ) : (
                <Text style={styles.modalPrimaryText}>
                  Confirmer le retrait
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.modalHint}>
              Les retraits sont traités sous 24-48h.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#16a34a',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  withdrawBtn: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  withdrawBtnDisabled: {
    opacity: 0.5,
  },
  withdrawText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  statValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  payoutMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeError: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeInfo: {
    backgroundColor: '#dbeafe',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#111827',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  txTitle: {
    fontSize: 13,
    color: '#111827',
  },
  txMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  txAmountPlus: {
    color: '#16a34a',
  },
  txAmountMinus: {
    color: '#b91c1c',
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalField: {
    marginTop: 8,
  },
  modalLabel: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  methodChipActive: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  methodChipText: {
    fontSize: 12,
    color: '#374151',
  },
  methodChipTextActive: {
    fontWeight: '600',
    color: '#166534',
  },
  modalPrimary: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryDisabled: {
    opacity: 0.7,
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
});

