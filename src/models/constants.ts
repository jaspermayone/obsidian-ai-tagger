import { AIProvider, AITaggerSettings, ProviderConfig } from "./types";

// Define prompt templates
export const PROMPT_TEMPLATES = {
  standard:
    "Generate {maxTags} relevant tags for the following note content. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
  descriptive:
    "Analyze the following note content and generate {maxTags} descriptive tags that capture the main topics, concepts, and themes. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
  academic:
    "Review the following academic or research note and generate {maxTags} specific tags that would help categorize this content in an academic context. Include relevant field-specific terminology. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
  concise:
    "Generate {maxTags} short, concise tags for the following note content. Focus on single-word tags when possible. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase.\n\nContent:\n{content}",
  custom: "",
};

// Define model configurations for each provider
export const MODEL_CONFIGS: Record<AIProvider, ProviderConfig> = {
  [AIProvider.Anthropic]: {
    apiUrl: "https://api.anthropic.com/v1/messages",
    models: [
      { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    ],
    defaultModel: "claude-3-5-sonnet-20240620",
    apiKeyUrl: "https://console.anthropic.com/",
  },
  [AIProvider.OpenAI]: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-4", name: "GPT-4" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
    defaultModel: "gpt-3.5-turbo",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  [AIProvider.Mistral]: {
    apiUrl: "https://api.mistral.ai/v1/chat/completions",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-medium-latest", name: "Mistral Medium" },
      { id: "mistral-small-latest", name: "Mistral Small" },
      { id: "open-mistral-7b", name: "Open Mistral 7B" },
    ],
    defaultModel: "mistral-small-latest",
    apiKeyUrl: "https://console.mistral.ai/api-keys/",
  },
  [AIProvider.Google]: {
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/",
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro" },
    ],
    defaultModel: "gemini-1.5-flash",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  [AIProvider.Custom]: {
    apiUrl: "",
    models: [{ id: "custom-model", name: "Custom Model" }],
    defaultModel: "custom-model",
    apiKeyUrl: "",
  },
};

export const DEFAULT_SETTINGS: AITaggerSettings = {
  provider: AIProvider.Anthropic,
  apiKey: "",
  modelName: MODEL_CONFIGS[AIProvider.Anthropic].defaultModel,
  maxTags: 5,
  promptOption: "standard",
  promptTemplate: PROMPT_TEMPLATES.standard,
  customEndpoint: "",
  language: "en",
};