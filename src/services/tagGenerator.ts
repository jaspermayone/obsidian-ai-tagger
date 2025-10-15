import { requestUrl } from "obsidian";
import { MODEL_CONFIGS } from "../models/constants";
import { AIProvider, AITaggerSettings } from "../models/types";

export async function generateTags(
  content: string,
  settings: AITaggerSettings
): Promise<string[]> {
  validateSettings(settings);

  // Replace placeholders in the prompt template
  const prompt = settings.promptTemplate
    .replace("{maxTags}", settings.maxTags.toString())
    .replace("{content}", content);

  try {
    const tagText = await fetchTagsFromProvider(settings, prompt);

    // Split by commas and trim whitespace
    return tagText
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);
  } catch (error) {
    console.error(`Error calling ${settings.provider} API:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate tags: ${errorMessage}`);
  }
}

function validateSettings(settings: AITaggerSettings): void {
  if (!settings.apiKey) {
    throw new Error(
      "API key not configured. Please add your API key in the plugin settings."
    );
  }

  if (settings.provider === AIProvider.Custom && !settings.customEndpoint) {
    throw new Error(
      "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
    );
  }
}

async function fetchTagsFromProvider(
  settings: AITaggerSettings,
  prompt: string
): Promise<string> {
  const providerConfig = MODEL_CONFIGS[settings.provider];

  switch (settings.provider) {
    case AIProvider.Anthropic:
      return await fetchFromAnthropic(settings, prompt, providerConfig.apiUrl);

    case AIProvider.OpenAI:
    case AIProvider.Mistral:
    case AIProvider.OpenRouter:
    case AIProvider.Custom:
      const endpoint =
        settings.provider === AIProvider.Custom
          ? settings.customEndpoint
          : providerConfig.apiUrl;
      return await fetchFromOpenAICompatible(settings, prompt, endpoint);

    case AIProvider.Google:
      return await fetchFromGoogle(settings, prompt, providerConfig.apiUrl);

    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

async function fetchFromAnthropic(
  settings: AITaggerSettings,
  prompt: string,
  apiUrl: string
): Promise<string> {
  const response = await requestUrl({
    url: apiUrl,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.modelName,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (response.status !== 200) {
    throw new Error(
      `API returned status code ${response.status}: ${JSON.stringify(
        response.json
      )}`
    );
  }

  return response.json.content[0].text;
}

async function fetchFromOpenAICompatible(
  settings: AITaggerSettings,
  prompt: string,
  endpoint: string
): Promise<string> {
  const response = await requestUrl({
    url: endpoint,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.modelName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  if (response.status !== 200) {
    throw new Error(
      `API returned status code ${response.status}: ${JSON.stringify(
        response.json
      )}`
    );
  }

  return response.json.choices[0].message.content;
}

async function fetchFromGoogle(
  settings: AITaggerSettings,
  prompt: string,
  apiUrl: string
): Promise<string> {
  const apiEndpoint = `${apiUrl}${settings.modelName}:generateContent?key=${settings.apiKey}`;

  const response = await requestUrl({
    url: apiEndpoint,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (response.status !== 200) {
    throw new Error(
      `API returned status code ${response.status}: ${JSON.stringify(
        response.json
      )}`
    );
  }

  return response.json.candidates[0].content.parts[0].text;
}
