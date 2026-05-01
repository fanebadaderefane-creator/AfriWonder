import type { MutableRefObject } from 'react';

export interface RideMapProps {
  mapRef: MutableRefObject<unknown>;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  driverLat?: number;
  driverLng?: number;
}
