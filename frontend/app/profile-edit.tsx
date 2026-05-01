import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  InteractionManager,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import apiClient from '../src/api/client';
import { secureStorage } from '../src/utils/secureStorage';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';
import { ProfileAvatarCropModal } from '../src/components/profile/ProfileAvatarCropModal';

/** Images uniquement (contrat expo-image-picker : `'images' | 'videos' | …`). */
function resolveProfilePickerMediaTypes(): 'images' {
  return 'images';
}

function isImagePickerErrorResult(value: unknown): value is ImagePicker.ImagePickerErrorResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code?: unknown }).code === 'string' &&
    !('canceled' in value)
  );
}

function mimeForImageExt(ext: string): string {
  const e = String(ext || '')
    .toLowerCase()
    .replace(/^\./, '');
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'heic' || e === 'heif') return 'image/heic';
  return 'image/jpeg';
}

type ProfileImagePickMeta = { mimeType?: string | null; fileName?: string | null };

/** Web : FormData attend un File ; natif : objet `{ uri, name, type }` (MIME depuis le picker si URI sans extension). */
async function appendProfileImageToFormData(
  formData: FormData,
  uri: string,
  opts?: ProfileImagePickMeta
) {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    let mime = String(blob.type || '')
      .toLowerCase()
      .trim();
    if (!mime || mime === 'application/octet-stream') mime = 'image/jpeg';
    const ext = mime.includes('png')
      ? 'png'
      : mime.includes('webp')
        ? 'webp'
        : mime.includes('gif')
          ? 'gif'
          : mime.includes('heic') || mime.includes('heif')
            ? 'heic'
            : 'jpg';
    const name = `profile.${ext}`;
    formData.append('file', new File([blob], name, { type: mime }));
    return;
  }
  const providedMime = String(opts?.mimeType || '')
    .toLowerCase()
    .trim();
  const providedName = String(opts?.fileName || '').trim();
  const rawExtFromUri = (uri.split('.').pop() || '').split('?')[0] || '';
  const rawExtFromName = (providedName.split('.').pop() || '').split('?')[0] || '';
  const rawExt = (rawExtFromName || rawExtFromUri).toLowerCase();

  let ext = rawExt.replace(/[^a-z0-9]/gi, '').slice(0, 8);
  let mimeType = providedMime;

  if (!mimeType) {
    mimeType = mimeForImageExt(ext);
  }
  if (!ext) {
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('heic') || mimeType.includes('heif')) ext = 'heic';
    else ext = 'jpg';
  }

  formData.append('file', { uri, name: `profile.${ext}`, type: mimeType } as any);
}

