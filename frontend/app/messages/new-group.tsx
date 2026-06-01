import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { useAuthStore } from '../../src/store/authStore';
import { profileAvatarUri, avatarSeedFromUserFields } from '../../src/utils/avatarFallback';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';

type ContactRow = { id: string; name: string; avatar: string };

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await apiClient.get('/users', { params: { page: 1, limit: 100 } });
      const data = res.data?.data ?? res.data;
      let users = data?.users ?? (Array.isArray(data) ? data : []);
      if (!Array.isArray(users)) users = [];
      const myId = me?.id;
      const rows: ContactRow[] = users
        .filter((u: any) => u?.id && u.id !== myId && (u.username || u.full_name))
        .map((u: any) => ({
          id: String(u.id),
          name: String(u.full_name || u.username || 'Utilisateur').trim(),
          avatar: profileAvatarUri(
            u.profile_image,
            avatarSeedFromUserFields({
              full_name: u.full_name,
              username: u.username,
              fallbackLabel: 'Contact',
            }),
          ),
        }));
      setContacts(rows);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [me?.id]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, searchQuery]);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.includes(c.id)),
    [contacts, selectedIds],
  );

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/messages/groups', {
        name,
        memberIds: selectedIds,
      });
      const group = res.data?.data ?? res.data;
      const groupId = String(group?.id || '').trim();
      const avatar = profileAvatarUri(group?.avatar_url, name);
      if (groupId) {
        router.replace({
          pathname: '/messages/[id]',
          params: { id: groupId, name, avatar, kind: 'group' },
        } as any);
        return;
      }
      Alert.alert('Groupe créé', 'Le groupe a été créé.', [
        { text: 'OK', onPress: () => router.replace('/messages' as any) },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step === 1 ? router.back() : setStep(1))} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{step === 1 ? 'Nouveau groupe' : 'Infos du groupe'}</Text>
            <Text style={styles.headerSubtitle}>
              {step === 1 ? `${selectedIds.length} sélectionné(s)` : 'Étape 2/2'}
            </Text>
          </View>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.nextBtn, selectedIds.length < 2 && { opacity: 0.3 }]}
              onPress={() => selectedIds.length >= 2 && setStep(2)}
              disabled={selectedIds.length < 2}
            >
              <Text style={styles.nextBtnText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createBtn, (!groupName.trim() || creating) && { opacity: 0.3 }]}
              onPress={groupName.trim() && !creating ? () => void handleCreate() : undefined}
              disabled={!groupName.trim() || creating}
            >
              {creating ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
            </TouchableOpacity>
          )}
        </View>

        {step === 1 ? (
          <View style={{ flex: 1 }}>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#888" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un utilisateur..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {selectedContacts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {selectedContacts.map((c) => (
                  <TouchableOpacity key={c.id} style={styles.chip} onPress={() => toggleContact(c.id)}>
                    <ImageOrPlaceholder uri={c.avatar} style={styles.chipAvatar} icon="person" iconSize={14} />
                    <Text style={styles.chipName}>{c.name.split(' ')[0]}</Text>
                    <Ionicons name="close" size={14} color="#888" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {loadingContacts ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredContacts.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.contactRow}
                      onPress={() => toggleContact(contact.id)}
                    >
                      <ImageOrPlaceholder uri={contact.avatar} style={styles.contactAvatar} icon="person" iconSize={22} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                      </View>
                      <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                        {isSelected ? <Ionicons name="checkmark" size={18} color="#FFF" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {filteredContacts.length === 0 ? (
                  <Text style={styles.emptyHint}>Aucun utilisateur à afficher.</Text>
                ) : null}
              </ScrollView>
            )}
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.step2Content}>
            <Text style={styles.label}>Nom du groupe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Famille, Équipe projet..."
              placeholderTextColor="#666"
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Objectif du groupe..."
              placeholderTextColor="#666"
              value={groupDesc}
              onChangeText={setGroupDesc}
              multiline
            />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: { padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFF', paddingVertical: 12, fontSize: 15 },
  chipsRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipAvatar: { width: 24, height: 24, borderRadius: 12 },
  chipName: { color: '#FFF', fontSize: 13 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  contactName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  loadingBox: { padding: 40, alignItems: 'center' },
  emptyHint: { color: '#888', textAlign: 'center', padding: 24 },
  step2Content: { padding: 20 },
  label: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
});
