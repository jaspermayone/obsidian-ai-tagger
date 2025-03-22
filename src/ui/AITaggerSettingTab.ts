import { App, PluginSettingTab, Setting } from "obsidian";
import { AIProvider } from "../models/types";
import { MODEL_CONFIGS, PROMPT_TEMPLATES } from "../models/constants";
import AITaggerPlugin from "../main";

export class AITaggerSettingTab extends PluginSettingTab {
  plugin: AITaggerPlugin;

  constructor(app: App, plugin: AITaggerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.addProviderSection(containerEl);
    this.addApiSection(containerEl);
    this.addTaggingOptionsSection(containerEl);
    this.addPromptSection(containerEl);
  }

  private addProviderSection(containerEl: HTMLElement): void {
    // AI Provider selection
    new Setting(containerEl)
      .setName("AI Provider")
      .setDesc("Select which AI provider to use for generating tags.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption(AIProvider.Anthropic, "Anthropic (Claude)")
          .addOption(AIProvider.OpenAI, "OpenAI (GPT)")
          .addOption(AIProvider.Mistral, "Mistral AI")
          .addOption(AIProvider.Google, "Google (Gemini)")
          .addOption(AIProvider.Custom, "Custom Endpoint (OpenAI Compatible)")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            const newProvider = value as AIProvider;
            this.plugin.settings.provider = newProvider;

            // Update model to default for the selected provider
            if (newProvider !== AIProvider.Custom) {
              this.plugin.settings.modelName =
                MODEL_CONFIGS[newProvider].defaultModel;
            }

            await this.plugin.saveSettings();
            this.display(); // Refresh to show provider-specific options
          });
        return dropdown;
      });

    // Custom endpoint setting (only shown for custom provider)
    if (this.plugin.settings.provider === AIProvider.Custom) {
      new Setting(containerEl)
        .setName("Custom API Endpoint")
        .setDesc(
          "Enter the URL for your custom OpenAI-compatible API endpoint."
        )
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
  }

  private addApiSection(containerEl: HTMLElement): void {
    // Get the current provider config
    const providerConfig = MODEL_CONFIGS[this.plugin.settings.provider];

    // API Key with provider-specific description
    new Setting(containerEl)
      .setName("API key")
      .setDesc(
        `Your ${
          this.plugin.settings.provider === AIProvider.Custom
            ? ""
            : this.plugin.settings.provider
        } API key. Required to use the AI service. ${
          providerConfig.apiKeyUrl
            ? `Get it from ${providerConfig.apiKeyUrl} if you don't have one already.`
            : ""
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
        providerConfig.models.forEach((model) => {
          dropdown.addOption(model.id, model.name);
        });

        // If current model isn't in the list, add it
        if (
          !providerConfig.models.some(
            (m) => m.id === this.plugin.settings.modelName
          )
        ) {
          dropdown.addOption(
            this.plugin.settings.modelName,
            this.plugin.settings.modelName + " (Custom)"
          );
        }

        dropdown
          .setValue(this.plugin.settings.modelName)
          .onChange(async (value) => {
            this.plugin.settings.modelName = value;
            await this.plugin.saveSettings();
          });

        return dropdown;
      });
  }

  private addTaggingOptionsSection(containerEl: HTMLElement): void {
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
  }

  private addPromptSection(containerEl: HTMLElement): void {
    // Prompt option dropdown
    new Setting(containerEl)
      .setName("Prompt style")
      .setDesc(
        "Choose a predefined prompt style or create your own custom prompt."
      )
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
              this.plugin.settings.promptTemplate =
                PROMPT_TEMPLATES[value as keyof typeof PROMPT_TEMPLATES];

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
        .setDesc(
          "This is the prompt template that will be used (read-only). Switch to Custom if you want to edit it."
        )
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