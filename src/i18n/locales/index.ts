import en from './en.json';
import es from './es.json';

export type TranslationKey = keyof typeof en;

export const locales = {
  en,
  es,
  // Add more languages here
};

export const languageNames = {
  en: "English",
  es: "Español",
  // Add more language names here
};