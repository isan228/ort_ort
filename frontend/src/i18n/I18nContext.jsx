import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ru from './locales/ru.js';
import ky from './locales/ky.js';

const LOCALES = { ru, ky };
const STORAGE_KEY = 'ort_locale';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'ky' ? 'ky' : 'ru';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'ky' ? 'ky' : 'ru';
  }, [locale]);

  const value = useMemo(() => {
    const messages = LOCALES[locale] || ru;

    function t(key, fallback = key) {
      return messages[key] ?? LOCALES.ru[key] ?? fallback;
    }

    function setLocale(next) {
      if (LOCALES[next]) setLocaleState(next);
    }

    return { locale, setLocale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
