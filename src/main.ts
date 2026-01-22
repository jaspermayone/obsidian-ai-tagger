import { MarkdownView, Plugin } from "obsidian";

import { DEFAULT_SETTINGS } from "./models/constants";
import { AITaggerSettings } from "./models/types";
import { tagAllNotes, tagSingleNote } from "./services/noteService";
import { NotificationService } from "./services/notificationService";
import { AITaggerSettingTab } from "./ui/AITaggerSettingTab";
import { ConfirmModal } from "./ui/ConfirmModal";
import { getModelName, validateApiSettings } from "./utils/validationUtils";

export default class AITaggerPlugin extends Plugin {
  settings: AITaggerSettings;

  async onload() {
    await this.loadSettings();

    // Initialize language service with app instance and set language to Obsidian's language
    const { i18n } = await import("./i18n");
    i18n.initializeApp(this.app);

    // Always use Obsidian's language setting
    const obsidianLang = i18n.getObsidianLanguage();
    i18n.setLanguage(obsidianLang);

    // Create an icon in the left ribbon
    const ribbonIconEl = this.addRibbonIcon(
      "tag",
      i18n.t("ribbon.tooltip"),
      this.handleRibbonClick.bind(this)
    );
    ribbonIconEl.addClass("ai-tagger-ribbon-class");

    // Add command to tag current note
    this.addCommand({
      id: "tag-current-note",
      name: i18n.t("commands.tagCurrent"),
      checkCallback: this.checkAndTagCurrentNote.bind(this),
    });

    // Add command to tag all notes
    this.addCommand({
      id: "tag-all-notes",
      name: i18n.t("commands.tagAll"),
      callback: this.confirmAndTagAllNotes.bind(this),
    });

    // Add settings tab
    this.addSettingTab(new AITaggerSettingTab(this.app, this));
  }

  onunload() {
    // Clean up the translation service's event listeners
    import("./i18n").then(({ i18n }) => {
      i18n.cleanup();
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private handleRibbonClick() {
    const validation = validateApiSettings(this.settings);

    if (!validation.valid) {
      new ConfirmModal(
        this.app,
        "AI tagging configuration error",
        () => {
          null;
        },
        true,
        validation.error
      ).open();
      return;
    }

    // Tag the current note directly when clicking the ribbon icon
    this.tagCurrentNote();
  }

  private checkAndTagCurrentNote(checking: boolean): boolean {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!markdownView) {
      return false;
    }

    if (checking) {
      return true;
    }

    const validation = validateApiSettings(this.settings);

    if (!validation.valid) {
      new ConfirmModal(
        this.app,
        "AI tagging configuration error",
        () => {
          null;
        },
        true,
        validation.error
      ).open();
      return true;
    }

    this.tagCurrentNote();
    return true;
  }

  private confirmAndTagAllNotes() {
    const validation = validateApiSettings(this.settings);

    if (!validation.valid) {
      new ConfirmModal(
        this.app,
        "AI tagging configuration error",
        () => {
          null;
        },
        true,
        validation.error
      ).open();
      return;
    }

    const modelName = getModelName(this.settings);

    new ConfirmModal(
      this.app,
      `This will tag all notes in your vault using the ${modelName} model. This may take a while and consume API credits. Do you want to continue?`,
      () => this.tagAllNotes()
    ).open();
  }

  private async tagCurrentNote() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      NotificationService.showNotice("No active note to tag");
      return;
    }

    const file = activeView.file;

    // Create a persistent notice
    const notification = NotificationService.showPersistentNotice(
      "Analyzing note content and generating tags..."
    );

    try {
      const result = await tagSingleNote(this.app, file, this.settings);

      if (result.success) {
        notification.setSuccess(
          `Successfully added tags: ${result.tags.join(", ")}`
        );
      } else {
        notification.setError(`Error tagging note: ${result.error}`);
      }
    } catch (error) {
      console.error("Error tagging note:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      notification.setError(`Error tagging note: ${errorMessage}`);
    }
  }

  private async tagAllNotes() {
    // Create a persistent notice that we'll update
    const notification = NotificationService.showPersistentNotice(
      "Starting to tag notes..."
    );

    try {
      const result = await tagAllNotes(
        this.app,
        this.settings,
        (processed, successful, total, currentFile) => {
          notification.setProgress(processed, successful, total, currentFile);
        }
      );

      // Final notice with completion message
      if (result.failed > 0 && result.successful === 0) {
        // All notes failed - show error with details
        notification.setError(
          `Failed to tag all ${result.total} notes.\n${result.lastError || "Unknown error"}`
        );
      } else if (result.failed > 0) {
        // Some notes failed - show mixed result
        notification.setError(
          `Tagged ${result.successful}/${result.total} notes. ${result.failed} failed.\n${result.lastError || ""}`
        );
      } else {
        // All notes succeeded
        notification.setSuccess(
          `Completed tagging ${result.successful}/${result.total} notes successfully`
        );
      }
    } catch (error) {
      console.error("Error during bulk tagging:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      notification.setError(`Error during bulk tagging: ${errorMessage}`);
    }
  }
}
