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
- Desktop only (Windows, macOS, Linux)

---

## Step 1: Start the Content Server in Calibre

Calibre has a built-in HTTP server that the plugin uses to read your data. It needs to be running whenever you want to import.

**To start it:** In Calibre click **Connect/share → Start Content Server**.

![Starting the Content Server](https://user-images.githubusercontent.com/150803/143490663-afc3b418-a36e-422a-bab7-97b09237b507.png)

The server runs on port **8080** by default. The address will look something like `http://192.168.1.10:8080` — you can find your machine's IP address in the Calibre sharing settings or your system's network settings.

**Start automatically:** If you want the server to start with Calibre, go to **Preferences → Sharing → Sharing over the net** and check *Start the Content server automatically at startup*.

### Password protection (optional)

If Calibre is reachable from outside your home network or you want to restrict access, set up a password: **Preferences → Sharing → Sharing over the net → Require username and password**.

---

## Step 2: Install the plugin

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](../../releases/latest).
2. Open your vault folder and navigate to the hidden `.obsidian/plugins/` folder.
3. Create a new folder called `calibre-bridge` inside it.
4. Copy the three downloaded files into that folder.
5. In Obsidian go to **Settings → Community plugins**, click **Reload**, and enable **Calibre Bridge**.

---

## Step 3: Configure the plugin

Go to **Settings → Calibre Bridge**.

**Server URL** — enter the address of your Calibre server, e.g. `http://192.168.1.10:8080`. If you access Calibre over Tailscale or another VPN, use the appropriate IP address.

**Username / Password** — fill in only if you set up a password in Calibre.

**Library** — libraries are fetched automatically once you enter the URL. If you have more than one library, pick the right one from the dropdown.

**Book folder** and **Cover folder** — where notes and cover images are saved. Defaults to `Books` and `Books/covers`.

---

## Step 4: Import books

1. Open the command palette (`Cmd+P` on Mac, `Ctrl+P` on Windows/Linux).
2. Run **Calibre Bridge: Import books from Calibre**.
3. A list of all books in your Calibre library appears — search by title or author.
4. Select the books you want (click a row or the checkbox).
5. Click **Import N books**.

The notes will appear in your `Books` folder.

### Re-importing

If you update metadata in Calibre or want to refresh a description, just run the import again. The plugin recognises which books are already in your vault and updates them — your reading status and notes are left untouched.

---

## Library overview (Obsidian Bases)

The repository includes a `Library.base` file — copy it into your vault to get a ready-made Obsidian Bases overview of all your imported books, with five views:

| View | Shows |
|---|---|
| All Books | Your full library, sorted by date added |
| Reading | Books with status `reading` |
| Unread | Books with status `unread` |
| Read | Books with status `read` |
| Did Not Finish | Books with status `did-not-finish` |

Set the reading status directly in a book note's frontmatter — the `status` field. Valid values: `unread`, `reading`, `read`, `did-not-finish`.

---

## License

MIT
