var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PressworkPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enableStampRenderer: true,
  stampProperty: "status",
  stampStatusMap: {
    "approved": "stamp--approved",
    "published": "stamp--approved",
    "draft": "stamp--draft",
    "in-progress": "stamp--draft stamp--goldenrod",
    "urgent": "stamp--urgent",
    "archived": "stamp--archived",
    "review": "stamp--draft stamp--cornflower",
    "wip": "stamp--draft stamp--goldenrod",
    "done": "stamp--approved stamp--olive"
  },
  enableCalloutEnhancement: true,
  enableDropcaps: true,
  loadPressworkCSS: true,
  pressworkCSSUrl: "https://unpkg.com/presswork/dist/presswork.min.css"
};
var PressworkSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Load Presswork CSS").setDesc(
      "Automatically loads presswork.min.css from the CDN. Disable this if you are already using the Presswork CSS snippet."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.loadPressworkCSS).onChange(async (value) => {
        this.plugin.settings.loadPressworkCSS = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.loadPressworkCSS) {
      new import_obsidian.Setting(containerEl).setName("Presswork CSS URL").setDesc(
        "CDN URL or obsidian:// vault resource path. Default: https://unpkg.com/presswork/dist/presswork.min.css"
      ).addText(
        (text) => text.setPlaceholder("https://unpkg.com/presswork/dist/presswork.min.css").setValue(this.plugin.settings.pressworkCSSUrl).onChange(async (value) => {
          this.plugin.settings.pressworkCSSUrl = value;
          await this.plugin.saveSettings();
        })
      );
    }
    containerEl.createEl("hr");
    new import_obsidian.Setting(containerEl).setName("Stamp renderer").setDesc(
      "Reads a frontmatter property and inserts a .stamp badge after the first heading in Reading View."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableStampRenderer).onChange(async (value) => {
        this.plugin.settings.enableStampRenderer = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Frontmatter property").setDesc("Which frontmatter key to read for the stamp (default: status).").addText(
      (text) => text.setPlaceholder("status").setValue(this.plugin.settings.stampProperty).onChange(async (value) => {
        this.plugin.settings.stampProperty = value.trim() || "status";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Status \u2192 stamp class map").setDesc(
      'JSON map of lowercase status values to additional .stamp modifier classes. Example: {"approved":"stamp--approved","draft":"stamp--draft"}'
    ).addTextArea((area) => {
      area.inputEl.rows = 8;
      area.inputEl.style.fontFamily = "monospace";
      area.inputEl.style.fontSize = "0.8rem";
      area.setValue(JSON.stringify(this.plugin.settings.stampStatusMap, null, 2)).onChange(async (value) => {
        try {
          const parsed = JSON.parse(value);
          this.plugin.settings.stampStatusMap = parsed;
          await this.plugin.saveSettings();
          area.inputEl.style.borderColor = "";
        } catch (e) {
          area.inputEl.style.borderColor = "var(--color-red)";
        }
      });
    });
    containerEl.createEl("hr");
    new import_obsidian.Setting(containerEl).setName("Callout enhancement").setDesc(
      "Converts [!pw-stamp], [!pw-pull-quote], [!pw-telegram], [!pw-sheet], [!pw-margin-note], and [!pw-index-card] callouts into their Presswork HTML equivalents in Reading View."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableCalloutEnhancement).onChange(async (value) => {
        this.plugin.settings.enableCalloutEnhancement = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("hr");
    new import_obsidian.Setting(containerEl).setName("Dropcap rendering").setDesc(
      "Adds .dropcap to the first paragraph of a note when its frontmatter contains `dropcap: true`."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableDropcaps).onChange(async (value) => {
        this.plugin.settings.enableDropcaps = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/main.ts
var PressworkPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    // Injected <link> element for CDN CSS — kept so we can remove it on unload
    this.cssLinkEl = null;
  }
  async onload() {
    await this.loadSettings();
    if (this.settings.loadPressworkCSS) {
      this.injectCSS();
    }
    this.registerMarkdownPostProcessor(this.stampProcessor.bind(this));
    this.registerMarkdownPostProcessor(this.calloutProcessor.bind(this));
    this.registerMarkdownPostProcessor(this.dropcapProcessor.bind(this));
    this.addCommand({
      id: "insert-pw-stamp",
      name: "Insert stamp callout",
      editorCallback: (editor) => {
        editor.replaceSelection("> [!pw-stamp] Approved\n");
        editor.focus();
      }
    });
    this.addCommand({
      id: "insert-pw-pull-quote",
      name: "Insert pull-quote callout",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        const content = selection.trim() || "Your pull quote here.";
        editor.replaceSelection(`> [!pw-pull-quote]
> ${content}
`);
        editor.focus();
      }
    });
    this.addCommand({
      id: "insert-pw-telegram",
      name: "Insert telegram callout",
      editorCallback: (editor) => {
        const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        editor.replaceSelection(
          `> [!pw-telegram] MEMO \u2014 ${date}
> YOUR MESSAGE HERE. STOP.
`
        );
        editor.focus();
      }
    });
    this.addCommand({
      id: "insert-pw-sheet",
      name: "Insert sheet (paper card) callout",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        const content = selection.trim() || "Card content.";
        editor.replaceSelection(`> [!pw-sheet]
> ${content}
`);
        editor.focus();
      }
    });
    this.addCommand({
      id: "insert-pw-index-card",
      name: "Insert index card callout",
      editorCallback: (editor) => {
        editor.replaceSelection(
          "> [!pw-index-card] Card Title\n> Card content on ruled lines.\n"
        );
        editor.focus();
      }
    });
    this.addCommand({
      id: "insert-pw-margin-note",
      name: "Insert margin note (HTML)",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        const annotated = selection.trim() || "annotated text";
        editor.replaceSelection(
          `<span class="margin-note">${annotated}<span class="margin-note-content">Your annotation here.</span></span>`
        );
        editor.focus();
      }
    });
    this.addSettingTab(new PressworkSettingTab(this.app, this));
  }
  onunload() {
    var _a;
    (_a = this.cssLinkEl) == null ? void 0 : _a.remove();
    this.cssLinkEl = null;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // ── CSS injection ────────────────────────────────────────────────────────────
  injectCSS() {
    if (this.cssLinkEl) return;
    const link = document.head.createEl("link", {
      attr: {
        rel: "stylesheet",
        href: this.settings.pressworkCSSUrl,
        "data-presswork": "cdn"
      }
    });
    this.cssLinkEl = link;
    this.register(() => {
      var _a;
      (_a = this.cssLinkEl) == null ? void 0 : _a.remove();
      this.cssLinkEl = null;
    });
  }
  // ── Post-processor: stamp badge from frontmatter ─────────────────────────────
  //
  // Only processes the section that contains an H1 element (the first section
  // in a note). Guards against duplicate stamps with .pw-status-stamp check.
  stampProcessor(el, ctx) {
    var _a, _b, _c;
    if (!this.settings.enableStampRenderer) return;
    const fm = ctx.frontmatter;
    if (!fm) return;
    const rawStatus = fm[this.settings.stampProperty];
    if (typeof rawStatus !== "string" || !rawStatus.trim()) return;
    const h1 = el.querySelector("h1");
    if (!h1) return;
    const previewEl = (_b = (_a = el.closest(".markdown-preview-view")) != null ? _a : el.closest(".view-content")) != null ? _b : el;
    if (previewEl.querySelector(".pw-status-stamp")) return;
    const status = rawStatus.trim();
    const normalised = status.toLowerCase().replace(/\s+/g, "-");
    const extraClasses = (_c = this.settings.stampStatusMap[normalised]) != null ? _c : "";
    const stamp = document.createElement("span");
    stamp.className = ["stamp", extraClasses, "pw-status-stamp"].filter(Boolean).join(" ");
    stamp.textContent = status;
    stamp.style.marginLeft = "0.75rem";
    stamp.style.verticalAlign = "middle";
    h1.insertAdjacentElement("afterend", stamp);
  }
  // ── Post-processor: callout → Presswork component ────────────────────────────
  //
  // Supported callout types (prefix: pw-):
  //   stamp, pull-quote, telegram, sheet, margin-note, index-card
  calloutProcessor(el, ctx) {
    if (!this.settings.enableCalloutEnhancement) return;
    const callouts = el.querySelectorAll('[data-callout^="pw-"]');
    callouts.forEach((callout) => {
      var _a, _b, _c, _d, _e, _f;
      const type = ((_a = callout.dataset.callout) != null ? _a : "").replace(/^pw-/, "");
      const titleEl = callout.querySelector(".callout-title-inner");
      const contentEl = callout.querySelector(".callout-content");
      let replacement = null;
      switch (type) {
        case "stamp": {
          const text = (_c = (_b = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _b.trim()) != null ? _c : "";
          const cls = text.toLowerCase().replace(/\s+/g, "-");
          replacement = document.createElement("span");
          replacement.className = `stamp stamp--${cls}`;
          replacement.textContent = text;
          break;
        }
        case "pull-quote": {
          replacement = document.createElement("blockquote");
          replacement.className = "pull-quote";
          if (contentEl) replacement.innerHTML = contentEl.innerHTML;
          break;
        }
        case "telegram": {
          replacement = document.createElement("div");
          replacement.className = "telegram";
          if (titleEl) {
            const header = document.createElement("div");
            header.className = "telegram-header";
            header.textContent = (_d = titleEl.textContent) != null ? _d : "";
            replacement.appendChild(header);
          }
          if (contentEl) {
            const body = document.createElement("div");
            body.className = "telegram-body";
            body.innerHTML = contentEl.innerHTML;
            replacement.appendChild(body);
          }
          break;
        }
        case "sheet": {
          replacement = document.createElement("div");
          replacement.className = "sheet";
          if (contentEl) replacement.innerHTML = contentEl.innerHTML;
          break;
        }
        case "margin-note": {
          replacement = document.createElement("aside");
          replacement.className = "sheet sheet--compact";
          replacement.style.borderLeft = "3px solid var(--pw-ink-vermillion)";
          replacement.style.fontStyle = "italic";
          replacement.style.fontFamily = "var(--pw-font-display)";
          if (titleEl) {
            const label = document.createElement("small");
            label.style.fontFamily = "var(--pw-font-mono)";
            label.style.textTransform = "uppercase";
            label.style.letterSpacing = "0.1em";
            label.style.fontSize = "0.625rem";
            label.style.display = "block";
            label.style.marginBottom = "0.5rem";
            label.textContent = (_e = titleEl.textContent) != null ? _e : "Note";
            replacement.appendChild(label);
          }
          if (contentEl) {
            const inner = document.createElement("div");
            inner.innerHTML = contentEl.innerHTML;
            replacement.appendChild(inner);
          }
          break;
        }
        case "index-card": {
          replacement = document.createElement("div");
          replacement.className = "index-card";
          if (titleEl) {
            const title = document.createElement("div");
            title.className = "index-card-title";
            title.textContent = (_f = titleEl.textContent) != null ? _f : "";
            replacement.appendChild(title);
          }
          if (contentEl) {
            const body = document.createElement("div");
            body.className = "index-card-body";
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
  dropcapProcessor(el, ctx) {
    var _a, _b;
    if (!this.settings.enableDropcaps) return;
    const fm = ctx.frontmatter;
    if (!(fm == null ? void 0 : fm.dropcap)) return;
    const previewEl = (_b = (_a = el.closest(".markdown-preview-view")) != null ? _a : el.closest(".view-content")) != null ? _b : el;
    if (previewEl.querySelector(".dropcap")) return;
    const firstP = el.querySelector("p");
    if (!firstP) return;
    const allP = previewEl.querySelectorAll("p");
    if (allP.length > 0 && allP[0] !== firstP) return;
    firstP.classList.add("dropcap");
  }
};
