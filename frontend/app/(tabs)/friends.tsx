import React from 'react';
import FeedScreen from './index';

/**
 * Onglet Ami(e)s : même expérience vidéo verticale que l’accueil « Suivis »,
 * alimentée par l’API `/videos?following_only=1` (créateurs réellement suivis — pas de hub démo).
 */
export default function FriendsScreen() {
  return <FeedScreen amisStandalone />;
}
