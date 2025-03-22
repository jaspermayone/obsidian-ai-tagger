import { Notice } from "obsidian";
import { i18n } from "../i18n";

interface PersistentNoticeOptions {
  duration?: number;
  errorDuration?: number;
}

export class NotificationService {
  private static defaultOptions: PersistentNoticeOptions = {
    duration: 3000,      // 3 seconds for regular notices
    errorDuration: 5000, // 5 seconds for error notices
  };

  /**
   * Shows a persistent notice that can be updated
   */
  static showPersistentNotice(
    initialMessage: string,
    options: PersistentNoticeOptions = {}
  ): {
    notice: Notice;
    setSuccess: (message: string) => void;
    setError: (message: string) => void;
    setProgress: (processed: number, successful: number, total: number, currentFile: string) => void;
  } {
    const opts = { ...this.defaultOptions, ...options };
    const notice = new Notice(initialMessage, 0); // 0 means don't auto-hide

    return {
      notice,
      
      setSuccess: (message: string) => {
        notice.setMessage(message);
        setTimeout(() => notice.hide(), opts.duration);
      },
      
      setError: (message: string) => {
        notice.setMessage(message);
        setTimeout(() => notice.hide(), opts.errorDuration);
      },
      
      setProgress: (processed: number, successful: number, total: number, currentFile: string) => {
        notice.setMessage(
          `Processing: ${currentFile}\nProgress: ${processed}/${total} (${successful} successful)`
        );
      }
    };
  }

  /**
   * Shows a simple notice
   */
  static showNotice(message: string, duration = 3000): Notice {
    return new Notice(message, duration);
  }
  
  /**
   * Shows an error notice
   */
  static showError(message: string, duration = 5000): Notice {
    return new Notice(message, duration);
  }
}