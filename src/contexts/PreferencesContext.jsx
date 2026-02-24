/**
 * Contexte global des préférences utilisateur (persistées en localStorage).
 * Production-ready : état centralisé, restauration automatique après redémarrage.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadPreferences, savePreferences } from '@/lib/preferences';

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPreferences);

  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  const updatePreferences = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const value = {
    isMuted: prefs.isMuted,
    language: prefs.language,
    setMuted: (v) => updatePreferences({ isMuted: !!v }),
    setLanguage: (v) => updatePreferences({ language: v || 'fr' }),
    updatePreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    return {
      isMuted: false,
      language: 'fr',
      setMuted: () => {},
      setLanguage: () => {},
      updatePreferences: () => {},
    };
  }
  return context;
}
