import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

const savedLocale = typeof window !== 'undefined'
  ? window.localStorage.getItem('app-locale') || 'en'
  : 'en';

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
