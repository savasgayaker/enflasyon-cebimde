import { tr } from './tr';

export type Language = 'tr';

export const translations = {
  tr,
};

export const defaultLanguage: Language = 'tr';

export function t(key: string, language: Language = defaultLanguage): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return key;
  }
  
  return typeof value === 'string' ? value : key;
}
