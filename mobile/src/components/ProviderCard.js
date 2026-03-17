import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAbsoluteImageUrl } from '../utils';

function getProviderCardImageUrl(provider) {
  if (!provider) return null;
  const urls = [
    provider.portfolio_urls?.[0],
    provider.cover_image,
    provider.image_url,
    provider.banner_url,
    provider.portfolio_image,
  ].filter(Boolean);
  const raw = typeof urls[0] === 'string' ? urls[0].trim() : '';
  if (!raw) return null;
  return getAbsoluteImageUrl(raw) || raw;
}

export function getProviderCardImageUrlExport(provider) {
  return getProviderCardImageUrl(provider);
}

export default function ProviderCard({ provider, categoryName }) {
  const navigation = useNavigation();
  const [imageFailed, setImageFailed] = useState(false);

  const p = provider;
  const imageUrl = imageFailed ? null : getProviderCardImageUrl(p);
  const displayName = p?.display_name || p?.business_name || p?.user?.full_name || 'Prestataire';
  const initial = (displayName || 'P')[0].toUpperCase();
  const locationText = [p?.city, p?.neighborhood].filter(Boolean).join(', ') || '-';
  const priceMin = p?.price_range_min ?? p?.starting_price ?? 0;
  const category = categoryName || p?.category_name || p?.service_category || '';
  const isAvailable = p?.availability === 'available' || p?.is_available !== false;
  const tags = Array.isArray(p?.services_offered) ? p.services_offered : (p?.service_tags || []);
  const displayTags = tags.slice(0, 3);
  const extraCount = tags.length > 3 ? tags.length - 3 : 0;
  const tierBadge = p?.subscription_plan === 'premium' ? 'Premium' : p?.subscription_plan === 'pro' ? 'Pro' : null;

  const onPress = () => {
    navigation.navigate('ProviderProfile', { id: p.id, name: displayName });
  };

  if (!p) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderLetter}>{initial}</Text>
          </View>
        )}
        {isAvailable && (
          <View style={styles.availableBadge}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>Disponible</Text>
          </View>
        )}
        {tierBadge && (
          <View style={[styles.tierBadge, tierBadge === 'Premium' && styles.tierPremium]}>
            <Text style={styles.tierText}>{tierBadge}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {p.is_verified && (
              <Ionicons name="checkmark-circle" size={16} color="#2563eb" />
            )}
          </View>
          {Number(p.average_rating) > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#3b82f6" />
              <Text style={styles.ratingText}>{Number(p.average_rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
        {category ? (
          <Text style={styles.category} numberOfLines={1}>{category}</Text>
        ) : null}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="#6b7280" />
          <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
        </View>
        <Text style={styles.price}>
          {priceMin > 0
            ? `À partir de ${Number(priceMin).toLocaleString('fr-FR')} FCFA`
            : 'Prix sur demande'}
        </Text>
        {(displayTags.length > 0 || extraCount > 0) && (
          <View style={styles.tagsRow}>
            {displayTags.map((s, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>{typeof s === 'string' ? s : s?.name || ''}</Text>
              </View>
            ))}
            {extraCount > 0 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{extraCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageWrap: { height: 192, backgroundColor: '#eff6ff', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderLetter: { fontSize: 48, fontWeight: '700', color: '#374151' },
  availableBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 6 },
  availableText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  tierBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tierPremium: { backgroundColor: '#3b82f6' },
  tierText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  body: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  category: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  locationText: { flex: 1, fontSize: 13, color: '#6b7280' },
  price: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, color: '#6b7280' },
});
