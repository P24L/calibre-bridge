import { Notice, Plugin, normalizePath } from "obsidian";
import type { BookRaw } from "./api";
import { CalibreApi } from "./api";
import { htmlToMd } from "./htmlToMd";
import type { BookListItem } from "./importModal";
import { ImportModal } from "./importModal";
import { toCalibreKeys } from "./mapper";
import { buildUuidMap, createNote, saveCover, updateNote } from "./noteWriter";
import { CalibrePluginSettings, CalibreSettingTab, DEFAULT_SETTINGS } from "./settings";

interface InternalMetadataTypeManager {
	setType(prop: string, type: string): void;
	getPropertyInfo(prop: string): { type?: string } | undefined;
}

export default class CalibreBridgePlugin extends Plugin {
	settings!: CalibrePluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerPropertyTypes();
		this.addSettingTab(new CalibreSettingTab(this.app, this));
		this.addCommand({
			id: "calibre-import-books",
			name: "Import books from Calibre",
			callback: () => this.runImport(),
		});
		this.addCommand({
			id: "calibre-create-library-overview",
			name: "Create library overview",
			callback: () => this.createLibraryOverview(),
		});
	}

	private registerPropertyTypes() {
		const mgr = (this.app as unknown as { metadataTypeManager?: InternalMetadataTypeManager })
			.metadataTypeManager;
		if (!mgr) return;

		const register = (prop: string, type: string) => {
			if (!mgr.getPropertyInfo(prop)?.type) {
				mgr.setType(prop, type);
			}
		};

		for (const prop of ["date_started", "date_finished", "published", "date_added"]) {
			register(prop, "date");
		}
		for (const prop of ["rating", "series_index", "calibre_id"]) {
			register(prop, "number");
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<CalibrePluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async createLibraryOverview() {
		const { bookFolder } = this.settings;
		const path = normalizePath(`${bookFolder}/Library.base`);
		const content = buildLibraryBase(bookFolder);
		try {
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing) {
				await this.app.vault.modify(existing as import("obsidian").TFile, content);
			} else {
				await this.app.vault.create(path, content);
			}
			new Notice(`Calibre Bridge: Library overview created at ${path}`);
		} catch (e) {
			new Notice(`Calibre Bridge: Could not create overview — ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	private async runImport() {
		if (!this.settings.serverUrl) {
			new Notice("Calibre Bridge: Please enter a server URL in settings.");
			return;
		}
		if (!this.settings.libraryId) {
			new Notice("Calibre Bridge: Please select a library in settings first.");
			return;
		}

		const api = new CalibreApi(this.settings);
		const fetchNotice = new Notice("Calibre: Fetching book list…", 0);

		try {
			const ids = await api.searchBooks();
			if (ids.length === 0) {
				fetchNotice.hide();
				new Notice("Calibre: No books found in this library.");
				return;
			}

			fetchNotice.setMessage(`Calibre: Fetching metadata for ${ids.length} books…`);
			const allMeta = await api.getBooks(ids);
			fetchNotice.hide();

			const bookList: BookListItem[] = Object.entries(allMeta).map(([id, book]) => ({
				id: Number(id),
				title: book.title ?? "(no title)",
				authors: book.authors ?? [],
			}));
			bookList.sort((a, b) => a.title.localeCompare(b.title));

			new ImportModal(this.app, bookList, (selectedIds) => {
				void this.importBooks(api, allMeta, selectedIds);
			}).open();
		} catch {
			fetchNotice.hide();
			// Error already surfaced via Notice in CalibreApi
		}
	}

	private async importBooks(
		api: CalibreApi,
		allMeta: Record<string, BookRaw>,
		selectedIds: number[]
	): Promise<void> {
		const uuidMap = buildUuidMap(this.app, this.settings);
		let created = 0,
			updated = 0,
			failed = 0;

		const progressNotice = new Notice(
			`Calibre: Importing 0 / ${selectedIds.length}…`,
			0
		);

		for (let i = 0; i < selectedIds.length; i++) {
			const id = selectedIds[i];
			progressNotice.setMessage(
				`Calibre: Importing ${i + 1} / ${selectedIds.length}…`
			);

			try {
				const book = allMeta[String(id)];
				if (!book) {
					failed++;
					continue;
				}

				// Cover: skip download if file already present on disk
				let hasCover = false;
				if (this.settings.downloadCovers) {
					const coverPath = normalizePath(
						`${this.settings.coverFolder}/${book.uuid}.jpg`
					);
					const alreadyExists = await this.app.vault.adapter.exists(coverPath);
					if (alreadyExists) {
						hasCover = true;
					} else {
						const coverData = await api.getCover(id);
						if (coverData) {
							await saveCover(this.app, this.settings, book.uuid, coverData);
							hasCover = true;
						}
					}
				}

				const calibreKeys = toCalibreKeys(book, id, this.settings.coverFolder, hasCover);
				const descMd = htmlToMd(book.comments ?? "");
				const existingFile = uuidMap.get(book.uuid);

				if (existingFile) {
					await updateNote(
						this.app,
						existingFile,
						calibreKeys,
						descMd,
						hasCover,
						this.settings
					);
					updated++;
				} else {
					await createNote(
						this.app,
						book,
						calibreKeys,
						descMd,
						hasCover,
						this.settings
					);
					created++;
				}
			} catch (e) {
				console.error(`Calibre Bridge: Failed to import book ${id}:`, e);
				failed++;
			}
		}

		progressNotice.hide();
		const failMsg = failed > 0 ? `, ${failed} failed` : "";
		new Notice(
			`Calibre import done: ${created} created, ${updated} updated${failMsg}.`
		);
	}
}

function buildLibraryBase(bookFolder: string): string {
	const f = bookFolder;
	return `views:
  - type: table
    name: All Books
    filters:
      and:
        - file.folder == "${f}"
    order:
      - cover
      - title
      - authors
      - status
      - rating
      - date_added
    sort:
      - property: date_added
        direction: DESC

  - type: table
    name: Reading
    filters:
      and:
        - file.folder == "${f}"
        - status == "reading"
    order:
      - cover
      - title
      - authors
      - date_started
    sort:
      - property: date_started
        direction: DESC

  - type: table
    name: Unread
    filters:
      and:
        - file.folder == "${f}"
        - status == "unread"
    order:
      - cover
      - title
      - authors
      - rating
      - date_added
    sort:
      - property: date_added
        direction: DESC

  - type: table
    name: Read
    filters:
      and:
        - file.folder == "${f}"
        - status == "read"
    order:
      - cover
      - title
      - authors
      - rating
      - date_finished
    sort:
      - property: date_finished
        direction: DESC

  - type: table
    name: Did Not Finish
    filters:
      and:
        - file.folder == "${f}"
        - status == "did-not-finish"
    order:
      - cover
      - title
      - authors
`;
}
