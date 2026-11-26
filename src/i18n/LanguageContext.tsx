import { createContext, useContext, useState, type ReactNode } from 'react';
import es from './es.json';
import quc from './quc.json';
import en from './en.json';

type Language = 'es' | 'quc' | 'en';
type TranslationValue = string | number | TranslationTree | TranslationValue[];
type TranslationTree = { [key: string]: TranslationValue };
type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string) => string;
};

const translations: Record<Language, TranslationTree> = { es, quc, en };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('es');

  const t = (path: string): string => {
    const value = path.split('.').reduce<TranslationValue | undefined>(
      (current, key) => {
        if (Array.isArray(current)) {
        const index = Number(key);
        if (Number.isInteger(index) && index >= 0) return current[index];
        return current.find((entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === key);
        }
        return typeof current === 'object' && current !== null ? current[key] : undefined;
      },
      translations[lang],
    );
    return typeof value === 'string' ? value : path;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}