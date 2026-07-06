# Calibre Bridge

Import books from your [Calibre](https://calibre-ebook.com) library as structured notes, complete with cover images, descriptions, and metadata.

Re-importing is safe — your personal notes and reading status are never overwritten, only the Calibre data is refreshed.

## How to use

Enable Calibre's built-in Content Server (**Connect/share → Start Content Server**) and point the plugin at it in settings. Then run **Import books from Calibre** from the command palette, pick any books from the list, and they appear in your vault.

Each book note contains a cover image, description, and frontmatter fields such as title, authors, series, rating, and tags. Three fields are yours to manage and will never be touched on re-import: `status`, `date_started`, and `date_finished`.

Run **Create library overview** to generate a Bases file in your book folder with five pre-built views — All Books, Reading, Unread, Read, and Did Not Finish — filtered automatically by reading status.

> **Note on tags:** The `tags` field is sourced from Calibre and overwritten on re-import. Use a separate field (e.g. `my_tags`) for your own tags.

## Installation

The recommended way to install Calibre Bridge is to search for it in the community plugin browser (**Settings → Community plugins → Browse**).

Pre-release versions can be installed via [BRAT](https://github.com/TfTHacker/obsidian42-brat) using `P24L/calibre-bridge`, or manually by copying `main.js`, `styles.css`, and `manifest.json` from the [latest release](../../releases/latest) into `.obsidian/plugins/calibre-bridge/`.

## Permissions and data access

The plugin connects only to the Calibre Content Server you configure — no external services are contacted. It also scans frontmatter in your book folder to detect already-imported notes; no files outside that folder are read or modified. If you use a Calibre password, credentials are stored in plaintext in the plugin's data file.

## License

MIT — see [LICENSE](LICENSE).
