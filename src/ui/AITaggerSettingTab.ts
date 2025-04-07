import { App, PluginSettingTab, Setting } from "obsidian";
import { i18n } from "../i18n";
import AITaggerPlugin from "../main";
import { MODEL_CONFIGS, PROMPT_TEMPLATES } from "../models/constants";
import { AIProvider } from "../models/types";

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
    new Setting(containerEl);
    // setting for cloud vs local service

    // AI Provider selection
    new Setting(containerEl)
      .setName(i18n.t("settings.provider.title"))
      .setDesc(i18n.t("settings.provider.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(
            AIProvider.Anthropic,
            i18n.t("settings.provider.anthropic")
          )
          .addOption(AIProvider.OpenAI, i18n.t("settings.provider.openai"))
          .addOption(AIProvider.Mistral, i18n.t("settings.provider.mistral"))
          .addOption(AIProvider.Google, i18n.t("settings.provider.google"))
          .addOption(AIProvider.Custom, i18n.t("settings.provider.custom"))
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
        .setName(i18n.t("settings.customEndpoint.title"))
        .setDesc(i18n.t("settings.customEndpoint.desc"))
        .addText((text) =>
          text
            .setPlaceholder(i18n.t("settings.customEndpoint.placeholder"))
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
    const providerName =
      this.plugin.settings.provider === AIProvider.Custom
        ? ""
        : this.plugin.settings.provider;

    new Setting(containerEl)
      .setName(i18n.t("settings.apiKey.title"))
      .setDesc(
        i18n.t("settings.apiKey.desc", { provider: providerName }) +
          " " +
          (providerConfig.apiKeyUrl
            ? i18n.t("settings.apiKey.getKey", {
                url: providerConfig.apiKeyUrl,
              })
            : "") +
          " " +
          i18n.t("settings.apiKey.recommendation")
      )
      .addText((text) =>
        text
          .setPlaceholder(i18n.t("settings.apiKey.placeholder"))
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    // AI model selection (provider-specific)
    new Setting(containerEl)
      .setName(i18n.t("settings.model.title"))
      .setDesc(i18n.t("settings.model.desc"))
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
            i18n.t("settings.model.custom", {
              model: this.plugin.settings.modelName,
            })
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
      .setName(i18n.t("settings.maxTags.title"))
      .setDesc(i18n.t("settings.maxTags.desc"))
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
      .setName(i18n.t("settings.promptStyle.title"))
      .setDesc(i18n.t("settings.promptStyle.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("standard", i18n.t("settings.promptStyle.standard"))
          .addOption("descriptive", i18n.t("settings.promptStyle.descriptive"))
          .addOption("academic", i18n.t("settings.promptStyle.academic"))
          .addOption("concise", i18n.t("settings.promptStyle.concise"))
          .addOption("custom", i18n.t("settings.promptStyle.custom"))
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
        .setName(i18n.t("settings.customPrompt.title"))
        .setDesc(i18n.t("settings.customPrompt.desc"))
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
        .setName(i18n.t("settings.currentPrompt.title"))
        .setDesc(i18n.t("settings.currentPrompt.desc"))
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
