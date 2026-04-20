import React from 'react';
import FeedScreen from './index';

/**
 * Onglet « Explorer » (🧭) — feed vertical de vidéos diversifiées.
 *
 * Pendant TikTok-style :
 *  - Discover (🔥 onglet « Découvrir ») = tendances, hashtags, catégories, lives.
 *    Répond à « Qu'est-ce qui buzz ? »
 *  - Explore (🧭 onglet « Explorer ») = feed vertical, mêmes codes que For You mais
 *    en dehors de la bulle habituelle (créateurs non suivis, diversité par auteur).
 *    Répond à « Qu'est-ce que je pourrais aimer que je ne connais pas encore ? »
 *
 * On réutilise le même `FeedScreen` que l'accueil (player, swipe vertical, commentaires,
 * partage…) mais avec `diversifiedStandalone` qui charge `/videos/diversified` et
 * masque les 4 onglets du header au profit d'un titre « Explorer » + sous-titre.
 */
export default function ExploreFeedScreen() {
  return <FeedScreen diversifiedStandalone />;
}
