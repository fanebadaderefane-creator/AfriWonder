import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_FEED_AUTOPLAY } from '../constants/storageKeys';

/**
 * Même clé que Paramètres → « Lecture auto ». Quand false, le feed exige un tap
 * pour lancer la vidéo (comme l’économie de données).
 */
export function useFeedAutoplayFromSettings(): boolean {
  const [enabled, setEnabled] = useState(true);
  const refresh = useCallback(() => {
    void AsyncStorage.getItem(STORAGE_FEED_AUTOPLAY).then((v) => {
      if (v === null) setEnabled(true);
      else setEnabled(v === '1');
    });
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  return enabled;
}
