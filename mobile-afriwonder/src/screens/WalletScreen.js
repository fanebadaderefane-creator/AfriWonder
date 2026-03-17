import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function WalletScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [walletSecurity, setWalletSecurity] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [virtualCards, setVirtualCards] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [preauths, setPreauths] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('coins'); // 'coins' | 'history' | 'virtual-cards' | 'transfers'

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawPending, setWithdrawPending] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    method: 'orange_money',
    orange_money_phone: '',
    paypal_email: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    pin: '',
  });

  const needsPin =
    walletSecurity?.has_pin && walletSecurity?.two_fa_required_for_withdrawal;

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletData, security, tx, wd, vc, tf, pa] = await Promise.all([
        api.payments.getWallet(),
        api.payments.getWalletSecurity().catch(() => null),
        api.payments
          .getTransactions({ page: 1, limit: 20 })
          .catch(() => ({ transactions: [] })),
        api.withdrawals.list({ page: 1, limit: 20 }).catch(() => ({ withdrawals: [] })),
        api.me.getVirtualCards().catch(() => []),
        api.me
          .getInternationalTransfers({ page: 1, limit: 20 })
          .catch(() => ({ items: [] })),
        api.me.getPreauths({ page: 1, limit: 20 }).catch(() => ({ items: [] })),
      ]);
      setWallet(walletData);
      setWalletSecurity(security);
      const txList = Array.isArray(tx?.transactions)
        ? tx.transactions
        : Array.isArray(tx)
        ? tx
        : [];
      setTransactions(txList);
      const wdList =
        wd?.withdrawals ?? wd?.data ?? (Array.isArray(wd) ? wd : []) ?? [];
      setWithdrawals(wdList);
      setVirtualCards(Array.isArray(vc) ? vc : vc ?? []);
      setTransfers(tf?.items ?? []);
      setPreauths(pa?.items ?? []);
    } catch (e) {
      setError(e?.message || 'Impossible de charger le portefeuille');
      setWallet(null);
      setWalletSecurity(null);
      setTransactions([]);
      setWithdrawals([]);
      setVirtualCards([]);
      setTransfers([]);
      setPreauths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (!user) {
    return null;
  }

  const totalSpent = useMemo(
    () =>
      (transactions || []).reduce(
        (s, tx) =>
          s +
          (tx.type === 'withdrawal' || tx.type === 'payment'
            ? Number(tx.amount || 0)
            : 0),
        0,
      ),
    [transactions],
  );

  const totalEarned = useMemo(
    () =>
      (transactions || []).reduce(
        (s, tx) =>
          s +
          (tx.type === 'deposit' || tx.type === 'earning'
            ? Number(tx.amount || 0)
            : 0),
        0,
      ),
    [transactions],
  );

  const handleConfirmWithdraw = useCallback(async () => {
    if (withdrawPending) return;
    try {
      const amount = parseFloat(withdrawData.amount);
      if (!amount || amount <= 0) {
        throw new Error('Montant invalide');
      }
      if (wallet && Number(wallet?.available_balance ?? wallet?.balance ?? 0) < amount) {
        throw new Error('Solde insuffisant');
      }
      const pinOpt = needsPin ? { pin: withdrawData.pin } : {};
      if (
        ['orange_money', 'mtn_money', 'wave'].includes(withdrawData.method)
      ) {
        const phone =
          withdrawData.orange_money_phone?.trim() || withdrawData.phone?.trim();
        if (!phone) {
          throw new Error('Numéro de téléphone requis');
        }
        if (amount < 5000) {
          throw new Error('Montant minimum: 5 000 FCFA');
        }
        if (needsPin && !withdrawData.pin) {
          throw new Error('PIN wallet requis pour ce retrait');
        }
        await api.withdrawals.request(amount, phone, {
          ...pinOpt,
          payment_method: withdrawData.method,
        });
      } else if (withdrawData.method === 'paypal') {
        const email = withdrawData.paypal_email?.trim();
        if (!email) {
          throw new Error('Email PayPal requis');
        }
        if (amount < 5000) {
          throw new Error('Montant minimum: 5 000 FCFA');
        }
        if (needsPin && !withdrawData.pin) {
          throw new Error('PIN wallet requis pour ce retrait');
        }
        await api.withdrawals.request(amount, null, {
          ...pinOpt,
          payment_method: 'paypal',
          paypal_email: email,
        });
      } else {
        if (needsPin && !withdrawData.pin) {
          throw new Error('PIN wallet requis pour ce retrait');
        }
        await api.payments.withdrawFromWallet(
          amount,
          `Retrait ${withdrawData.method} - ${
            withdrawData.account_holder || ''
          }`,
          pinOpt,
        );
      }
      await loadWallet();
      setWithdrawModalOpen(false);
      setWithdrawData({
        amount: '',
        method: 'orange_money',
        orange_money_phone: '',
        paypal_email: '',
        bank_name: '',
        account_number: '',
        account_holder: '',
        pin: '',
      });
    } catch (e) {
      setError(e?.message || 'Erreur lors du retrait');
    } finally {
      setWithdrawPending(false);
    }
  }, [withdrawData, withdrawPending, needsPin, wallet, loadWallet]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portefeuille</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="wallet-outline" size={48} color="#6B7280" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadWallet}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceValue}>
              {Number(
                wallet?.available_balance ?? wallet?.balance ?? 0,
              ).toLocaleString('fr-FR')}{' '}
              FCFA
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total dépensé</Text>
                <Text style={styles.balanceStatValue}>
                  {totalSpent.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total gagné</Text>
                <Text style={styles.balanceStatValue}>
                  {Number(
                    wallet?.total_earnings ?? totalEarned ?? 0,
                  ).toLocaleString('fr-FR')}{' '}
                  FCFA
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tabsRow}>
            <TabButton label="Coins" active={tab === 'coins'} onPress={() => setTab('coins')} icon="logo-usd" />
            <TabButton label="Historique" active={tab === 'history'} onPress={() => setTab('history')} icon="time-outline" />
            <TabButton label="Cartes" active={tab === 'virtual-cards'} onPress={() => setTab('virtual-cards')} icon="card-outline" />
            <TabButton label="Transferts" active={tab === 'transfers'} onPress={() => setTab('transfers')} icon="send-outline" />
          </View>

          {tab === 'coins' && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Recharger depuis le web</Text>
              <Text style={styles.tipText}>
                Les packs de coins sont disponibles dans la version PWA. Cette section mobile
                sera étendue pour permettre la recharge directement depuis l’app.
              </Text>
            </View>
          )}

          {tab === 'history' && (
            <View style={{ marginTop: 12 }}>
              {transactions.length === 0 ? (
                <Text style={styles.emptyText}>Aucune transaction</Text>
              ) : (
                transactions.map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.txIcon,
                          (tx.type === 'deposit' || tx.type === 'earning') && styles.txIconIn,
                        ]}
                      >
                        <Text style={styles.txIconText}>
                          {tx.type === 'deposit' || tx.type === 'earning' ? '↓' : '↑'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.txTitle}>
                          {tx.description ||
                            (tx.type === 'deposit' ? 'Achat de coins' : tx.type)}
                        </Text>
                        <Text style={styles.txDate}>
                          {tx.created_at || tx.created_date
                            ? new Date(
                                tx.created_at || tx.created_date,
                              ).toLocaleDateString('fr-FR')
                            : ''}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        (tx.type === 'deposit' || tx.type === 'earning') &&
                          styles.txAmountIn,
                      ]}
                    >
                      {(tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-') +
                        Number(tx.amount || 0).toLocaleString('fr-FR')}{' '}
                      FCFA
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'virtual-cards' && (
            <WalletVirtualCardsSection
              cards={virtualCards}
              onRefresh={loadWallet}
            />
          )}

          {tab === 'transfers' && (
            <WalletTransfersSection
              transfers={transfers}
              preauths={preauths}
            />
          )}

          {Number(wallet?.available_balance ?? wallet?.balance ?? 0) > 0 && (
            <View style={{ marginTop: 24 }}>
              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => setWithdrawModalOpen(true)}
              >
                <Text style={styles.withdrawBtnText}>Demander un retrait</Text>
              </TouchableOpacity>
            </View>
          )}

          {withdrawModalOpen && (
            <View style={styles.withdrawCard}>
              <Text style={styles.withdrawTitle}>Retrait de fonds</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Montant</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Montant en FCFA"
                  value={withdrawData.amount}
                  onChangeText={(text) =>
                    setWithdrawData((p) => ({ ...p, amount: text }))
                  }
                />
                <Text style={styles.helperText}>
                  Max:{' '}
                  {Number(
                    wallet?.available_balance ?? wallet?.balance ?? 0,
                  ).toLocaleString('fr-FR')}{' '}
                  XOF
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Méthode de retrait</Text>
                <View style={styles.methodRow}>
                  {['orange_money', 'mtn_money', 'wave', 'paypal', 'bank_transfer'].map(
                    (m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.methodChip,
                          withdrawData.method === m && styles.methodChipActive,
                        ]}
                        onPress={() =>
                          setWithdrawData((p) => ({ ...p, method: m }))
                        }
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            withdrawData.method === m && styles.methodChipTextActive,
                          ]}
                        >
                          {m === 'orange_money'
                            ? 'Orange'
                            : m === 'mtn_money'
                            ? 'MTN'
                            : m === 'wave'
                            ? 'Wave'
                            : m === 'paypal'
                            ? 'PayPal'
                            : 'Virement'}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              {['orange_money', 'mtn_money', 'wave'].includes(
                withdrawData.method,
              ) && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    Numéro{' '}
                    {withdrawData.method === 'orange_money'
                      ? 'Orange Money'
                      : withdrawData.method === 'mtn_money'
                      ? 'MTN Money'
                      : 'Wave'}{' '}
                    *
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="77 12 34 56 78 ou 76 12 34 56 78"
                    value={withdrawData.orange_money_phone}
                    onChangeText={(text) =>
                      setWithdrawData((p) => ({
                        ...p,
                        orange_money_phone: text,
                      }))
                    }
                  />
                  <Text style={styles.helperText}>
                    Min. 5 000 FCFA • Délai 2-7 jours
                  </Text>
                </View>
              )}

              {withdrawData.method === 'paypal' && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email PayPal *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="votre@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={withdrawData.paypal_email}
                    onChangeText={(text) =>
                      setWithdrawData((p) => ({ ...p, paypal_email: text }))
                    }
                  />
                  <Text style={styles.helperText}>
                    Min. 5 000 FCFA • Conversion XOF→USD
                  </Text>
                </View>
              )}

              {withdrawData.method === 'bank_transfer' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Nom de la banque</Text>
                    <TextInput
                      style={styles.input}
                      value={withdrawData.bank_name}
                      onChangeText={(text) =>
                        setWithdrawData((p) => ({ ...p, bank_name: text }))
                      }
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Numéro de compte</Text>
                    <TextInput
                      style={styles.input}
                      value={withdrawData.account_number}
                      onChangeText={(text) =>
                        setWithdrawData((p) => ({ ...p, account_number: text }))
                      }
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Titulaire du compte</Text>
                    <TextInput
                      style={styles.input}
                      value={withdrawData.account_holder}
                      onChangeText={(text) =>
                        setWithdrawData((p) => ({ ...p, account_holder: text }))
                      }
                    />
                  </View>
                </>
              )}

              {needsPin && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PIN wallet *</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={8}
                    value={withdrawData.pin}
                    onChangeText={(text) =>
                      setWithdrawData((p) => ({
                        ...p,
                        pin: text.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="4 à 8 chiffres"
                  />
                </View>
              )}

              <View style={styles.withdrawActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, withdrawPending && { opacity: 0.6 }]}
                  onPress={handleConfirmWithdraw}
                  disabled={
                    withdrawPending ||
                    !withdrawData.amount ||
                    (['orange_money', 'mtn_money', 'wave'].includes(
                      withdrawData.method,
                    ) &&
                      !withdrawData.orange_money_phone?.trim()) ||
                    (withdrawData.method === 'paypal' &&
                      !withdrawData.paypal_email?.trim()) ||
                    (needsPin && !withdrawData.pin) ||
                    parseFloat(withdrawData.amount || '0') < 5000
                  }
                >
                  {withdrawPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setWithdrawModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress, icon }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? '#EEF2FF' : '#9CA3AF'}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function WalletVirtualCardsSection({ cards, onRefresh }) {
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      await api.me.createVirtualCard({});
      await onRefresh();
    } finally {
      setCreating(false);
    }
  }, [creating, onRefresh]);

  const handleRevoke = useCallback(
    async (id) => {
      if (revokingId) return;
      setRevokingId(id);
      try {
        await api.me.revokeVirtualCard(id);
        await onRefresh();
      } finally {
        setRevokingId(null);
      }
    },
    [revokingId, onRefresh],
  );

  const formatExpiry = (d) =>
    d
      ? new Date(d).toLocaleDateString('fr-FR', {
          month: '2-digit',
          year: '2-digit',
        })
      : '';

  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Mes cartes virtuelles</Text>
        <TouchableOpacity
          style={styles.smallPrimaryBtn}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.smallPrimaryBtnText}>Nouvelle carte</Text>
          )}
        </TouchableOpacity>
      </View>
      {!cards || cards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={32} color="#6B7280" />
          <Text style={styles.emptyText}>
            Aucune carte. Appuyez sur « Nouvelle carte » pour en générer une.
          </Text>
        </View>
      ) : (
        cards.map((card) => (
          <View key={card.id} style={styles.virtualCardRow}>
            <View style={styles.virtualCardLeft}>
              <View style={styles.virtualCardIcon}>
                <Ionicons name="card-outline" size={20} color="#BFDBFE" />
              </View>
              <View>
                <Text style={styles.virtualCardNumber}>
                  •••• •••• •••• {card.last4}
                </Text>
                <Text style={styles.virtualCardMeta}>
                  Expire {formatExpiry(card.expires_at)} · {card.status}
                </Text>
              </View>
            </View>
            {card.status === 'active' && (
              <TouchableOpacity
                style={styles.blockBtn}
                onPress={() => handleRevoke(card.id)}
                disabled={revokingId === card.id}
              >
                <Text style={styles.blockBtnText}>
                  {revokingId === card.id ? '...' : 'Bloquer'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </View>
  );
}

function WalletTransfersSection({ transfers, preauths }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.sectionTitle}>Transferts internationaux</Text>
      {(!transfers || transfers.length === 0) && (
        <Text style={styles.emptyText}>Aucun transfert.</Text>
      )}
      {transfers.map((t) => (
        <View key={t.id} style={styles.transferRow}>
          <View>
            <Text style={styles.transferTitle}>
              {t.recipient_name} · {t.recipient_country}
            </Text>
            <Text style={styles.transferMeta}>
              {Number(t.amount).toLocaleString('fr-FR')} {t.currency} ·{' '}
              {t.status}
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Préautorisations
      </Text>
      {(!preauths || preauths.length === 0) && (
        <Text style={styles.emptyText}>Aucune préautorisation.</Text>
      )}
      {preauths.map((p) => (
        <View key={p.id} style={styles.transferRow}>
          <View>
            <Text style={styles.transferTitle}>
              {Number(p.amount).toLocaleString('fr-FR')} {p.currency}
            </Text>
            <Text style={styles.transferMeta}>
              {p.status} · {p.reference || p.order_id || ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9CA3AF', marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#2563EB', borderRadius: 12 },
  retryBtnText: { color: '#FFF', fontWeight: '600' },
  content: { padding: 16 },
  balanceCard: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  balanceLabel: { fontSize: 14, color: '#93C5FD', marginBottom: 8 },
  balanceValue: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  balanceStat: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.5)',
    marginRight: 8,
  },
  balanceStatLabel: { fontSize: 12, color: '#BFDBFE' },
  balanceStatValue: { fontSize: 14, fontWeight: '600', color: '#F9FAFB', marginTop: 4 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  tipText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: '#020617',
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabBtnActive: {
    backgroundColor: '#1D4ED8',
  },
  tabBtnText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#EEF2FF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(55,65,81,0.7)',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txIconIn: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  txIconText: { color: '#E5E7EB', fontSize: 18, fontWeight: '600' },
  txTitle: { fontSize: 14, color: '#F9FAFB', fontWeight: '500' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, color: '#D1D5DB', fontWeight: '600' },
  txAmountIn: { color: '#22C55E' },
  withdrawBtn: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.7)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  withdrawBtnText: { color: '#60A5FA', fontWeight: '600' },
  withdrawCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.4)',
  },
  withdrawTitle: { fontSize: 16, fontWeight: '600', color: '#E5E7EB', marginBottom: 8 },
  field: { marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#E5E7EB', marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#F9FAFB',
    fontSize: 14,
    backgroundColor: '#020617',
  },
  helperText: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  methodChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    marginRight: 6,
    marginTop: 6,
  },
  methodChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  methodChipText: { fontSize: 12, color: '#D1D5DB' },
  methodChipTextActive: { color: '#EEF2FF' },
  withdrawActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '600' },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#E5E7EB', fontWeight: '500' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  smallPrimaryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  smallPrimaryBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  virtualCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  virtualCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  virtualCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  virtualCardNumber: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  virtualCardMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  blockBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  blockBtnText: { fontSize: 12, color: '#FCA5A5', fontWeight: '600' },
  transferRow: {
    marginTop: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(55,65,81,0.7)',
  },
  transferTitle: { fontSize: 14, fontWeight: '500', color: '#F9FAFB' },
  transferMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
