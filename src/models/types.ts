import { TFile } from "obsidian";

export enum AIProvider {
  Anthropic = "anthropic",
  OpenAI = "openai",
  Mistral = "mistral",
  Google = "google",
  Custom = "custom",
}

export type LanguageCode =
  | "ar" // Arabic
  | "cs" // Czech
  | "da" // Danish
  | "de" // German
  | "en" // English
  | "es" // Spanish
  | "fr" // French
  | "id" // Indonesian
  | "it" // Italian
  | "ja" // Japanese
  | "ko" // Korean
  | "nl" // Dutch
  | "no" // Norwegian
  | "pl" // Polish
  | "pt" // Portuguese
  | "pt-BR" // Brazilian Portuguese
  | "ro" // Romanian
  | "ru" // Russian
  | "tr" // Turkish
  | "uk" // Ukrainian
  | "zh" // Chinese (Simplified)
  | "zh-TW"; // Chinese (Traditional)

export interface AITaggerSettings {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  maxTags: number;
  promptOption: string;
  promptTemplate: string;
  customEndpoint: string;
  language: LanguageCode;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ProviderConfig {
  apiUrl: string;
  models: ModelInfo[];
  defaultModel: string;
  apiKeyUrl: string;
}

export interface TaggingResult {
  file: TFile;
  tags: string[];
  success: boolean;
  error?: string;
}
