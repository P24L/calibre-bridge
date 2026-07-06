# Development

Technical documentation for contributors and developers.

## Architecture

```
src/
├── main.ts          Plugin entry point, import orchestration
├── settings.ts      Settings interface + SettingTab (with auto-fetch)
├── api.ts           Calibre Content Server API client
├── mapper.ts        Raw API response → frontmatter normalization
├── noteWriter.ts    Create / update vault notes
├── importModal.ts   Multi-select book picker modal
└── htmlToMd.ts      Minimal HTML → Markdown converter (no dependencies)
```

### Data flow

```
Command triggered
  → CalibreApi.searchBooks()       GET /ajax/search  → all book IDs
  → CalibreApi.getBooks()          GET /ajax/books   → metadata (chunked, 100/req)
  → ImportModal                    user picks books
  → for each selected book:
      CalibreApi.getCover()        GET /get/cover/<id>  → ArrayBuffer | null
      toCalibreKeys()              normalize metadata
      htmlToMd()                   convert description
      createNote() / updateNote()  write to vault
```

### Note update strategy

Each note is matched by `calibre_uuid` in frontmatter (scanned via `metadataCache`). On update:

1. `app.fileManager.processFrontMatter()` overwrites only Calibre-owned keys; user-owned keys (`status`, `date_started`, `date_finished`) are untouched.
2. The managed body region between `<!-- calibre:begin -->` and `<!-- calibre:end -->` is replaced.
3. Everything after `<!-- calibre:end -->` is preserved verbatim.

### Calibre-owned vs user-owned frontmatter keys

| Calibre-owned (overwritten on re-import) | User-owned (never touched) |
|---|---|
| title, authors, series, series_index | status |
| rating, tags, publisher, published | date_started |
| language, isbn, calibre_uuid, calibre_id | date_finished |
| date_added, cover | |

## Building from source

```bash
git clone https://github.com/P24L/calibre-bridge.git
cd calibre-bridge
npm install
npm run build   # → main.js
```

For development with watch mode:

```bash
npm run dev
```

Copy `main.js`, `styles.css`, and `manifest.json` to `<vault>/.obsidian/plugins/calibre-bridge/` and reload the plugin in Obsidian.

## Calibre Content Server API

All requests go through Obsidian's `requestUrl` (bypasses CORS). Optional Basic auth header is added when credentials are configured.

| Endpoint | Used for |
|---|---|
| `GET /ajax/library-info` | List libraries, get default |
| `GET /ajax/search?query=&num=20000` | Get all book IDs |
| `GET /ajax/books?ids=1,2,3` | Batch metadata (100 IDs per request) |
| `GET /get/cover/<id>` | Cover image (arraybuffer, 404 = no cover) |

### Metadata normalization

- `rating`: Calibre uses 0–10 (half-stars) → stored as 0–5; omitted if 0 or null
- `pubdate` / `timestamp`: ISO datetime → date part only (`slice(0, 10)`); omitted if `0001-01-01`
- Any field that is `null` or the string `"None"` is omitted from frontmatter
- `languages[0]` → `language`
- `identifiers.isbn` → `isbn`

## Release checklist

1. Bump version in `manifest.json` and `package.json`
2. Add entry to `versions.json`
3. `npm run build`
4. `git tag v<version> && git push --tags`
5. `gh release create v<version> main.js styles.css manifest.json`
