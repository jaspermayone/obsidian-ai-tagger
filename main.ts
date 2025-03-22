import {
  App,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  requestUrl,
} from "obsidian";

type AIProvider = 'anthropic' | 'openai' | 'mistral' | 'google' | 'custom';

interface AITaggerSettings {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  maxTags: number;
  promptOption: string;
  promptTemplate: string;
  customEndpoint: string;
}

// Define prompt templates
const PROMPT_TEMPLATES = {
  standard: "Generate {maxTags} relevant tags for the following note content. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
  descriptive: "Analyze the following note content and generate {maxTags} descriptive tags that capture the main topics, concepts, and themes. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
  academic: "Review the following academic or research note and generate {maxTags} specific tags that would help categorize this content in an academic context. Include relevant field-specific terminology. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
  concise: "Generate {maxTags} short, concise tags for the following note content. Focus on single-word tags when possible. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase.\n\nContent:\n{content}",
  custom: "",
};

// Define model configurations for each provider
const MODEL_CONFIGS = {
  anthropic: {
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
  openai: {
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
  mistral: {
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
  google: {
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/",
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro" },
    ],
    defaultModel: "gemini-1.5-flash",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  custom: {
    apiUrl: "",
    models: [
      { id: "custom-model", name: "Custom Model" },
    ],
    defaultModel: "custom-model",
    apiKeyUrl: "",
  }
};

const DEFAULT_SETTINGS: AITaggerSettings = {
  provider: "anthropic",
  apiKey: "",
  modelName: MODEL_CONFIGS.anthropic.defaultModel,
  maxTags: 5,
  promptOption: "standard",
  promptTemplate: PROMPT_TEMPLATES.standard,
  customEndpoint: "",
};

export default class AITaggerPlugin extends Plugin {
  settings: AITaggerSettings;

  async onload() {
    await this.loadSettings();

    // Create an icon in the left ribbon
    const ribbonIconEl = this.addRibbonIcon(
      "tag",
      "Auto-tag with AI",
      (evt: MouseEvent) => {
        // Check for required settings based on provider
        if (!this.settings.apiKey) {
          new ConfirmModal(
            this.app,
            "AI tagging API key missing",
            () => {},
            true,
            "API key not configured. Please add your API key in the plugin settings."
          ).open();
          return;
        }
        
        if (this.settings.provider === "custom" && !this.settings.customEndpoint) {
          new ConfirmModal(
            this.app,
            "Custom API endpoint missing",
            () => {},
            true,
            "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
          ).open();
          return;
        }
        
        // Tag the current note directly when clicking the ribbon icon
        this.tagCurrentNote();
      }
    );
    ribbonIconEl.addClass("ai-tagger-ribbon-class");

    // Add command to tag current note
    this.addCommand({
      id: "tag-current-note",
      name: "Tag current note with AI",
      checkCallback: (checking: boolean) => {
        const markdownView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          if (!checking) {
            if (!this.settings.apiKey) {
              new ConfirmModal(
                this.app,
                "AI tagging API key missing",
                () => {},
                true,
                "API key not configured. Please add your API key in the plugin settings."
              ).open();
              return true;
            }
            
            if (this.settings.provider === "custom" && !this.settings.customEndpoint) {
              new ConfirmModal(
                this.app,
                "Custom API endpoint missing",
                () => {},
                true,
                "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
              ).open();
              return true;
            }
            
            this.tagCurrentNote();
          }
          return true;
        }
        return false;
      },
    });

    // Add command to tag all notes (but might need to limit this or add pagination)
    this.addCommand({
      id: "tag-all-notes",
      name: "Tag all notes with AI",
      callback: () => {
        if (!this.settings.apiKey) {
          new ConfirmModal(
            this.app,
            "AI tagging API key missing",
            () => {},
            true,
            "API key not configured. Please add your API key in the plugin settings."
          ).open();
          return;
        }
        
        if (this.settings.provider === "custom" && !this.settings.customEndpoint) {
          new ConfirmModal(
            this.app,
            "Custom API endpoint missing",
            () => {},
            true,
            "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
          ).open();
          return;
        }

        new ConfirmModal(
          this.app,
          `This will tag all notes in your vault using the ${MODEL_CONFIGS[this.settings.provider].models.find(m => m.id === this.settings.modelName)?.name || this.settings.modelName} model. This may take a while and consume API credits. Do you want to continue?`,
          () => this.tagAllNotes()
        ).open();
      },
    });

    // Add settings tab
    this.addSettingTab(new AITaggerSettingTab(this.app, this));
  }

  onunload() {
    // Nothing specific to clean up
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async tagCurrentNote() {
    if (!this.settings.apiKey) {
      new Notice(
        "API key not configured. Please add your API key in the plugin settings."
      );
      return;
    }
    
    if (this.settings.provider === "custom" && !this.settings.customEndpoint) {
      new Notice(
        "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
      );
      return;
    }

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      new Notice("No active note to tag");
      return;
    }

    const file = activeView.file;
    const content = await this.app.vault.read(file);

    // Create a persistent notice
    const notice = new Notice("Analyzing note content and generating tags...", 0);

    try {
      const tags = await this.generateTags(content);
      await this.updateNoteFrontmatter(file, tags);
      
      // Update the notice with success message
      notice.setMessage(`Successfully added tags: ${tags.join(", ")}`);
      
      // Hide after 3 seconds
      setTimeout(() => {
        notice.hide();
      }, 3000);
    } catch (error) {
      console.error("Error tagging note:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update the notice with error message
      notice.setMessage(`Error tagging note: ${errorMessage}`);
      
      // Hide after 5 seconds for error messages (giving more time to read)
      setTimeout(() => {
        notice.hide();
      }, 5000);
    }
  }

  async tagAllNotes() {
    if (!this.settings.apiKey) {
      new Notice(
        "API key not configured. Please add your API key in the plugin settings."
      );
      return;
    }
    
    if (this.settings.provider === "custom" && !this.settings.customEndpoint) {
      new Notice(
        "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
      );
      return;
    }

    const files = this.app.vault.getMarkdownFiles();
    let processed = 0;
    let successful = 0;
    
    // Create a persistent notice that we'll update
    const notice = new Notice(`Starting to tag ${files.length} notes...`, 0);

    for (const file of files) {
      try {
        // Update the notice with current file
        notice.setMessage(`Processing: ${file.path}\nProgress: ${processed}/${files.length} (${successful} successful)`);
        
        const content = await this.app.vault.read(file);
        const tags = await this.generateTags(content);
        await this.updateNoteFrontmatter(file, tags);
        successful++;
      } catch (error) {
        console.error(`Error tagging note ${file.path}:`, error);
      }

      processed++;
    }

    // Final notice with completion message
    notice.setMessage(`Completed tagging ${successful}/${files.length} notes successfully`);
    
    // Hide the notice after 3 seconds
    setTimeout(() => {
      notice.hide();
    }, 3000);
  }

  async generateTags(content: string): Promise<string[]> {
    if (!this.settings.apiKey) {
      throw new Error(
        "API key not configured. Please add your API key in the plugin settings."
      );
    }

    if (this.settings.provider === "custom" && !this.settings.customEndpoint) {
      throw new Error(
        "Custom API endpoint not configured. Please add your endpoint URL in the plugin settings."
      );
    }

    // Replace placeholders in the prompt template
    const prompt = this.settings.promptTemplate
      .replace("{maxTags}", this.settings.maxTags.toString())
      .replace("{content}", content);

    try {
      let response;
      let tagText: string;
      
      // Get provider configuration
      const providerConfig = MODEL_CONFIGS[this.settings.provider];
      
      switch (this.settings.provider) {
        case "anthropic":
          response = await requestUrl({
            url: providerConfig.apiUrl,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": this.settings.apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: this.settings.modelName,
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
          
          tagText = response.json.content[0].text;
          break;
          
        case "openai":
        case "mistral":
        case "custom":
          // OpenAI and Mistral use the same API format
          // For custom endpoints, we assume OpenAI compatible format
          const endpoint = this.settings.provider === "custom" 
            ? this.settings.customEndpoint 
            : providerConfig.apiUrl;
            
          response = await requestUrl({
            url: endpoint,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.settings.apiKey}`,
            },
            body: JSON.stringify({
              model: this.settings.modelName,
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
          
          tagText = response.json.choices[0].message.content;
          break;
          
        case "google":
          // Google Gemini has a different API format
          const apiEndpoint = `${providerConfig.apiUrl}${this.settings.modelName}:generateContent?key=${this.settings.apiKey}`;
          
          response = await requestUrl({
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
          
          tagText = response.json.candidates[0].content.parts[0].text;
          break;
          
        default:
          throw new Error(`Unknown provider: ${this.settings.provider}`);
      }

      // Split by commas and trim whitespace
      return tagText
        .split(",")
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);
    } catch (error) {
      console.error(`Error calling ${this.settings.provider} API:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate tags: ${errorMessage}`);
    }
  }

  async updateNoteFrontmatter(file: TFile, newTags: string[]): Promise<void> {
    // Use FileManager.processFrontMatter to atomically update the frontmatter
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      // Add new tags to existing tags or create new tags field
      if (!frontmatter.tags) {
        frontmatter.tags = newTags;
      } else {
        // Handle case where tags is a string
        if (typeof frontmatter.tags === "string") {
          frontmatter.tags = [frontmatter.tags, ...newTags];
        }
        // Handle case where tags is already an array
        else if (Array.isArray(frontmatter.tags)) {
          frontmatter.tags = [...frontmatter.tags, ...newTags];
        }

        // Remove duplicates
        frontmatter.tags = [...new Set(frontmatter.tags)];
      }
    });
  }
}

class ConfirmModal extends Modal {
  onConfirmCallback: () => void;
  message: string;
  hasError: boolean;
  errorMessage: string;

  constructor(
    app: App,
    message: string,
    onConfirmCallback: () => void,
    hasError = false,
    errorMessage = ""
  ) {
    super(app);
    this.message = message;
    this.onConfirmCallback = onConfirmCallback;
    this.hasError = hasError;
    this.errorMessage = errorMessage;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("p", { text: this.message });

    if (this.hasError) {
      const errorEl = contentEl.createEl("p", { text: this.errorMessage });
      errorEl.addClass("ai-tagger-error-message");

      const buttonContainer = contentEl.createDiv();
      buttonContainer.addClass("ai-tagger-modal-buttons");

      const settingsButton = buttonContainer.createEl("button", {
        text: "Open settings",
      });
      settingsButton.addEventListener("click", () => {
        this.close();
        // Open settings tab
        // Using type assertion with a more specific interface would be better
        // if we had access to the internal Obsidian API types
        if ('setting' in this.app) {
          const appWithSetting = this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } };
          appWithSetting.setting.open();
          appWithSetting.setting.openTabById("ai-tagger");
        }
      });

      const cancelButton = buttonContainer.createEl("button", {
        text: "Cancel",
      });
      cancelButton.addEventListener("click", () => {
        this.close();
      });
    } else {
      const buttonContainer = contentEl.createDiv();
      buttonContainer.addClass("ai-tagger-modal-buttons");

      const confirmButton = buttonContainer.createEl("button", {
        text: "Confirm",
      });
      confirmButton.addEventListener("click", () => {
        this.onConfirmCallback();
        this.close();
      });

      const cancelButton = buttonContainer.createEl("button", {
        text: "Cancel",
      });
      cancelButton.addEventListener("click", () => {
        this.close();
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class AITaggerSettingTab extends PluginSettingTab {
  plugin: AITaggerPlugin;

  constructor(app: App, plugin: AITaggerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // AI Provider selection
    new Setting(containerEl)
      .setName("AI Provider")
      .setDesc("Select which AI provider to use for generating tags.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("anthropic", "Anthropic (Claude)")
          .addOption("openai", "OpenAI (GPT)")
          .addOption("mistral", "Mistral AI")
          .addOption("google", "Google (Gemini)")
          .addOption("custom", "Custom Endpoint (OpenAI Compatible)")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            const newProvider = value as AIProvider;
            this.plugin.settings.provider = newProvider;
            
            // Update model to default for the selected provider
            if (newProvider !== "custom") {
              this.plugin.settings.modelName = MODEL_CONFIGS[newProvider].defaultModel;
            }
            
            await this.plugin.saveSettings();
            this.display(); // Refresh to show provider-specific options
          });
        return dropdown;
      });

    // Custom endpoint setting (only shown for custom provider)
    if (this.plugin.settings.provider === "custom") {
      new Setting(containerEl)
        .setName("Custom API Endpoint")
        .setDesc("Enter the URL for your custom OpenAI-compatible API endpoint.")
        .addText((text) =>
          text
            .setPlaceholder("https://your-api-endpoint.com/v1/chat/completions")
            .setValue(this.plugin.settings.customEndpoint)
            .onChange(async (value) => {
              this.plugin.settings.customEndpoint = value;
              await this.plugin.saveSettings();
            })
        );
    }

    // Get the current provider config
    const providerConfig = MODEL_CONFIGS[this.plugin.settings.provider];
    
    // API Key with provider-specific description
    new Setting(containerEl)
      .setName("API key")
      .setDesc(
        `Your ${this.plugin.settings.provider === "custom" ? "" : this.plugin.settings.provider} API key. Required to use the AI service. ${
          providerConfig.apiKeyUrl ? `Get it from ${providerConfig.apiKeyUrl} if you don't have one already.` : ""
        } We recommend using a dedicated key for this plugin.`
      )
      .addText((text) =>
        text
          .setPlaceholder("Enter your API key")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    // AI model selection (provider-specific)
    new Setting(containerEl)
      .setName("AI model")
      .setDesc("Choose which AI model to use for tag generation.")
      .addDropdown((dropdown) => {
        // Add models for the selected provider
        providerConfig.models.forEach(model => {
          dropdown.addOption(model.id, model.name);
        });
        
        // If current model isn't in the list, add it
        if (!providerConfig.models.some(m => m.id === this.plugin.settings.modelName)) {
          dropdown.addOption(this.plugin.settings.modelName, this.plugin.settings.modelName + " (Custom)");
        }
        
        dropdown.setValue(this.plugin.settings.modelName)
          .onChange(async (value) => {
            this.plugin.settings.modelName = value;
            await this.plugin.saveSettings();
          });
        
        return dropdown;
      });

    new Setting(containerEl)
      .setName("Maximum number of tags")
      .setDesc("Set the maximum number of tags to generate per note.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.maxTags)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxTags = value;
            await this.plugin.saveSettings();
          })
      );

    // Prompt option dropdown
    new Setting(containerEl)
      .setName("Prompt style")
      .setDesc("Choose a predefined prompt style or create your own custom prompt.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("standard", "Standard")
          .addOption("descriptive", "Descriptive")
          .addOption("academic", "Academic")
          .addOption("concise", "Concise")
          .addOption("custom", "Custom")
          .setValue(this.plugin.settings.promptOption)
          .onChange(async (value) => {
            this.plugin.settings.promptOption = value;
            
            // Update prompt template if not using custom
            if (value !== "custom") {
              this.plugin.settings.promptTemplate = PROMPT_TEMPLATES[value as keyof typeof PROMPT_TEMPLATES];
              
              // Force refresh to update the textarea with the new template
              this.display();
            } else if (this.plugin.settings.promptTemplate === "") {
              // If switching to custom and no custom template yet, initialize with standard
              this.plugin.settings.promptTemplate = PROMPT_TEMPLATES.standard;
              this.display();
            }
            
            await this.plugin.saveSettings();
          });
        return dropdown;
      });

    // Only show prompt template textarea if custom option is selected
    if (this.plugin.settings.promptOption === "custom") {
      new Setting(containerEl)
        .setName("Custom prompt template")
        .setDesc(
          "Customize the prompt sent to the AI. Use {maxTags} and {content} as placeholders."
        )
        .addTextArea((textarea) =>
          textarea
            .setValue(this.plugin.settings.promptTemplate)
            .onChange(async (value) => {
              this.plugin.settings.promptTemplate = value;
              await this.plugin.saveSettings();
            })
        )
        .setClass("ai-tagger-wide-setting");
    } else {
      // Show the current template as read-only if not using custom
      new Setting(containerEl)
        .setName("Current prompt template")
        .setDesc("This is the prompt template that will be used (read-only). Switch to Custom if you want to edit it.")
        .addTextArea((textarea) => {
          textarea
            .setValue(this.plugin.settings.promptTemplate)
            .setDisabled(true);
          return textarea;
        })
        .setClass("ai-tagger-wide-setting");
    }
  }
}
