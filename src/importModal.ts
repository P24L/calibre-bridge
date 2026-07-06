import { App, Modal } from "obsidian";

export interface BookListItem {
	id: number;
	title: string;
	authors: string[];
}

export class ImportModal extends Modal {
	private selected = new Set<number>();
	private filtered: BookListItem[] = [];
	private listEl!: HTMLElement;
	private countEl!: HTMLElement;
	private importBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private books: BookListItem[],
		private onConfirm: (ids: number[]) => void
	) {
		super(app);
		this.filtered = [...books];
	}

	onOpen(): void {
		this.modalEl.addClass("calibre-import-modal");
		const { contentEl } = this;
		contentEl.empty();

		// Search row
		const searchRow = contentEl.createDiv({ cls: "calibre-search-row" });

		const searchInput = searchRow.createEl("input", {
			cls: "calibre-search-input",
			attr: { type: "text", placeholder: "Search books…" },
		});

		const selectAllBtn = searchRow.createEl("button", { text: "Select all" });
		selectAllBtn.addEventListener("click", () => {
			const allSelected = this.filtered.every((b) => this.selected.has(b.id));
			if (allSelected) {
				this.filtered.forEach((b) => this.selected.delete(b.id));
				selectAllBtn.textContent = "Select all";
			} else {
				this.filtered.forEach((b) => this.selected.add(b.id));
				selectAllBtn.textContent = "Deselect all";
			}
			this.renderList();
			this.updateCount();
		});

		searchInput.addEventListener("input", () => {
			const q = searchInput.value.toLowerCase();
			this.filtered = q
				? this.books.filter(
						(b) =>
							b.title.toLowerCase().includes(q) ||
							b.authors.some((a) => a.toLowerCase().includes(q))
					)
				: [...this.books];
			this.renderList();
		});

		// Book list
		this.listEl = contentEl.createDiv({ cls: "calibre-book-list" });
		this.renderList();

		// Footer
		const footer = contentEl.createDiv({ cls: "calibre-footer" });
		this.countEl = footer.createSpan({ cls: "calibre-footer-count" });

		const btnRow = footer.createDiv({ attr: { style: "display:flex;gap:8px" } });

		const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		this.importBtn = btnRow.createEl("button", { text: "Import", cls: "mod-cta" });
		this.importBtn.addEventListener("click", () => {
			this.onConfirm(Array.from(this.selected));
			this.close();
		});

		this.updateCount();
	}

	private renderList(): void {
		this.listEl.empty();
		for (const book of this.filtered) {
			const row = this.listEl.createDiv({ cls: "calibre-book-item" });
			const checkbox = row.createEl("input", {
				attr: { type: "checkbox", id: `cb-${book.id}` },
			}) as HTMLInputElement;
			checkbox.checked = this.selected.has(book.id);

			const authorStr = book.authors.length > 0 ? book.authors[0] : "Unknown";
			row.createEl("label", {
				text: `${book.title} — ${authorStr}`,
				attr: { for: `cb-${book.id}` },
			});

			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.selected.add(book.id);
				} else {
					this.selected.delete(book.id);
				}
				this.updateCount();
			});

			row.addEventListener("click", (e) => {
				if ((e.target as HTMLElement).tagName !== "INPUT") {
					checkbox.checked = !checkbox.checked;
					checkbox.dispatchEvent(new Event("change"));
				}
			});
		}
	}

	private updateCount(): void {
		const n = this.selected.size;
		this.countEl.textContent = `${n} of ${this.books.length} selected`;
		this.importBtn.textContent = n > 0 ? `Import ${n} book${n === 1 ? "" : "s"}` : "Import";
		this.importBtn.disabled = n === 0;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
