import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

// Safely detect saved locale with fallback for Safari private mode or disabled storage
const getSavedLocale = (): string => {
  if (typeof window === 'undefined') return 'en';

  try {
    return window.localStorage.getItem('app-locale') || 'en';
  } catch (error) {
    // Storage access blocked (Safari private mode, disabled storage, etc.)
    console.warn('localStorage access blocked, using default locale:', error);
    return 'en';
  }
};

const savedLocale = getSavedLocale();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: savedLocale,
    fallbackLng: 'en',
    supportedLngs: ['en', 'he'],
    ns: ['translation'],
    defaultNS: 'translation',
    returnNull: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
