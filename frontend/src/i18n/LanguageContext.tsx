import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, LANGUAGE_META } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  languages: typeof LANGUAGE_META;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: async () => {},
  t: (key) => key,
  languages: LANGUAGE_META,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('app_language', lang);
    } catch (e) {}
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations.fr[key] || key;
  }, [language]);

  // Load saved language on mount
  React.useEffect(() => {
    AsyncStorage.getItem('app_language').then((saved) => {
      if (saved && (saved === 'fr' || saved === 'en' || saved === 'bm' || saved === 'wo')) {
        setLanguageState(saved as Language);
      }
    }).catch(() => {});
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGE_META }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
