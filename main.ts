import * as yaml from "js-yaml";
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

interface AITaggerSettings {
  apiKey: string;
  modelName: string;
  maxTags: number;
  promptTemplate: string;
}

const DEFAULT_SETTINGS: AITaggerSettings = {
  apiKey: "",
  modelName: "claude-3-5-sonnet-20240620",
  maxTags: 5,
  promptTemplate:
    "Generate {maxTags} relevant tags for the following note content. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.\n\nContent:\n{content}",
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
        if (!this.settings.apiKey) {
          new ConfirmModal(
            this.app,
            "AI Tagging API Key Missing",
            () => {},
            true,
            "API key not configured. Please add your API key in the plugin settings."
          ).open();
          return;
        }
        new Notice(
          "Select a command to auto-tag the current note or all notes"
        );
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
                "AI Tagging API Key Missing",
                () => {},
                true,
                "API key not configured. Please add your API key in the plugin settings."
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
            "AI Tagging API Key Missing",
            () => {},
            true,
            "API key not configured. Please add your API key in the plugin settings."
          ).open();
          return;
        }

        new ConfirmModal(
          this.app,
          "This will tag all notes in your vault. This may take a while and consume API credits. Do you want to continue?",
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

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      new Notice("No active note to tag");
      return;
    }

    const file = activeView.file;
    const content = await this.app.vault.read(file);

    try {
      new Notice("Analyzing note content and generating tags...");
      const tags = await this.generateTags(content);
      await this.updateNoteFrontmatter(file, tags);
      new Notice(`Successfully added tags: ${tags.join(", ")}`);
    } catch (error) {
      console.error("Error tagging note:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Error tagging note: ${errorMessage}`);
    }
  }

  async tagAllNotes() {
    if (!this.settings.apiKey) {
      new Notice(
        "API key not configured. Please add your API key in the plugin settings."
      );
      return;
    }

    const files = this.app.vault.getMarkdownFiles();
    let processed = 0;
    let successful = 0;

    new Notice(`Starting to tag ${files.length} notes...`);

    for (const file of files) {
      try {
        const content = await this.app.vault.read(file);
        const tags = await this.generateTags(content);
        await this.updateNoteFrontmatter(file, tags);
        successful++;
      } catch (error) {
        console.error(`Error tagging note ${file.path}:`, error);
      }

      processed++;
      if (processed % 10 === 0) {
        new Notice(
          `Processed ${processed}/${files.length} notes (${successful} successful)`
        );
      }
    }

    new Notice(
      `Completed tagging ${successful}/${files.length} notes successfully`
    );
  }

  async generateTags(content: string): Promise<string[]> {
    if (!this.settings.apiKey) {
      throw new Error(
        "API key not configured. Please add your API key in the plugin settings."
      );
    }

    // Replace placeholders in the prompt template
    const prompt = this.settings.promptTemplate
      .replace("{maxTags}", this.settings.maxTags.toString())
      .replace("{content}", content);

    try {
      const response = await requestUrl({
        url: "https://api.anthropic.com/v1/messages",
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

      const result = response.json;
      const tagText = result.content[0].text;

      // Split by commas and trim whitespace
      return tagText
        .split(",")
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);
    } catch (error) {
      console.error("Error calling Claude API:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate tags: ${errorMessage}`);
    }
  }

  async updateNoteFrontmatter(file: TFile, newTags: string[]): Promise<void> {
    // Read the file content
    const content = await this.app.vault.read(file);

    let frontmatter: Record<string, unknown> = {};
    let fileContent = content;
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

    // If frontmatter exists, parse it
    if (frontmatterMatch) {
      try {
        frontmatter = yaml.load(frontmatterMatch[1]);
        fileContent = content.replace(/^---\n[\s\S]*?\n---\n/, "");
      } catch (e) {
        console.error("Error parsing frontmatter:", e);
        throw new Error("Could not parse existing frontmatter");
      }
    }

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

    // Convert frontmatter back to YAML
    const newFrontmatter = yaml.dump(frontmatter);
    const newContent = `---\n${newFrontmatter}---\n${fileContent}`;

    // Write the updated content back to the file
    await this.app.vault.modify(file, newContent);
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
        text: "Open Settings",
      });
      settingsButton.addEventListener("click", () => {
        this.close();
        // Open settings tab
        // Using type assertion with a more specific interface would be better
        // if we had access to the internal Obsidian API types
        if ('setting' in this.app) {
          const appWithSetting = this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } };
          appWithSetting.setting.open();
          appWithSetting.setting.openTabById("obsidian-sample-plugin");
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
    containerEl.createEl("h2", { text: "AI Tagging Settings" });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc(
        "Your Anthropic API key. Required to use the AI service. Get it from https://console.anthropic.com/ if you don't have one already. We recommend using a dedicated key for this plugin."
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

    new Setting(containerEl)
      .setName("AI Model")
      .setDesc("Choose which AI model to use for tag generation.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("claude-3-5-sonnet-20240620", "Claude 3.5 Sonnet")
          .addOption("claude-3-opus-20240229", "Claude 3 Opus")
          .addOption("claude-3-sonnet-20240229", "Claude 3 Sonnet")
          .addOption("claude-3-haiku-20240307", "Claude 3 Haiku")
          .setValue(this.plugin.settings.modelName)
          .onChange(async (value) => {
            this.plugin.settings.modelName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum Number of Tags")
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

    new Setting(containerEl)
      .setName("Prompt Template")
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
  }
}
