import { Notice, Plugin, normalizePath } from "obsidian";
import type { BookRaw } from "./api";
import { CalibreApi } from "./api";
import { htmlToMd } from "./htmlToMd";
import type { BookListItem } from "./importModal";
import { ImportModal } from "./importModal";
import { toCalibreKeys } from "./mapper";
import { buildUuidMap, createNote, saveCover, updateNote } from "./noteWriter";
import { CalibrePluginSettings, CalibreSettingTab, DEFAULT_SETTINGS } from "./settings";

export default class CalibreBridgePlugin extends Plugin {
	settings!: CalibrePluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CalibreSettingTab(this.app, this));
		this.addCommand({
			id: "calibre-import-books",
			name: "Import books from Calibre",
			callback: () => this.runImport(),
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

			new ImportModal(this.app, bookList, async (selectedIds) => {
				await this.importBooks(api, allMeta, selectedIds);
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
