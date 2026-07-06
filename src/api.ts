import { Notice, requestUrl } from "obsidian";
import type { CalibrePluginSettings } from "./settings";

export interface BookRaw {
	title: string;
	authors: string[] | null;
	series: string | null;
	series_index: number | null;
	rating: number | null;
	tags: string[] | null;
	comments: string | null;
	publisher: string | null;
	pubdate: string | null;
	timestamp: string | null;
	languages: string[] | null;
	identifiers: Record<string, string> | null;
	uuid: string;
	formats: string[] | null;
}

export class CalibreApi {
	constructor(private s: CalibrePluginSettings) {}

	private authHeader(): Record<string, string> {
		if (this.s.username && this.s.password) {
			return {
				Authorization: "Basic " + btoa(`${this.s.username}:${this.s.password}`),
			};
		}
		return {};
	}

	private buildUrl(path: string, params: Record<string, string> = {}): string {
		const url = new URL(path, this.s.serverUrl + "/");
		for (const [k, v] of Object.entries(params)) {
			url.searchParams.set(k, v);
		}
		return url.toString();
	}

	private async req<T>(path: string, params: Record<string, string> = {}): Promise<T> {
		const url = this.buildUrl(path, params);
		try {
			const res = await requestUrl({
				url,
				method: "GET",
				headers: this.authHeader(),
			});
			return res.json as T;
		} catch (e) {
			const status = (e as { status?: number })?.status;
			if (status === 401) {
				new Notice(
					"Calibre: Unauthorized (401). Fill in username and password in settings."
				);
			} else {
				new Notice(`Calibre: Request failed — ${e instanceof Error ? e.message : String(e)}`);
			}
			throw e;
		}
	}

	async getLibraryInfo(): Promise<{
		library_map: Record<string, string>;
		default_library: string;
	}> {
		return this.req("/ajax/library-info");
	}

	async searchBooks(num = 20000): Promise<number[]> {
		const data = await this.req<{ book_ids: number[]; total_num: number }>(
			"/ajax/search",
			{
				query: "",
				library_id: this.s.libraryId,
				num: String(num),
			}
		);
		return data.book_ids;
	}

	async getBooks(ids: number[]): Promise<Record<string, BookRaw>> {
		const CHUNK = 100;
		const result: Record<string, BookRaw> = {};

		for (let i = 0; i < ids.length; i += CHUNK) {
			const chunk = ids.slice(i, i + CHUNK);
			const data = await this.req<Record<string, BookRaw>>("/ajax/books", {
				ids: chunk.join(","),
				library_id: this.s.libraryId,
			});
			Object.assign(result, data);
		}

		return result;
	}

	async getCover(bookId: number): Promise<ArrayBuffer | null> {
		const url = this.buildUrl(`/get/cover/${bookId}`, {
			library_id: this.s.libraryId,
		});
		try {
			const res = await requestUrl({
				url,
				method: "GET",
				headers: this.authHeader(),
			});
			return res.arrayBuffer;
		} catch (e) {
			const status = (e as { status?: number })?.status;
			if (status !== 404) {
				console.error(`Calibre: cover fetch failed for book ${bookId}:`, e);
			}
			return null;
		}
	}
}
