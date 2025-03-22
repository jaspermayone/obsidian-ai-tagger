import { TFile } from "obsidian";

export enum AIProvider {
  Anthropic = "anthropic",
  OpenAI = "openai",
  Mistral = "mistral",
  Google = "google",
  Custom = "custom",
}

export interface AITaggerSettings {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  maxTags: number;
  promptOption: string;
  promptTemplate: string;
  customEndpoint: string;
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