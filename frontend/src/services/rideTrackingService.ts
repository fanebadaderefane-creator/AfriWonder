/**
 * Service tracking live d'un ride ou d'une livraison.
 *
 * Le chauffeur émet `ride:location` (ou `shipment:location`) toutes les N secondes.
 * Le passager/client écoute dans la même room pour mettre à jour la carte.
 *
 * Utilise le socket centralisé `socketService` (partagé avec messages, notifs, etc.).
 */
import socketService from './socketService';

export interface RideLocationEvent {
  rideId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface RideStatusEvent {
  rideId: string;
  status: string;
  eta_min?: number;
  updatedBy: string;
  timestamp: number;
}

export const rideTrackingService = {
  /** Passager : rejoindre la room pour recevoir la position du chauffeur. */
  joinRide(rideId: string): void {
    socketService.emit('ride:join', rideId);
  },
  leaveRide(rideId: string): void {
    socketService.emit('ride:leave', rideId);
  },
  onLocation(handler: (e: RideLocationEvent) => void): () => void {
    return socketService.on('ride:location', handler as unknown as (...args: unknown[]) => void);
  },
  onStatus(handler: (e: RideStatusEvent) => void): () => void {
    return socketService.on('ride:status', handler as unknown as (...args: unknown[]) => void);
  },
  /** Chauffeur : pousser sa position (appelé toutes les 5-10 s). */
  pushLocation(rideId: string, payload: { lat: number; lng: number; heading?: number; speed?: number }): void {
    socketService.emit('ride:location', { rideId, ...payload });
  },
  pushStatus(rideId: string, status: string, etaMin?: number): void {
    socketService.emit('ride:status', { rideId, status, eta_min: etaMin });
  },

  // ======== SHIPMENT (marketplace / food) ========
  joinShipment(shipmentId: string): void {
    socketService.emit('shipment:join', shipmentId);
  },
  leaveShipment(shipmentId: string): void {
    socketService.emit('shipment:leave', shipmentId);
  },
  onShipmentLocation(handler: (e: { shipmentId: string; driverId: string; lat: number; lng: number; heading?: number; timestamp: number }) => void): () => void {
    return socketService.on('shipment:location', handler as unknown as (...args: unknown[]) => void);
  },
  onShipmentStatus(handler: (e: { shipmentId: string; status: string; eta_min?: number; updatedBy: string; timestamp: number }) => void): () => void {
    return socketService.on('shipment:status', handler as unknown as (...args: unknown[]) => void);
  },
  pushShipmentLocation(shipmentId: string, payload: { lat: number; lng: number; heading?: number }): void {
    socketService.emit('shipment:location', { shipmentId, ...payload });
  },
  pushShipmentStatus(shipmentId: string, status: string, etaMin?: number): void {
    socketService.emit('shipment:status', { shipmentId, status, eta_min: etaMin });
  },
};

export default rideTrackingService;
