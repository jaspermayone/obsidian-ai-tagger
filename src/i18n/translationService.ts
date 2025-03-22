import { locales } from './locales';
import { Language } from '../models/types';

class TranslationService {
  private currentLanguage: Language = 'en';

  constructor() {
    // Use browser language as default if supported
    const browserLang = window.navigator.language.split('-')[0] as Language;
    if (this.isLanguageSupported(browserLang)) {
      this.currentLanguage = browserLang;
    }
  }

  public setLanguage(lang: Language): void {
    if (this.isLanguageSupported(lang)) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language ${lang} is not supported. Falling back to English.`);
      this.currentLanguage = 'en';
    }
  }

  public getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Translate a key with optional replacements
   * @param key The dot-notation key for the translation
   * @param replacements An object of values to replace in the translation
   * @returns The translated string
   * 
   * Example:
   * t('settings.apiKey.desc', { provider: 'OpenAI' })
   */
  public t(key: string, replacements?: Record<string, string>): string {
    const locale = this.getLocale();
    
    // Get the translation from the nested key
    const translation = key.split('.').reduce((obj, key) => 
      obj && typeof obj === 'object' ? obj[key] : undefined, 
      locale as any
    );

    if (typeof translation !== 'string') {
      console.warn(`Translation key "${key}" not found. Falling back to key.`);
      return key;
    }

    // Replace placeholders if provided
    if (replacements) {
      return Object.entries(replacements).reduce(
        (str, [key, value]) => str.replace(new RegExp(`{${key}}`, 'g'), value),
        translation
      );
    }

    return translation;
  }

  private isLanguageSupported(lang: string): boolean {
    return Object.keys(locales).includes(lang);
  }

  private getLocale(): any {
    return locales[this.currentLanguage] || locales.en;
  }
}

// Singleton instance to be used across the app
export const i18n = new TranslationService();