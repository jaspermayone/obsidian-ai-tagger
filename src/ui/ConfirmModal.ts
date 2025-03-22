import { App, Modal } from "obsidian";
import { i18n } from "../i18n";

export class ConfirmModal extends Modal {
  private onConfirmCallback: () => void;
  private message: string;
  private hasError: boolean;
  private errorMessage: string;

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
        text: i18n.t("modals.settings"),
      });
      settingsButton.addEventListener("click", () => {
        this.close();
        // Open settings tab
        // Using type assertion with a more specific interface would be better
        // if we had access to the internal Obsidian API types
        if ("setting" in this.app) {
          const appWithSetting = this.app as unknown as {
            setting: { open: () => void; openTabById: (id: string) => void };
          };
          appWithSetting.setting.open();
          appWithSetting.setting.openTabById("ai-tagger");
        }
      });

      const cancelButton = buttonContainer.createEl("button", {
        text: i18n.t("modals.cancel"),
      });
      cancelButton.addEventListener("click", () => {
        this.close();
      });
    } else {
      const buttonContainer = contentEl.createDiv();
      buttonContainer.addClass("ai-tagger-modal-buttons");

      const confirmButton = buttonContainer.createEl("button", {
        text: i18n.t("modals.confirm"),
      });
      confirmButton.addEventListener("click", () => {
        this.onConfirmCallback();
        this.close();
      });

      const cancelButton = buttonContainer.createEl("button", {
        text: i18n.t("modals.cancel"),
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