/**
 * Admin : édition complète d'un hôtel (infos + chambres CRUD côté API).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import adminSuperAppApi from '../../../src/api/adminSuperAppApi';

export default function AdminHotelEditScreen() {
  const insets = useSafeAreaInsets();
  const { id: hotelId } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('ML');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [star, setStar] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [amenitiesText, setAmenitiesText] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState('');
  const [newRoomCap, setNewRoomCap] = useState('2');

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const h = await adminSuperAppApi.getHotelDetail(hotelId);
      if (!h) {
        Alert.alert('Introuvable', 'Cet hôtel n’existe pas ou n’est plus disponible.');
        router.back();
        return;
      }
      setName(h.name ?? '');
      setDescription(h.description ?? '');
      setAddress(h.address ?? '');
      setCity(h.city ?? '');
      setCountry(h.country ?? 'ML');
      setLat(h.lat != null ? String(h.lat) : '');
      setLng(h.lng != null ? String(h.lng) : '');
      setStar(h.star_rating != null ? String(h.star_rating) : '');
      setPhone(h.phone ?? '');
      setEmail(h.email ?? '');
      setPriceFrom(h.price_fcfa_from != null ? String(h.price_fcfa_from) : '');
      setIsActive(!!h.is_active);
      setAmenitiesText(Array.isArray(h.amenities) ? h.amenities.join(', ') : '');
      setImagesText(Array.isArray(h.images) ? h.images.join('\n') : '');
      setRooms(h.rooms ?? []);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveHotel = () => {
    if (!hotelId) return;
    setSaving(true);
    void (async () => {
      try {
        const amenities = amenitiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const images = imagesText
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const payload: Record<string, unknown> = {
          name: name.trim(),
          description: description.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          country: country.trim() || 'ML',
          is_active: isActive,
          amenities: amenities.length ? amenities : undefined,
          images: images.length ? images : undefined,
        };
        const latN = parseFloat(lat.replace(',', '.'));
        const lngN = parseFloat(lng.replace(',', '.'));
        if (Number.isFinite(latN) && Number.isFinite(lngN)) {
          payload.lat = latN;
          payload.lng = lngN;
        }
        const s = parseFloat(String(star).replace(',', '.'));
        if (Number.isFinite(s) && s >= 1 && s <= 5) payload.star_rating = s;
        if (phone.trim()) payload.phone = phone.trim();
        if (email.trim()) payload.email = email.trim();
        const p = parseFloat(String(priceFrom).replace(/\s/g, '').replace(',', '.'));
        if (Number.isFinite(p) && p > 0) payload.price_fcfa_from = p;

        await adminSuperAppApi.updateHotel(hotelId, payload);
        Alert.alert('Enregistré', 'L’hôtel a été mis à jour.');
        await load();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string; message?: string } } }).response?.data
          : null;
        Alert.alert(
          'Erreur',
          (msg as { error?: string })?.error || (msg as { message?: string })?.message || 'Vérifiez les champs et réessayez.',
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  const addRoom = () => {
    if (!hotelId) return;
    const pr = parseFloat(newRoomPrice.replace(/\s/g, '').replace(',', '.'));
    const cap = parseInt(newRoomCap, 10);
    if (!newRoomName.trim() || !Number.isFinite(pr) || pr <= 0) {
      Alert.alert('Chambre', 'Indiquez un nom et un prix FCFA valides.');
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await adminSuperAppApi.createHotelRoom(hotelId, {
          name: newRoomName.trim(),
          price_fcfa: pr,
          capacity: Number.isFinite(cap) && cap > 0 ? cap : 2,
        });
        setNewRoomName('');
        setNewRoomPrice('');
        setNewRoomCap('2');
        await load();
      } catch {
        Alert.alert('Erreur', 'La chambre n’a pas pu être créée.');
      } finally {
        setSaving(false);
      }
    })();
  };

  const toggleRoom = (room: any) => {
    Alert.alert(
      room.is_active ? 'Désactiver la chambre' : 'Activer la chambre',
      room.name,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            void (async () => {
              try {
                await adminSuperAppApi.updateHotelRoom(room.id, { is_active: !room.is_active });
                await load();
              } catch {
                Alert.alert('Erreur', 'Modification impossible.');
              }
            })();
          },
        },
      ],
    );
  };

  if (loading || !hotelId) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Éditer l’hôtel
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom de l’établissement" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
        />

        <Text style={styles.label}>Adresse</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Adresse" />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ville</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Pays</Text>
            <TextInput style={styles.input} value={country} onChangeText={setCountry} maxLength={4} />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Étoiles (1–5)</Text>
            <TextInput style={styles.input} value={star} onChangeText={setStar} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Prix dès (FCFA)</Text>
            <TextInput style={styles.input} value={priceFrom} onChangeText={setPriceFrom} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.label}>Téléphone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>E-mail</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Visible / actif</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#888', true: Colors.primary + '99' }} />
        </View>

        <Text style={styles.label}>Équipements (séparés par des virgules)</Text>
        <TextInput style={styles.input} value={amenitiesText} onChangeText={setAmenitiesText} />

        <Text style={styles.label}>Images (une URL par ligne)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={imagesText}
          onChangeText={setImagesText}
          multiline
          placeholder="https://…"
        />

        <TouchableOpacity style={styles.saveHotelBtn} onPress={saveHotel} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveHotelText}>Enregistrer l’hôtel</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Chambres ({rooms.length})</Text>
        {rooms.map((room) => (
          <View key={room.id} style={styles.roomCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.sub}>
                {room.price_fcfa != null ? `${Number(room.price_fcfa).toLocaleString('fr-FR')} FCFA` : '—'} · cap.{' '}
                {room.capacity ?? '—'}
              </Text>
              <Text style={styles.sub}>{room.is_active ? 'Actif' : 'Désactivé'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleRoom(room)} style={styles.roomToggle}>
              <Ionicons name={room.is_active ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Nouvelle chambre</Text>
        <TextInput style={styles.input} value={newRoomName} onChangeText={setNewRoomName} placeholder="Nom (ex. Standard)" />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Prix FCFA</Text>
            <TextInput
              style={styles.input}
              value={newRoomPrice}
              onChangeText={setNewRoomPrice}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Capacité</Text>
            <TextInput
              style={styles.input}
              value={newRoomCap}
              onChangeText={setNewRoomCap}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <TouchableOpacity style={styles.addRoomBtn} onPress={addRoom} disabled={saving}>
          <Text style={styles.addRoomText}>Ajouter la chambre</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: 100 },
  label: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg },
  saveHotelBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveHotelText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.md },
  sectionTitle: { marginTop: Spacing.xl, color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roomName: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  roomToggle: { padding: Spacing.sm },
  addRoomBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  addRoomText: { color: Colors.primary, fontWeight: '800' },
});