function formatAvatarUploadError(e: unknown): string {
  const ax = e as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: { error?: string | { message?: string } } };
  };
  if (ax?.response?.status === 401) {
    return 'Session expirée. Reconnectez-vous puis réessayez.';
  }
  if (ax?.response?.status === 403) {
    return 'Action refusée. Vérifiez vos droits puis réessayez.';
  }
  if (
    ax?.code === 'ECONNABORTED' ||
    String(ax?.message || '')
      .toLowerCase()
      .includes('timeout')
  ) {
    return 'Délai dépassé. Réessayez avec une photo plus légère ou un meilleur réseau.';
  }
  if (String(ax?.message || '') === 'Network Error') {
    return 'Réseau instable pendant l’envoi. Vérifiez le Wi‑Fi / données puis réessayez.';
  }
  const msg = ax?.response?.data?.error;
  const str =
    typeof msg === 'string'
      ? msg
      : msg && typeof msg === 'object' && 'message' in msg
        ? String((msg as { message?: string }).message)
        : e instanceof Error
          ? e.message
          : 'Upload impossible';
  return String(str).slice(0, 280);
}

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarDisplayUri, setAvatarDisplayUri] = useState(() =>
    toAbsoluteMediaUrl(user?.profile_image || user?.avatar || '').trim()
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<(ProfileImagePickMeta & { uri: string }) | null>(
    null
  );

  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get(`/users/${user.id}`);
        const d = res.data?.data ?? res.data;
        if (cancelled || !d) return;
        if (d.full_name != null) setFullName(String(d.full_name));
        if (d.bio != null) setBio(String(d.bio));
        setWebsite(d.website != null ? String(d.website) : '');
        setLocation(d.location != null ? String(d.location) : '');
        const img = d.profile_image != null ? String(d.profile_image) : '';
        setAvatarDisplayUri(
          toAbsoluteMediaUrl(img).trim() ||
            toAbsoluteMediaUrl(user.profile_image || user.avatar || '').trim()
        );
      } catch {
        if (cancelled) return;
        setFullName(user.full_name || '');
        setBio(user.bio || '');
        setAvatarDisplayUri(toAbsoluteMediaUrl(user.profile_image || user.avatar || '').trim());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.full_name, user?.bio, user?.avatar, user?.profile_image]);

  const uploadAvatarFromUri = async (uri: string, meta?: ProfileImagePickMeta) => {
    if (!user?.id) {
      Alert.alert('Session', 'Veuillez vous reconnecter.');
      return;
    }
    setUploadingAvatar(true);
    try {
      /** Network Error transitoire (Wi‑Fi qui décroche, HTTP/1.1 keep‑alive cassé) → 1 retry court. */
      const doUpload = async () => {
        const formData = new FormData();
        await appendProfileImageToFormData(formData, uri, meta);
        return apiClient.post('/upload/image', formData, {
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
      };
      let uploadRes;
      try {
        uploadRes = await doUpload();
      } catch (firstErr: unknown) {
        const msg = String((firstErr as { message?: string })?.message || '');
        if (msg === 'Network Error') {
          await new Promise(r => setTimeout(r, 800));
          uploadRes = await doUpload();
        } else {
          throw firstErr;
        }
      }
      const fileUrl = uploadRes.data?.data?.file_url || uploadRes.data?.file_url;
      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error('Réponse upload invalide');
      }
      const putRes = await apiClient.put('/users/me', { profile_image: fileUrl });
      const updated = putRes.data?.data ?? putRes.data;
      if (!updated?.id) throw new Error('Mise à jour profil refusée');

      const abs = toAbsoluteMediaUrl(String(updated.profile_image || fileUrl)).trim();
      setAvatarDisplayUri(abs);

      const merged = {
        ...user,
        profile_image: updated.profile_image ?? fileUrl,
        avatar: abs || updated.profile_image || fileUrl,
      };
      updateUser(merged);
      await secureStorage.setItem('user', JSON.stringify(merged));
      setAvatarDraft(null);
      Alert.alert('Photo', 'Photo de profil mise à jour.');
    } catch (e: unknown) {
      Alert.alert('Erreur', formatAvatarUploadError(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openAvatarPreviewFromAsset = (asset: ImagePicker.ImagePickerAsset) => {
    const uri = asset.uri?.trim();
    if (!uri) return;
    if (asset.type === 'video') {
      Alert.alert('Format', 'Choisissez une photo, pas une vidéo.');
      return;
    }
    setAvatarDraft({
      uri,
      mimeType: asset.mimeType ?? null,
      fileName: asset.fileName ?? null,
    });
  };

  const scheduleAvatarPreview = (asset: ImagePicker.ImagePickerAsset) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => openAvatarPreviewFromAsset(asset));
    });
  };

  const scheduleAvatarPreviewRef = useRef(scheduleAvatarPreview);
  scheduleAvatarPreviewRef.current = scheduleAvatarPreview;

  const lastScheduledPickerRef = useRef<{ key: string; at: number } | null>(null);

  /** Évite double traitement si `AppState` + `launch*` renvoient le même asset (Android). */
  const scheduleAvatarPreviewDeduped = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    const uri = asset.uri?.trim();
    if (!uri) return;
    const key = `${uri}|${asset.assetId ?? ''}|${String(asset.fileName ?? '')}`;
    const now = Date.now();
    const prev = lastScheduledPickerRef.current;
    if (prev && prev.key === key && now - prev.at < 1000) return;
    lastScheduledPickerRef.current = { key, at: now };
    scheduleAvatarPreviewRef.current(asset);
  }, []);

  /**
   * Sur Android, le système peut détruire la MainActivity après le picker : la promesse de
   * `launchImageLibraryAsync` ne se résout pas, mais le résultat est récupérable ici au retour.
   * @see https://docs.expo.dev/versions/latest/sdk/image-picker/#imagepickergetpendingresultasync
   */
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const flushPending = async () => {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending == null || isImagePickerErrorResult(pending)) return;
        if (pending.canceled || !pending.assets?.[0]?.uri) return;
        scheduleAvatarPreviewDeduped(pending.assets[0]);
      } catch {
        /* ignore */
      }
    };

    void flushPending();

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void flushPending();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [scheduleAvatarPreviewDeduped]);

  const pickAvatarFromLibrary = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted' && String(status) !== 'limited') {
          Alert.alert('Permission', 'Accès à la galerie nécessaire pour choisir une photo.');
          return;
        }
      }
      /**
       * Ne pas utiliser `allowsEditing` / crop natif sur Android : retour fréquent = fermeture de l’app
       * (activité crop + RN New Architecture). L’aperçu dans la modale suffit.
       */
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: resolveProfilePickerMediaTypes(),
        allowsEditing: false,
        quality: Platform.OS === 'android' ? 0.85 : 0.88,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      scheduleAvatarPreviewDeduped(result.assets[0]);
    } catch {
      Alert.alert(
        'Galerie',
        "Impossible d'ouvrir la galerie. Réessayez ou vérifiez les permissions du navigateur / de l'app."
      );
    }
  };

  const pickAvatarFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Accès à la caméra nécessaire pour prendre une photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: Platform.OS === 'android' ? 0.85 : 0.88,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      scheduleAvatarPreviewDeduped(result.assets[0]);
    } catch {
      Alert.alert('Caméra', 'Impossible d’ouvrir la caméra.');
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Session', 'Veuillez vous reconnecter.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string | null> = {};
      if (fullName.trim()) body.full_name = fullName.trim();
      body.bio = bio.trim() ? bio.trim() : null;
      body.website = website.trim() ? website.trim() : null;
      body.location = location.trim() ? location.trim() : null;
      const res = await apiClient.put('/users/me', body);
      const updated = res.data?.data ?? res.data;
      if (updated?.id) {
        const fn = (updated.full_name ?? fullName).trim() || user.full_name || '';
        const merged = {
          ...user,
          full_name: updated.full_name ?? fn,
          bio: updated.bio != null ? updated.bio : bio.trim() || null,
          website: updated.website != null ? updated.website : body.website,
          location: updated.location != null ? updated.location : body.location,
          firstName: fn.split(' ')[0],
          lastName: fn.split(' ').slice(1).join(' '),
          profile_image: updated.profile_image ?? user.profile_image,
          avatar:
            toAbsoluteMediaUrl(
              String(updated.profile_image || user.profile_image || user.avatar || '')
            ).trim() || user.avatar,
        };
        updateUser(merged);
        await secureStorage.setItem('user', JSON.stringify(merged));
        Alert.alert('Profil', 'Modifications enregistrées.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.message;
      Alert.alert('Erreur', msg ? String(msg).slice(0, 200) : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Non connecté</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProfileAvatarCropModal
        visible={Boolean(avatarDraft)}
        uri={avatarDraft?.uri ?? ''}
        accent={Colors.primary}
        onCancel={() => !uploadingAvatar && setAvatarDraft(null)}
        onConfirm={async croppedUri => {
          await uploadAvatarFromUri(croppedUri, {
            mimeType: 'image/jpeg',
            fileName: 'profile.jpg',
          });
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Photo de profil</Text>
        <View style={styles.avatarBlock}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={uploadingAvatar || saving}
            onPress={() => void pickAvatarFromLibrary()}
            accessibilityLabel="Appuyer pour choisir une photo dans la galerie"
            style={[Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
          >
            <View style={styles.avatarWrap}>
              {avatarDisplayUri ? (
                <Image
                  source={{ uri: avatarDisplayUri }}
                  style={styles.avatarImg}
                  accessibilityLabel="Photo de profil"
                />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={48} color={Colors.textMuted} />
                </View>
              )}
              {uploadingAvatar ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color="#FFF" />
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.avatarBtn,
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
            onPress={() => {
              void pickAvatarFromLibrary();
            }}
            disabled={uploadingAvatar || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Choisir une photo dans la galerie"
          >
            <Ionicons name="images" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.avatarBtnText}>Changer la photo</Text>
          </TouchableOpacity>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              style={styles.avatarBtnSecondary}
              onPress={() => void pickAvatarFromCamera()}
              disabled={uploadingAvatar || saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Prendre une photo avec la caméra"
            >
              <Ionicons name="camera" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.avatarBtnSecondaryText}>Prendre une photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.label}>Nom affiché</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Votre nom"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Quelques mots sur vous"
          placeholderTextColor={Colors.textMuted}
          multiline
        />

        <Text style={styles.label}>Site web (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholder="https://..."
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          keyboardType={Platform.OS === 'ios' ? 'url' : 'default'}
        />

        <Text style={styles.label}>Localisation (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Ville, pays"
          placeholderTextColor={Colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploadingAvatar) && { opacity: 0.7 }]}
          onPress={() => void handleSave()}
          disabled={saving || uploadingAvatar}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  muted: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  form: { padding: Spacing.lg, paddingBottom: 40 },
  avatarBlock: { alignItems: 'center', marginBottom: 8 },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1A1A1A',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 200,
  },
  avatarBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  avatarBtnSecondary: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    minWidth: 200,
  },
  avatarBtnSecondaryText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  saveBtn: {
    marginTop: 28,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
