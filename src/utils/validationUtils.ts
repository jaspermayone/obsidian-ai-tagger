import { AIProvider, AITaggerSettings } from "../models/types";

export function validateApiSettings(settings: AITaggerSettings): { valid: boolean; error?: string } {
  if (!settings.apiKey) {
    return {
      valid: false,
      error: "API key not configured. Please add your API key in the plugin settings."
    };
  }

  if (settings.provider === AIProvider.Custom && !settings.customEndpoint) {
    return {
      valid: false,
      error: "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
    };
  }

  return { valid: true };
}

export function getModelName(settings: AITaggerSettings): string {
  const provider = settings.provider;
  const modelId = settings.modelName;
  
  const model = provider === AIProvider.Custom 
    ? { name: modelId }
    : findModelById(provider, modelId);
    
  return model?.name || modelId;
}

function findModelById(provider: AIProvider, modelId: string) {
  const models = require("../models/constants").MODEL_CONFIGS[provider].models;
  return models.find((m: { id: string; name: string }) => m.id === modelId);
}

export function formatTagList(tags: string[]): string {
  if (tags.length === 0) return "No tags generated";
  return tags.join(", ");
}