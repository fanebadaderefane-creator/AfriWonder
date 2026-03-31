/**
 * Point d’entrée unique offline (audit) — stratégies par type de donnée.
 * Les implémentations restent en modules séparés pour limiter les régressions.
 */
export * from './offlineCache.service.js';
export * from './offlineStorage.service.js';
export * from './offlineProfilesMessages.service.js';
