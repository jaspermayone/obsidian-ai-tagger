import {
  App,
  MarkdownView,
  Plugin,
  TFile,
} from "obsidian";

import { AITaggerSettings } from "./models/types";
import { DEFAULT_SETTINGS } from "./models/constants";
import { ConfirmModal } from "./ui/ConfirmModal";
import { AITaggerSettingTab } from "./ui/AITaggerSettingTab";
import { tagSingleNote, tagAllNotes } from "./services/noteService";
import { NotificationService } from "./services/notificationService";
import { validateApiSettings, getModelName } from "./utils/validationUtils";

export default class AITaggerPlugin extends Plugin {
  settings: AITaggerSettings;

  async onload() {
    await this.loadSettings();

    // Create an icon in the left ribbon
    const ribbonIconEl = this.addRibbonIcon(
      "tag",
      "Auto-tag with AI",
      this.handleRibbonClick.bind(this)
    );
    ribbonIconEl.addClass("ai-tagger-ribbon-class");

    // Add command to tag current note
    this.addCommand({
      id: "tag-current-note",
      name: "Tag current note with AI",
      checkCallback: this.checkAndTagCurrentNote.bind(this),
    });

    // Add command to tag all notes
    this.addCommand({
      id: "tag-all-notes",
      name: "Tag all notes with AI",
      callback: this.confirmAndTagAllNotes.bind(this),
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

  private handleRibbonClick() {
    const validation = validateApiSettings(this.settings);
    
    if (!validation.valid) {
      new ConfirmModal(
        this.app,
        "AI tagging configuration error",
        () => {},
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
        () => {},
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
        () => {},
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
        notification.setSuccess(`Successfully added tags: ${result.tags.join(", ")}`);
      } else {
        notification.setError(`Error tagging note: ${result.error}`);
      }
    } catch (error) {
      console.error("Error tagging note:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      notification.setSuccess(
        `Completed tagging ${result.successful}/${result.total} notes successfully`
      );
    } catch (error) {
      console.error("Error during bulk tagging:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      notification.setError(`Error during bulk tagging: ${errorMessage}`);
    }
  }
}