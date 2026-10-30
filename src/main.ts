import {
  App,
  Editor,
  MarkdownPostProcessorContext,
  MarkdownView,
  Plugin,
} from 'obsidian';

import { DEFAULT_SETTINGS, PressworkSettingTab, type PressworkSettings } from './settings';

// ── Plugin ─────────────────────────────────────────────────────────────────────

export default class PressworkPlugin extends Plugin {
  settings: PressworkSettings = DEFAULT_SETTINGS;

  // Injected <link> element for CDN CSS — kept so we can remove it on unload
  private cssLinkEl: HTMLLinkElement | null = null;

  async onload() {
    await this.loadSettings();

    // 1. Optionally load Presswork CSS from CDN
    if (this.settings.loadPressworkCSS) {
      this.injectCSS();
    }

    // 2. Markdown post-processors (Reading View)
    this.registerMarkdownPostProcessor(this.stampProcessor.bind(this));
    this.registerMarkdownPostProcessor(this.calloutProcessor.bind(this));
    this.registerMarkdownPostProcessor(this.dropcapProcessor.bind(this));

    // 3. Editor commands — insert Presswork callout blocks
    this.addCommand({
      id: 'insert-pw-stamp',
      name: 'Insert stamp callout',
      editorCallback: (editor: Editor) => {
        editor.replaceSelection('> [!pw-stamp] Approved\n');
        editor.focus();
      },
    });

    this.addCommand({
      id: 'insert-pw-pull-quote',
      name: 'Insert pull-quote callout',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        const content = selection.trim() || 'Your pull quote here.';
        editor.replaceSelection(`> [!pw-pull-quote]\n> ${content}\n`);
        editor.focus();
      },
    });

    this.addCommand({
      id: 'insert-pw-telegram',
      name: 'Insert telegram callout',
      editorCallback: (editor: Editor) => {
        const date = new Date().toISOString().slice(0, 10);
        editor.replaceSelection(
          `> [!pw-telegram] MEMO — ${date}\n> YOUR MESSAGE HERE. STOP.\n`
        );
        editor.focus();
      },
    });

