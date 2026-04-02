/**
 * Client reco audit Phase 4 — API Node par défaut.
 * Pour TensorFlow.js : charger un modèle léger en Web Worker et scorer les ids retournés par listVideos,
 * ou appeler un worker Python via RECOMMENDATION_ENGINE_URL (déjà proxifié par le backend).
 */
import { api } from '@/api/expressClient';

export async function getRecommendedVideos(opts = {}) {
  return api.recommendations.listVideos(opts);
}
