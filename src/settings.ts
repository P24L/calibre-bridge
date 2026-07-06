import { App, Notice, PluginSettingTab, Setting, requestUrl } from "obsidian";
import type CalibreBridgePlugin from "./main";

export type FilenameFormat = "title" | "author-title";

export interface CalibrePluginSettings {
	serverUrl: string;
	libraryId: string;
	username: string;
	password: string;
	bookFolder: string;
	coverFolder: string;
	downloadCovers: boolean;
	filenameFormat: FilenameFormat;
}

export const DEFAULT_SETTINGS: CalibrePluginSettings = {
	serverUrl: "http://192.168.0.25:8080",
	libraryId: "",
	username: "",
	password: "",
	bookFolder: "Books",
	coverFolder: "Books/covers",
	downloadCovers: true,
	filenameFormat: "title",
};

export class CalibreSettingTab extends PluginSettingTab {
	private libraryDropdownEl: HTMLSelectElement | null = null;

	constructor(app: App, private plugin: CalibreBridgePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Server URL
		new Setting(containerEl)
			.setName("Server URL")
			.setDesc("Base URL of the Calibre Content Server (no trailing slash).")
			.addText((text) =>
				text
					.setPlaceholder("http://192.168.0.25:8080")
					.setValue(this.plugin.settings.serverUrl)
					.onChange(async (value) => {
						this.plugin.settings.serverUrl = value.trim().replace(/\/$/, "");
						await this.plugin.saveSettings();
					})
			);

		// Auth
		new Setting(containerEl)
			.setName("Authentication (optional)")
			.setDesc("Credentials are stored in plugin data in plaintext.")
			.setHeading();

		new Setting(containerEl)
			.setName("Username")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Password")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setValue(this.plugin.settings.password)
					.onChange(async (value) => {
						this.plugin.settings.password = value;
						await this.plugin.saveSettings();
					});
			});

		// Library
		new Setting(containerEl).setName("Library").setHeading();

		const libSetting = new Setting(containerEl)
			.setName("Library")
			.setDesc("Libraries are fetched automatically. Click the button to refresh.");

		const selectEl = activeDocument.createElement("select");
		selectEl.setCssStyles({ minWidth: "200px" });
		this.libraryDropdownEl = selectEl;

		// Show currently saved library while fetch is in progress
		if (this.plugin.settings.libraryId) {
			const opt = selectEl.createEl("option");
			opt.value = this.plugin.settings.libraryId;
			opt.text = this.plugin.settings.libraryId;
			opt.selected = true;
		} else {
			const opt = selectEl.createEl("option");
			opt.value = "";
			opt.text = "Fetching…";
			opt.disabled = true;
			opt.selected = true;
		}

		selectEl.addEventListener("change", () => {
			this.plugin.settings.libraryId = selectEl.value;
			void this.plugin.saveSettings();
		});

		libSetting.controlEl.appendChild(selectEl);

		libSetting.addButton((btn) =>
			btn
				.setButtonText("Fetch libraries")
				.onClick(async () => {
					await this.fetchLibraries({ silent: false });
				})
		);

		// Folders
		new Setting(containerEl).setName("Vault folders").setHeading();

		new Setting(containerEl)
			.setName("Book folder")
			.setDesc("Vault folder where book notes are created.")
			.addText((text) =>
				text
					.setPlaceholder("Books")
					.setValue(this.plugin.settings.bookFolder)
					.onChange(async (value) => {
						this.plugin.settings.bookFolder = value.trim().replace(/\/$/, "");
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Cover folder")
			.setDesc("Vault folder where cover images are saved.")
			.addText((text) =>
				text
					.setPlaceholder("Books/covers")
					.setValue(this.plugin.settings.coverFolder)
					.onChange(async (value) => {
						this.plugin.settings.coverFolder = value.trim().replace(/\/$/, "");
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Download covers")
			.setDesc("Download cover images when importing books.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.downloadCovers)
					.onChange(async (value) => {
						this.plugin.settings.downloadCovers = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Note filename")
			.setDesc("How new book notes are named. Existing notes are never renamed.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("title", "Title")
					.addOption("author-title", "Author — Title")
					.setValue(this.plugin.settings.filenameFormat)
					.onChange(async (value) => {
						this.plugin.settings.filenameFormat = value as FilenameFormat;
						await this.plugin.saveSettings();
					})
			);

		// Auto-fetch on open if server URL is configured
		if (this.plugin.settings.serverUrl) {
			void this.fetchLibraries({ silent: true });
		}
	}

	async fetchLibraries({ silent }: { silent: boolean }): Promise<void> {
		const { serverUrl, username, password } = this.plugin.settings;
		if (!serverUrl) {
			if (!silent) new Notice("Please enter a server URL first.");
			return;
		}

		try {
			const headers: Record<string, string> = {};
			if (username && password) {
				headers["Authorization"] = "Basic " + btoa(`${username}:${password}`);
			}

			const res = await requestUrl({
				url: `${serverUrl}/ajax/library-info`,
				method: "GET",
				headers,
			});

			const data = res.json as {
				library_map: Record<string, string>;
				default_library: string;
			};

			if (!this.libraryDropdownEl) return;
			const sel = this.libraryDropdownEl;
			const entries = Object.entries(data.library_map);

			sel.empty();
			for (const [id, name] of entries) {
				const opt = sel.createEl("option");
				opt.value = id;
				opt.text = name ? `${name} (${id})` : id;
			}

			// Determine which library to select:
			// 1. Previously saved selection (if still valid)
			// 2. Auto-select if only one library exists
			// 3. Server's default library
			const savedStillValid =
				this.plugin.settings.libraryId &&
				data.library_map[this.plugin.settings.libraryId] !== undefined;

			let toSelect: string;
			if (savedStillValid) {
				toSelect = this.plugin.settings.libraryId;
			} else if (entries.length === 1) {
				toSelect = entries[0][0];
			} else {
				toSelect = data.default_library;
			}

			sel.value = toSelect;
			if (this.plugin.settings.libraryId !== toSelect) {
				this.plugin.settings.libraryId = toSelect;
				await this.plugin.saveSettings();
			}

			if (!silent) {
				const count = entries.length;
				const msg =
					count === 1
						? `1 library found and selected automatically.`
						: `${count} libraries found.`;
				new Notice(`Calibre Bridge: ${msg}`);
			}
		} catch (e) {
			if (silent) return; // Don't disturb user on auto-fetch failure
			const status = (e as { status?: number })?.status;
			if (status === 401) {
				new Notice("Calibre Bridge: Unauthorized (401). Check username and password.");
			} else {
				const msg = e instanceof Error ? e.message : String(e);
				new Notice(`Calibre Bridge: Could not connect — ${msg}`);
			}
		}
	}
}
