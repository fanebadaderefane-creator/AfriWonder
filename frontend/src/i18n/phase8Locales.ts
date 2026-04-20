/**
 * Phase 8 — Langues ar / sw / ha : recouvrement partiel + repli sur fr/en.
 */
import type { Language } from './translations';
import { translations } from './translations';

/** Navigation & auth (arabe — RTL). */
const AR: Partial<Record<string, string>> = {
  'nav.home': 'الرئيسية',
  'nav.explore': 'استكشف',
  'nav.market': 'السوق',
  'nav.profile': 'الملف',
  'auth.login': 'تسجيل الدخول',
  'auth.register': 'إنشاء حساب',
  'auth.logout': 'خروج',
  'auth.email': 'البريد',
  'auth.password': 'كلمة المرور',
  'settings.title': 'الإعدادات',
  'settings.language': 'اللغة',
  'settings.chooseLanguage': 'اختر اللغة',
  'wallet.title': 'المحفظة',
  'common.cancel': 'إلغاء',
  'common.confirm': 'تأكيد',
  'common.loading': 'جارٍ التحميل…',
  'common.error': 'خطأ',
  'feed.empty.title': 'لا يوجد فيديو',
  'feed.empty.subtitle': 'اسحب للتحديث أو أعد المحاولة',
  'feed.empty.retry': 'إعادة المحاولة',
};

const SW: Partial<Record<string, string>> = {
  'nav.home': 'Nyumbani',
  'nav.explore': 'Gundua',
  'nav.market': 'Soko',
  'nav.profile': 'Wasifu',
  'auth.login': 'Ingia',
  'auth.register': 'Fungua akaunti',
  'auth.logout': 'Toka',
  'settings.title': 'Mipangilio',
  'settings.chooseLanguage': 'Chagua lugha',
  'wallet.title': 'Pochi',
  'common.loading': 'Inapakia…',
  'feed.empty.title': 'Hakuna video',
  'feed.empty.subtitle': 'Buruta ili kusasisha au jaribu tena',
  'feed.empty.retry': 'Jaribu tena',
};

const HA: Partial<Record<string, string>> = {
  'nav.home': 'Gida',
  'nav.explore': 'Bincika',
  'nav.market': 'Kasuwa',
  'nav.profile': 'Bayani',
  'auth.login': 'Shiga',
  'auth.register': 'Yi rijista',
  'settings.title': 'Saituna',
  'settings.chooseLanguage': 'Zaɓi harshe',
  'wallet.title': 'Wallet',
  'common.loading': 'Ana lodawa…',
  'feed.empty.title': 'Babu bidiyoyi',
  'feed.empty.subtitle': 'Ja don sabin ko sake gwadawa',
  'feed.empty.retry': 'Sake gwadawa',
};

export function resolveDictionary(lang: Language): Record<string, string> {
  if (lang === 'ar') return { ...translations.fr, ...AR } as Record<string, string>;
  if (lang === 'sw') return { ...translations.en, ...SW } as Record<string, string>;
  if (lang === 'ha') return { ...translations.en, ...HA } as Record<string, string>;
  return (translations[lang] as Record<string, string>) || translations.fr;
}
