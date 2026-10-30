import { App, PluginSettingTab, Setting } from 'obsidian';
import type PressworkPlugin from './main';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StampStatusMap {
  [status: string]: string; // status value → additional stamp modifier classes
}

export interface PressworkSettings {
  /** Read `frontmatterProperty` and render a stamp badge after the first H1 */
  enableStampRenderer: boolean;

  /** Frontmatter key to read for stamp rendering (default: "status") */
  stampProperty: string;

  /** Map of lowercase status values → extra .stamp modifier classes */
  stampStatusMap: StampStatusMap;

  /** Convert [!pw-*] callouts into Presswork components in Reading View */
  enableCalloutEnhancement: boolean;

  /** Add .dropcap to first paragraph when frontmatter `dropcap: true` */
  enableDropcaps: boolean;

  /** Load Presswork CSS from CDN (disable if using the CSS snippet instead) */
  loadPressworkCSS: boolean;

  /** CDN URL for Presswork CSS — override for self-hosted or local vault paths */
  pressworkCSSUrl: string;
}

export const DEFAULT_SETTINGS: PressworkSettings = {
  enableStampRenderer: true,
  stampProperty: 'status',
  stampStatusMap: {
    'approved':    'stamp--approved',
    'published':   'stamp--approved',
    'draft':       'stamp--draft',
    'in-progress': 'stamp--draft stamp--goldenrod',
    'urgent':      'stamp--urgent',
    'archived':    'stamp--archived',
    'review':      'stamp--draft stamp--cornflower',
    'wip':         'stamp--draft stamp--goldenrod',
    'done':        'stamp--approved stamp--olive',
  },
  enableCalloutEnhancement: true,
  enableDropcaps: true,
  loadPressworkCSS: true,
  pressworkCSSUrl: 'https://unpkg.com/presswork/dist/presswork.min.css',
};

// ── Settings Tab ───────────────────────────────────────────────────────────────

export class PressworkSettingTab extends PluginSettingTab {
  plugin: PressworkPlugin;

  constructor(app: App, plugin: PressworkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── CSS Loading ────────────────────────────────────────────────────────────

    new Setting(containerEl)
      .setName('Load Presswork CSS')
      .setDesc(
        'Automatically loads presswork.min.css from the CDN. ' +
        'Disable this if you are already using the Presswork CSS snippet.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.loadPressworkCSS)
          .onChange(async value => {
            this.plugin.settings.loadPressworkCSS = value;
            await this.plugin.saveSettings();
            this.display(); // re-render to show/hide URL field
          })
      );

    if (this.plugin.settings.loadPressworkCSS) {
      new Setting(containerEl)
        .setName('Presswork CSS URL')
        .setDesc(
          'CDN URL or obsidian:// vault resource path. ' +
          'Default: https://unpkg.com/presswork/dist/presswork.min.css'
        )
        .addText(text =>
          text
            .setPlaceholder('https://unpkg.com/presswork/dist/presswork.min.css')
            .setValue(this.plugin.settings.pressworkCSSUrl)
            .onChange(async value => {
              this.plugin.settings.pressworkCSSUrl = value;
              await this.plugin.saveSettings();
            })
        );
    }

    containerEl.createEl('hr');

    // ── Stamp Renderer ─────────────────────────────────────────────────────────

    new Setting(containerEl)
      .setName('Stamp renderer')
      .setDesc(
        'Reads a frontmatter property and inserts a .stamp badge ' +
        'after the first heading in Reading View.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableStampRenderer)
          .onChange(async value => {
            this.plugin.settings.enableStampRenderer = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Frontmatter property')
      .setDesc('Which frontmatter key to read for the stamp (default: status).')
      .addText(text =>
        text
          .setPlaceholder('status')
          .setValue(this.plugin.settings.stampProperty)
          .onChange(async value => {
            this.plugin.settings.stampProperty = value.trim() || 'status';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Status → stamp class map')
      .setDesc(
        'JSON map of lowercase status values to additional .stamp modifier classes. ' +
        'Example: {"approved":"stamp--approved","draft":"stamp--draft"}'
      )
      .addTextArea(area => {
        area.inputEl.rows = 8;
        area.inputEl.style.fontFamily = 'monospace';
        area.inputEl.style.fontSize = '0.8rem';
        area
          .setValue(JSON.stringify(this.plugin.settings.stampStatusMap, null, 2))
          .onChange(async value => {
            try {
              const parsed = JSON.parse(value);
              this.plugin.settings.stampStatusMap = parsed;
              await this.plugin.saveSettings();
              area.inputEl.style.borderColor = '';
            } catch {
              area.inputEl.style.borderColor = 'var(--color-red)';
            }
          });
      });

    containerEl.createEl('hr');

    // ── Callout Enhancement ────────────────────────────────────────────────────

    new Setting(containerEl)
      .setName('Callout enhancement')
      .setDesc(
        'Converts [!pw-stamp], [!pw-pull-quote], [!pw-telegram], ' +
        '[!pw-sheet], [!pw-margin-note], and [!pw-index-card] callouts ' +
        'into their Presswork HTML equivalents in Reading View.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableCalloutEnhancement)
          .onChange(async value => {
            this.plugin.settings.enableCalloutEnhancement = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl('hr');

    // ── Dropcaps ───────────────────────────────────────────────────────────────

    new Setting(containerEl)
      .setName('Dropcap rendering')
      .setDesc(
        'Adds .dropcap to the first paragraph of a note when its ' +
        'frontmatter contains `dropcap: true`.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableDropcaps)
          .onChange(async value => {
            this.plugin.settings.enableDropcaps = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
