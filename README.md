# AI Tagger for Obsidian

This Obsidian plugin uses AI to automatically generate tags for your notes and add them to the frontmatter. It analyzes the content of your notes and suggests relevant tags based on the text.

## Features

- Automatically generate tags for your notes using AI
- Support for multiple AI providers: Anthropic (Claude), OpenAI (GPT), Mistral AI, Google (Gemini), OpenRouter, and custom endpoints
- Add the generated tags to your note's frontmatter
- Tag a single note or batch tag all notes in your vault
- Customize the prompt used to generate tags
- Choose from different AI models
- Configure maximum number of tags per note

## Installation

1. In Obsidian, go to Settings > Community plugins
2. Disable Safe mode
3. Click "Browse" and search for "AI Tagger"
4. Install the plugin
5. Enable the plugin after installation

Alternatively, you can manually install the plugin:

1. Download the `main.js`, `styles.css`, and `manifest.json` files
2. Create a folder named `obsidian-ai-tagger` in your vault's `.obsidian/plugins/` directory
3. Place the downloaded files in this folder
4. Enable the plugin in Obsidian's Community Plugins settings

## Setup

Before using the plugin, you need to configure your AI provider and API key:

1. Get an API key from your chosen provider:
   - [Anthropic (Claude)](https://console.anthropic.com/)
   - [OpenAI (GPT)](https://platform.openai.com/api-keys)
   - [Mistral AI](https://console.mistral.ai/api-keys/)
   - [Google (Gemini)](https://aistudio.google.com/app/apikey)
   - [OpenRouter](https://openrouter.ai/keys) - Access to multiple models through one API
   - Or use your own custom OpenAI-compatible endpoint
2. In Obsidian, go to Settings > AI Tagger
3. Select your AI provider from the dropdown
4. Enter your API key in the appropriate field
5. Choose your preferred model
6. Configure other settings as desired

## Usage

### Tag Current Note

1. Open the note you want to tag
2. Use the command palette (Ctrl/Cmd + P) and search for "Tag current note with AI"
3. The plugin will analyze your note and add relevant tags to the frontmatter

### Tag All Notes

1. Use the command palette (Ctrl/Cmd + P) and search for "Tag all notes with AI"
2. Confirm the action in the dialog that appears
3. The plugin will process all notes in your vault and add tags to each one

You can also use the ribbon icon (tag symbol) to access these commands.

## Settings

- **AI Provider**: Choose which AI provider to use (Anthropic, OpenAI, Mistral, Google, OpenRouter, or Custom)
- **API Key**: Your API key for the selected provider
- **AI Model**: Choose which model to use (options vary by provider)
- **Maximum Number of Tags**: Set how many tags should be generated per note (1-20)
- **Prompt Style**: Choose from predefined prompt styles or create your own custom prompt

## Customizing the Prompt

You can customize the prompt sent to the AI using the following placeholders:

- `{maxTags}`: Will be replaced with the maximum number of tags setting
- `{content}`: Will be replaced with the note content

Default prompt:

```
Generate {maxTags} relevant tags for the following note content. Return only the tags as a comma-separated list, without any additional commentary. Tags should be lowercase and use hyphens for multi-word tags.

Content:
{content}
```

## Development

This plugin is built with TypeScript and uses the Obsidian API. If you'd like to contribute or modify the plugin:

1. Clone the repository
2. Install dependencies with `npm install`
3. Make your changes
4. Build with `npm run build`
5. Test in your Obsidian vault

## Support

If you encounter any issues or have suggestions, please create an issue on the GitHub repository.

## Say Thank You

If you are enjoying my plugin, then please support my work by buying me a coffee at <https://buymeacoffee.com/jaspermayone> or [sponsoring me on github](https://github.com/sponsors/jaspermayone) .

Please also help spread the word by sharing about the plugin on Twitter, Reddit,
or any other social media platform you regularly use.

<a href="https://www.buymeacoffee.com/jaspermayone" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
