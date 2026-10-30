# Presswork

Applies the Presswork print-inspired design system to Obsidian — stamp badges from frontmatter, callout-to-component conversion, dropcap rendering, and editor insert commands.

## Use

Use the command palette to insert a stamp, pull quote, telegram, sheet, index card, or margin note. In Reading view, the plugin can render a stamp from a frontmatter property, enhance `pw-*` callouts, and apply drop caps when `dropcap: true` is set. Control each behavior under **Settings → Presswork**.

## Network use

By default, Presswork loads its stylesheet from `unpkg.com`. You can disable **Load Presswork CSS** if you already use the Presswork CSS snippet, or change the stylesheet URL in settings. The note content is not sent to the CDN; loading the stylesheet makes a normal network request from the app.

## Install manually

Run `npm ci && npm run build`, then copy `manifest.json`, `main.js`, and `styles.css` into `<vault>/.obsidian/plugins/presswork/`. Enable the plugin under **Settings → Community plugins**.

## Source

The TypeScript source is in `src/`. Run `npm ci` and `npm run build` to generate `main.js`.

## License

MIT. See [LICENSE](LICENSE).
