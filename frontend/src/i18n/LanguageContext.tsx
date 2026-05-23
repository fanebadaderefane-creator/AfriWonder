import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, LANGUAGE_META, ALL_LANGUAGES } from './translations';
import { resolveDictionary } from './phase8Locales';
import { updateMobileDeviceSettings } from '../services/mobileApiService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  languages: typeof LANGUAGE_META;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: async () => {},
  t: (key) => key,
  languages: LANGUAGE_META,
  isRTL: false,
});

function isLanguage(v: string | null): v is Language {
  return v != null && (ALL_LANGUAGES as string[]).includes(v);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  const dict = useMemo(() => resolveDictionary(language), [language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('app_language', lang);
      await updateMobileDeviceSettings({ preferred_language: lang });
    } catch (_e) {
      /* ignore */
    }
    /** RTL : arabe (Phase 8). Sur certains appareils un redémarrage complet applique tout le layout. */
    const rtl = lang === 'ar';
    try {
      I18nManager.allowRTL(true);
      if (I18nManager.isRTL !== rtl) {
        I18nManager.forceRTL(rtl);
      }
    } catch (_e) {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return dict[key] || translations.fr[key] || key;
    },
    [dict]
  );

  const isRTL = language === 'ar';

  useEffect(() => {
    AsyncStorage.getItem('app_language')
      .then((saved) => {
        if (isLanguage(saved)) {
          setLanguageState(saved);
          const rtl = saved === 'ar';
          try {
            I18nManager.allowRTL(true);
            if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
          } catch (_e) {
            /* ignore */
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGE_META, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
