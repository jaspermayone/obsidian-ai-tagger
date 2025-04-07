import ar from "./ar.json";
import de from "./de.json";
import en from "./en.json";
import es from "./es.json";

export type TranslationKey = keyof typeof en;

export const locales = {
  ar,
  de,
  en,
  es,
};

export const languageNames = {
  ar: "العربية",
  de: "Deutsch",
  en: "English",
  es: "Español",
};
