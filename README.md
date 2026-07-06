# Calibre Bridge

An [Obsidian](https://obsidian.md) plugin that connects your [Calibre](https://calibre-ebook.com) library to Obsidian. With a single command you can import selected books — each gets its own note with a cover image, description, and metadata (series, rating, tags…).

Re-importing is safe: your notes and reading status are never touched — only the data coming from Calibre is refreshed.

---

## What it does

For each imported book the plugin creates a note in your vault:

- **Frontmatter** with metadata: title, authors, series, rating, tags, ISBN, date added…
- **Cover image** (downloaded from the Calibre server)
- **Book description** (from Calibre, converted to Markdown)
- **Your space** below the description — write whatever you want there, the plugin will never touch it

The reading status (`status`, `date_started`, `date_finished`) is yours to manage and will never be overwritten on re-import.

---

## Requirements

- Calibre 5.0 or newer
- Obsidian 1.6 or newer
- Works on desktop and mobile

---

## Installation

### From the community plugin directory (recommended)

1. In Obsidian go to **Settings → Community plugins → Browse**.
2. Search for **Calibre Bridge**.
3. Click **Install**, then **Enable**.

### Beta install via BRAT

If the plugin is not yet in the community directory, install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable the **BRAT** plugin.
2. Open **Settings → BRAT → Add Beta plugin**.
3. Enter `P24L/calibre-bridge` and click **Add plugin**.
4. Enable **Calibre Bridge** in **Settings → Community plugins**.

### Manual install

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](../../releases/latest).
2. Open your vault folder and navigate to `.obsidian/plugins/`.
3. Create a new folder called `calibre-bridge` inside it.
4. Copy the three downloaded files into that folder.
5. In Obsidian go to **Settings → Community plugins**, click **Reload**, and enable **Calibre Bridge**.

---

## Step 1: Start the Content Server in Calibre

Calibre has a built-in HTTP server that the plugin uses to read your data. It needs to be running whenever you want to import.

**To start it:** In Calibre click **Connect/share → Start Content Server**.

The server runs on port **8080** by default. The address will look something like `http://192.168.1.10:8080` — you can find your machine's IP address in the Calibre sharing settings or your system's network settings.

**Start automatically:** If you want the server to start with Calibre, go to **Preferences → Sharing → Sharing over the net** and check *Start the Content server automatically at startup*.

### Password protection (optional)

If Calibre is reachable from outside your home network or you want to restrict access, set up a password: **Preferences → Sharing → Sharing over the net → Require username and password**.

---

## Step 2: Configure the plugin

Go to **Settings → Calibre Bridge**.

**Server URL** — enter the address of your Calibre server, e.g. `http://192.168.1.10:8080`. If you access Calibre over Tailscale or another VPN, use the appropriate IP address.

**Username / Password** — fill in only if you set up a password in Calibre.

> **Note:** Credentials are stored in plaintext in `.obsidian/plugins/calibre-bridge/data.json`. Do not sync your vault to untrusted locations if you use a password.

**Library** — libraries are fetched automatically once you enter the URL. If you have more than one library, pick the right one from the dropdown.

**Book folder** and **Cover folder** — where notes and cover images are saved. Defaults to `Books` and `Books/covers`.

---

## Step 3: Import books

1. Open the command palette (`Cmd+P` on Mac, `Ctrl+P` on Windows/Linux).
2. Run **Calibre Bridge: Import books from Calibre**.
3. A list of all books in your Calibre library appears — search by title or author.
4. Select the books you want (click a row or the checkbox).
5. Click **Import N books**.

The notes will appear in your `Books` folder.

### Re-importing

If you update metadata in Calibre or want to refresh a description, just run the import again. The plugin recognises which books are already in your vault and updates them — your reading status and notes are left untouched.

---

## Note structure

Each book note has two zones:

| Zone | Who controls it |
|---|---|
| Frontmatter — Calibre fields (title, authors, tags…) | Plugin — refreshed on every re-import |
| Frontmatter — reading fields (status, date_started, date_finished) | You — never touched by the plugin |
| Body between `<!-- calibre:begin -->` and `<!-- calibre:end -->` | Plugin — cover + description |
| Everything after `<!-- calibre:end -->` | You — your notes, forever safe |

### Calibre-owned frontmatter fields

These are overwritten every time you re-import: `title`, `authors`, `series`, `series_index`, `rating`, `tags`, `publisher`, `published`, `language`, `isbn`, `calibre_uuid`, `calibre_id`, `date_added`, `cover`.

> **Tags caveat:** The `tags` field comes from Calibre. If you add values to `tags` manually in a note's frontmatter, they will be overwritten on the next re-import. Use a separate field (e.g. `my_tags`) for your own tagging.

### Reading status fields

Set these yourself — the plugin never overwrites them:

| Field | Type | Values |
|---|---|---|
| `status` | text | `unread` · `reading` · `read` · `did-not-finish` |
| `date_started` | date | YYYY-MM-DD |
| `date_finished` | date | YYYY-MM-DD |

---

## Library overview (Obsidian Bases)

Run **Calibre Bridge: Create library overview** from the command palette to generate a `Library.base` file in your book folder. It gives you a ready-made Bases view of all imported books with five tabs:

| View | Shows |
|---|---|
| All Books | Your full library, sorted by date added |
| Reading | Books with status `reading` |
| Unread | Books with status `unread` |
| Read | Books with status `read` |
| Did Not Finish | Books with status `did-not-finish` |

---

## Permissions and data access

**Network:** The plugin connects only to the Calibre Content Server at the URL you configure in settings. No other servers or external services are contacted. All requests use Obsidian's built-in `requestUrl` function.

**Vault files:** The plugin scans note frontmatter in your configured book folder to detect which books have already been imported (matched by `calibre_uuid`). This is required to update existing notes instead of creating duplicates. No file content outside the book folder is read or modified.

---

## License

MIT — see [LICENSE](LICENSE).
