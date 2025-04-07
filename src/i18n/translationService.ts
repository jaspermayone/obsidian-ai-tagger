import { locales } from './locales';
import { LanguageCode } from '../models/types';
import { App } from 'obsidian';

class TranslationService {
  private currentLanguage: LanguageCode = 'en';
  private app: App | null = null;

  constructor() {
    // Default to browser language initially
    // Will be overridden by Obsidian language or user setting
    const browserLang = window.navigator.language.split('-')[0] as LanguageCode;
    if (this.isLanguageSupported(browserLang)) {
      this.currentLanguage = browserLang;
    }
  }

  // Store bound event handler for proper cleanup
  private boundCheckForLanguageChanges: (() => void) | null = null;
  
  /**
   * Initialize the service with the Obsidian app instance
   * This allows getting the app's configured language and listening for changes
   */
  public initializeApp(app: App): void {
    this.app = app;
    
    // Set up event listener for when Obsidian's language changes
    // Obsidian doesn't directly expose a language change event, but when the app
    // locale changes, many UI elements will be updated and we can listen for those changes
    this.boundCheckForLanguageChanges = this.checkForLanguageChanges.bind(this);
    this.app.workspace.on('layout-change', this.boundCheckForLanguageChanges);
  }
  
  /**
   * Clean up event listeners when plugin is unloaded
   */
  public cleanup(): void {
    if (this.app && this.boundCheckForLanguageChanges) {
      this.app.workspace.off('layout-change', this.boundCheckForLanguageChanges);
      this.boundCheckForLanguageChanges = null;
    }
  }
  
  /**
   * Check if Obsidian's language has changed and update if needed
   */
  private checkForLanguageChanges(): void {
    if (!this.app) return;
    
    const currentObsidianLang = this.getObsidianLanguage();
    if (currentObsidianLang !== this.currentLanguage) {
      this.setLanguage(currentObsidianLang);
    }
  }

  /**
   * Get the ISO code for the currently configured Obsidian app language
   * @returns The language code (defaults to 'en')
   */
  public getObsidianLanguage(): LanguageCode {
    if (!this.app) return 'en';
    
    // Get language from Obsidian
    // @ts-ignore - getLanguage() exists but isn't in the type definitions
    const obsidianLang = this.app.vault.getConfig('language') || 'en';
    
    // Handle special cases or normalize language code if needed
    const normalizedLang = this.normalizeLanguageCode(obsidianLang);
    
    return this.isLanguageSupported(normalizedLang) ? normalizedLang as LanguageCode : 'en';
  }

  /**
   * Normalize language codes to match our supported formats
   */
  private normalizeLanguageCode(langCode: string): string {
    // Handle specific language code mappings
    const mappings: Record<string, string> = {
      'zh-cn': 'zh',
      'zh-hans': 'zh',
      'zh-hant': 'zh-TW',
      'pt-pt': 'pt',
      'pt-br': 'pt-BR'
    };
    
    // Return the mapped value if it exists, otherwise return the original
    return mappings[langCode.toLowerCase()] || langCode;
  }

  /**
   * Set the current language for translations
   */
  public setLanguage(lang: LanguageCode): void {
    if (this.isLanguageSupported(lang)) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language ${lang} is not supported. Falling back to English.`);
      this.currentLanguage = 'en';
    }
  }

  /**
   * Get the current language being used for translations
   */
  public getCurrentLanguage(): LanguageCode {
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