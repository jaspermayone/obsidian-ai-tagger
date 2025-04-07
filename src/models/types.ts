import { TFile } from "obsidian";

export enum AIProvider {
  Anthropic = "anthropic",
  OpenAI = "openai",
  Mistral = "mistral",
  Google = "google",
  Custom = "custom",
}

export type ServiceType = "Cloud Service" | "Local Service";

export enum ServiceTypeEnum {
  CLOUD = "Cloud Service",
  LOCAL = "Local Service",
}

export interface AITaggerSettings {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  maxTags: number;
  promptOption: string;
  promptTemplate: string;
  customEndpoint: string;
  serviceType: ServiceType;
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
