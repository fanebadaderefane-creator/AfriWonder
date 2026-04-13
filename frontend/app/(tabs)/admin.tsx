import React from 'react';
import { Redirect, type Href } from 'expo-router';

/** Groupe `app/(admin)/` : les routes typées Expo peuvent ne pas lister `/(admin)` — cast ciblé. */
const ADMIN_ROOT = '/(admin)' as Href;

export default function AdminTabScreen() {
  return <Redirect href={ADMIN_ROOT} />;
}
