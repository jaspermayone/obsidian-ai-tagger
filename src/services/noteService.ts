import { App, TFile } from "obsidian";
import { TaggingResult } from "../models/types";
import { generateTags } from "./tagGenerator";
import { AITaggerSettings } from "../models/types";

export async function updateNoteFrontmatter(
  app: App, 
  file: TFile, 
  newTags: string[]
): Promise<void> {
  // Use FileManager.processFrontMatter to atomically update the frontmatter
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
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

export async function tagSingleNote(
  app: App,
  file: TFile,
  settings: AITaggerSettings
): Promise<TaggingResult> {
  try {
    const content = await app.vault.read(file);
    const tags = await generateTags(content, settings);
    await updateNoteFrontmatter(app, file, tags);
    
    return {
      file,
      tags,
      success: true
    };
  } catch (error) {
    console.error(`Error tagging note ${file.path}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      file,
      tags: [],
      success: false,
      error: errorMessage
    };
  }
}

export async function tagAllNotes(
  app: App,
  settings: AITaggerSettings,
  progressCallback?: (processed: number, successful: number, total: number, currentFile: string) => void
): Promise<{ successful: number, total: number }> {
  const files = app.vault.getMarkdownFiles();
  let processed = 0;
  let successful = 0;

  for (const file of files) {
    try {
      // Report progress if callback is provided
      if (progressCallback) {
        progressCallback(processed, successful, files.length, file.path);
      }
      
      const content = await app.vault.read(file);
      const tags = await generateTags(content, settings);
      await updateNoteFrontmatter(app, file, tags);
      successful++;
    } catch (error) {
      console.error(`Error tagging note ${file.path}:`, error);
    }

    processed++;
  }

  return { successful, total: files.length };
}