    this.addCommand({
      id: 'insert-pw-sheet',
      name: 'Insert sheet (paper card) callout',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        const content = selection.trim() || 'Card content.';
        editor.replaceSelection(`> [!pw-sheet]\n> ${content}\n`);
        editor.focus();
      },
    });

    this.addCommand({
      id: 'insert-pw-index-card',
      name: 'Insert index card callout',
      editorCallback: (editor: Editor) => {
        editor.replaceSelection(
          '> [!pw-index-card] Card Title\n> Card content on ruled lines.\n'
        );
        editor.focus();
      },
    });

    this.addCommand({
      id: 'insert-pw-margin-note',
      name: 'Insert margin note (HTML)',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        const annotated = selection.trim() || 'annotated text';
        editor.replaceSelection(
          `<span class="margin-note">${annotated}<span class="margin-note-content">Your annotation here.</span></span>`
        );
        editor.focus();
      },
    });

    // 4. Settings tab
    this.addSettingTab(new PressworkSettingTab(this.app, this));
  }

  onunload() {
    this.cssLinkEl?.remove();
    this.cssLinkEl = null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ── CSS injection ────────────────────────────────────────────────────────────

  private injectCSS() {
    if (this.cssLinkEl) return;
    const link = document.head.createEl('link', {
      attr: {
        rel: 'stylesheet',
        href: this.settings.pressworkCSSUrl,
        'data-presswork': 'cdn',
      },
    });
    this.cssLinkEl = link;
    this.register(() => {
      this.cssLinkEl?.remove();
      this.cssLinkEl = null;
    });
  }

  // ── Post-processor: stamp badge from frontmatter ─────────────────────────────
  //
  // Only processes the section that contains an H1 element (the first section
  // in a note). Guards against duplicate stamps with .pw-status-stamp check.

  private stampProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableStampRenderer) return;

    const fm = ctx.frontmatter as Record<string, unknown> | null | undefined;
    if (!fm) return;

    const rawStatus = fm[this.settings.stampProperty];
    if (typeof rawStatus !== 'string' || !rawStatus.trim()) return;

    // This section must contain an H1
    const h1 = el.querySelector('h1');
    if (!h1) return;

    // Prevent duplicate stamps if the processor runs again (e.g. on hot-reload)
    const previewEl = el.closest('.markdown-preview-view') ?? el.closest('.view-content') ?? el;
    if (previewEl.querySelector('.pw-status-stamp')) return;

    const status = rawStatus.trim();
    const normalised = status.toLowerCase().replace(/\s+/g, '-');
    const extraClasses = this.settings.stampStatusMap[normalised] ?? '';

    const stamp = document.createElement('span');
    stamp.className = ['stamp', extraClasses, 'pw-status-stamp']
      .filter(Boolean)
      .join(' ');
    stamp.textContent = status;
    stamp.style.marginLeft = '0.75rem';
    stamp.style.verticalAlign = 'middle';

    h1.insertAdjacentElement('afterend', stamp);
  }

  // ── Post-processor: callout → Presswork component ────────────────────────────
  //
  // Supported callout types (prefix: pw-):
  //   stamp, pull-quote, telegram, sheet, margin-note, index-card

  private calloutProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableCalloutEnhancement) return;

    const callouts = el.querySelectorAll<HTMLElement>('[data-callout^="pw-"]');

    callouts.forEach(callout => {
      const type = (callout.dataset.callout ?? '').replace(/^pw-/, '');
      const titleEl = callout.querySelector<HTMLElement>('.callout-title-inner');
      const contentEl = callout.querySelector<HTMLElement>('.callout-content');

      let replacement: HTMLElement | null = null;

      switch (type) {
        case 'stamp': {
          const text = titleEl?.textContent?.trim() ?? '';
          const cls = text.toLowerCase().replace(/\s+/g, '-');
          replacement = document.createElement('span');
          replacement.className = `stamp stamp--${cls}`;
          replacement.textContent = text;
          break;
        }

        case 'pull-quote': {
          replacement = document.createElement('blockquote');
          replacement.className = 'pull-quote';
          if (contentEl) replacement.innerHTML = contentEl.innerHTML;
          break;
        }

        case 'telegram': {
          replacement = document.createElement('div');
          replacement.className = 'telegram';

          if (titleEl) {
            const header = document.createElement('div');
            header.className = 'telegram-header';
            header.textContent = titleEl.textContent ?? '';
            replacement.appendChild(header);
          }
          if (contentEl) {
            const body = document.createElement('div');
            body.className = 'telegram-body';
            body.innerHTML = contentEl.innerHTML;
            replacement.appendChild(body);
          }
          break;
        }

        case 'sheet': {
          replacement = document.createElement('div');
          replacement.className = 'sheet';
          if (contentEl) replacement.innerHTML = contentEl.innerHTML;
          break;
        }

        case 'margin-note': {
          // Renders as a block aside (not the hover variant — that requires
          // inline HTML syntax in the note body)
          replacement = document.createElement('aside');
          replacement.className = 'sheet sheet--compact';
          replacement.style.borderLeft = '3px solid var(--pw-ink-vermillion)';
          replacement.style.fontStyle = 'italic';
          replacement.style.fontFamily = 'var(--pw-font-display)';
          if (titleEl) {
            const label = document.createElement('small');
            label.style.fontFamily = 'var(--pw-font-mono)';
            label.style.textTransform = 'uppercase';
            label.style.letterSpacing = '0.1em';
            label.style.fontSize = '0.625rem';
            label.style.display = 'block';
            label.style.marginBottom = '0.5rem';
            label.textContent = titleEl.textContent ?? 'Note';
            replacement.appendChild(label);
          }
          if (contentEl) {
            const inner = document.createElement('div');
            inner.innerHTML = contentEl.innerHTML;
            replacement.appendChild(inner);
          }
          break;
        }

        case 'index-card': {
          replacement = document.createElement('div');
          replacement.className = 'index-card';
          if (titleEl) {
            const title = document.createElement('div');
            title.className = 'index-card-title';
            title.textContent = titleEl.textContent ?? '';
            replacement.appendChild(title);
          }
          if (contentEl) {
            const body = document.createElement('div');
            body.className = 'index-card-body';
            body.innerHTML = contentEl.innerHTML;
            replacement.appendChild(body);
          }
          break;
        }
      }

      if (replacement) {
        callout.replaceWith(replacement);
      }
    });
  }

  // ── Post-processor: dropcap on first paragraph ───────────────────────────────
  //
  // Adds .dropcap to the first <p> element in a note when frontmatter
  // contains `dropcap: true`. Guards against adding the class twice.

  private dropcapProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableDropcaps) return;

    const fm = ctx.frontmatter as Record<string, unknown> | null | undefined;
    if (!fm?.dropcap) return;

    // Only add dropcap to the first paragraph across the whole note
    const previewEl = el.closest('.markdown-preview-view') ?? el.closest('.view-content') ?? el;
    if (previewEl.querySelector('.dropcap')) return;

    // The first <p> in the current section
    const firstP = el.querySelector<HTMLElement>('p');
    if (!firstP) return;

    // If this is the very first paragraph in the view, apply dropcap
    const allP = previewEl.querySelectorAll('p');
    if (allP.length > 0 && allP[0] !== firstP) return;

    firstP.classList.add('dropcap');
  }
}
