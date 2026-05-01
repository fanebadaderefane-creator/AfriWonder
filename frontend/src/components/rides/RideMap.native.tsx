/**
 * iOS / Android : react-native-maps (hors du bundle web).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { MutableRefObject } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import type { RideMapProps } from './rideMapTypes';

export function RideMap({
  mapRef,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
}: RideMapProps) {
  const region = {
    latitude: driverLat ?? pickupLat ?? 12.6392,
    longitude: driverLng ?? pickupLng ?? -8.0029,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <MapView ref={mapRef as MutableRefObject<MapView | null>} style={{ flex: 1 }} initialRegion={region} showsUserLocation>
      {pickupLat != null && pickupLng != null ? (
        <Marker coordinate={{ latitude: pickupLat, longitude: pickupLng }} title="Départ" pinColor="green" />
      ) : null}
      {dropoffLat != null && dropoffLng != null ? (
        <Marker coordinate={{ latitude: dropoffLat, longitude: dropoffLng }} title="Arrivée" pinColor="red" />
      ) : null}
      {driverLat != null && driverLng != null ? (
        <Marker coordinate={{ latitude: driverLat, longitude: driverLng }} title="Chauffeur">
          <View style={styles.driverDot}>
            <Ionicons name="bicycle" size={18} color="#FFF" />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  driverDot: { backgroundColor: Colors.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
});
