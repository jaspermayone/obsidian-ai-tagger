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

export type LanguageCode = keyof typeof locales;
export const languageCodes: LanguageCode[] = Object.keys(
  locales
) as LanguageCode[];

export const languageCodesList = Object.entries(locales).map(([key]) => ({
  code: key,
}));

export const languageNames = {
  ar: "العربية",
  de: "Deutsch",
  en: "English",
  es: "Español",
};
