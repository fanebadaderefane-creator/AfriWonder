/**
 * Web : pas de react-native-maps (module natif uniquement) — texte + coords.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSizes } from '../../theme/colors';
import type { RideMapProps } from './rideMapTypes';

/** Props identiques à la version native (refs ignorées sur le web). */
export function RideMap({ driverLat, driverLng }: RideMapProps) {
  return (
    <View style={styles.mapPlaceholder}>
      <Ionicons name="map-outline" size={48} color="#888" />
      <Text style={styles.mapPlaceholderText}>Carte en direct disponible sur l’app mobile</Text>
      {driverLat != null && driverLng != null ? (
        <Text style={styles.mapCoords}>
          Chauffeur : {driverLat.toFixed(5)}, {driverLng.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e5e5',
    gap: 8,
  },
  mapPlaceholderText: { color: '#555', fontSize: FontSizes.md },
  mapCoords: {
    color: '#333',
    fontSize: FontSizes.sm,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});
