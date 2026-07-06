# Calibre Bridge — Obsidian Plugin

Import books from your [Calibre](https://calibre-ebook.com) library into Obsidian as structured Markdown notes. Each book gets its own note with YAML frontmatter (title, authors, series, rating, tags, …), the cover image, and the book description — ready to be browsed with Obsidian Bases or Dataview.

Re-importing a book **updates** Calibre-owned metadata without touching your own notes, reading status, or anything you wrote below the description.

---

## How it works

The plugin connects to the **Calibre Content Server** (Calibre's built-in HTTP server) and reads book metadata via the `/ajax/` JSON API. It does not write anything back to Calibre — it is purely read-only from Calibre's side.

For each imported book the plugin creates (or updates) a Markdown note:

```
---
title: The Name of the Wind
authors:
  - "Patrick Rothfuss"
series: Kingkiller Chronicle
series_index: 1
rating: 4.5
tags:
  - Fantasy
  - Fiction
publisher: DAW Books
published: 2007-03-27
language: en
isbn: "9780756404741"
calibre_uuid: 3f8a1c2d-…
calibre_id: 42
date_added: 2023-11-15
cover: "[[Books/covers/3f8a1c2d-….jpg]]"
status: unread
date_started:
date_finished:
---

![[Books/covers/3f8a1c2d-….jpg]]

<!-- calibre:begin -->
## Description
Patrick Rothfuss's debut novel…
<!-- calibre:end -->

<!-- everything below this line is yours; it is never touched on re-import -->

My notes about the book…
```

**Two layers of data:**

| Key group | Keys | On re-import |
|---|---|---|
| Calibre-owned | title, authors, series, rating, tags, cover, … | **Always overwritten** |
| User-owned | status, date_started, date_finished | **Never touched** |
| Free space | anything below `<!-- calibre:end -->` | **Never touched** |

> **Note on `tags`:** Calibre owns the `tags` field. Any tags you add manually to a book note's frontmatter will be overwritten on re-import. Use a separate frontmatter key (e.g. `my_tags`) for personal tags.

---

## Requirements

- **Calibre** 5.0 or newer with the Content Server enabled
- **Obsidian** 1.6 or newer (Bases support)
- Desktop only (uses Node.js file system APIs)

---

## Setting up the Calibre Content Server

### 1. Enable the Content Server

Open Calibre and go to **Preferences → Sharing → Sharing over the net**.

![Calibre Preferences menu](https://user-images.githubusercontent.com/150803/143490663-afc3b418-a36e-422a-bab7-97b09237b507.png)

Check **Start the Content server** and note the port (default: **8080**).

Alternatively, start it on demand from the toolbar: **Connect/Share → Start Content Server**.

### 2. Find the server address

The server URL is shown at the bottom of the Sharing preferences pane, e.g. `http://192.168.1.10:8080`. You can also use a hostname or a Tailscale IP if you're accessing it remotely.

### 3. (Optional) Set up authentication

In the same Sharing preferences pane, enable **Require username and password** and add a user. You will enter the same credentials in the plugin settings.

### 4. (Optional) Start the server automatically

On the **Advanced** tab of the Sharing preferences you can configure Calibre to start the Content Server automatically when Calibre launches.

---

## Installing the plugin

### From a release (recommended)

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](../../releases/latest).
2. Create the folder `<YourVault>/.obsidian/plugins/calibre-bridge/`.
3. Copy the three files into that folder.
4. In Obsidian: **Settings → Community plugins → Installed plugins** → enable **Calibre Bridge**.

### From source

```bash
git clone https://github.com/P24L/calibre-bridge.git
cd calibre-bridge
npm install
npm run build
```

Then copy `main.js`, `styles.css`, and `manifest.json` to `<YourVault>/.obsidian/plugins/calibre-bridge/`.

---

## Configuration

Open **Settings → Calibre Bridge**.

| Setting | Description | Default |
|---|---|---|
| Server URL | Base URL of the Calibre Content Server | `http://192.168.0.25:8080` |
| Username | Optional — only if auth is enabled in Calibre | *(empty)* |
| Password | Optional — stored in plaintext in plugin data | *(empty)* |
| Library | Auto-fetched when settings open; select one if you have multiple | *(auto)* |
| Book folder | Vault folder for generated notes | `Books` |
| Cover folder | Vault folder for cover images | `Books/covers` |
| Download covers | Whether to download and embed cover images | on |

The library list is fetched automatically every time you open the settings page. If there is only one library it is selected automatically.

---

## Importing books

1. Open the **Command palette** (`Cmd/Ctrl+P`).
2. Run **Calibre Bridge: Import books from Calibre**.
3. A modal appears with your full library. Use the search box to filter by title or author.
4. Select the books you want (click a row or the checkbox), then click **Import N books**.
5. A notice will confirm how many notes were created or updated.

### Re-importing

Running the import on a book that already has a note in your vault **updates** it:
- Calibre-owned frontmatter fields (title, authors, rating, …) are refreshed.
- Your `status`, `date_started`, `date_finished`, and any notes you wrote are preserved.
- The cover is re-used if the file already exists; re-downloaded if it was deleted.

---

## Library overview (Bases)

The repository includes `Library.base` — copy it into your vault to get a pre-built Obsidian Bases overview of your imported books, with five views:

| View | Shows |
|---|---|
| Všechny knihy | All books, sorted by date added |
| Čtu | Books with `status: reading` |
| Nepřečtené | Books with `status: unread` |
| Přečtené | Books with `status: read` |
| Nedočtené | Books with `status: did-not-finish` |

The valid values for the `status` field are: `unread`, `reading`, `read`, `did-not-finish`.

---

## Development

```bash
npm install
npm run dev    # watch mode — rebuilds on save
npm run build  # production build
```

Copy the built files to your vault's plugin folder, then reload the plugin in Obsidian (**Ctrl+P → Reload app without saving**).

---

## License

MIT
