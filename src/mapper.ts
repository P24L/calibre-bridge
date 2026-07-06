import type { BookRaw } from "./api";

const NONE_VALUES = new Set(["None", "none", ""]);

function isBlank(v: unknown): boolean {
	return v === null || v === undefined || (typeof v === "string" && NONE_VALUES.has(v));
}

function isoDate(raw: string | null | undefined): string | null {
	if (!raw || NONE_VALUES.has(raw)) return null;
	const date = raw.slice(0, 10);
	if (date === "0001-01-01") return null;
	return date;
}

export function toCalibreKeys(
	book: BookRaw,
	calibreId: number,
	coverFolder: string,
	hasCover: boolean
): Record<string, unknown> {
	const out: Record<string, unknown> = {};

	out.title = book.title;

	if (Array.isArray(book.authors) && book.authors.length > 0) {
		out.authors = book.authors;
	}

	if (!isBlank(book.series)) {
		out.series = book.series;
	}

	if (book.series_index !== null && book.series_index !== undefined) {
		out.series_index = book.series_index;
	}

	if (book.rating !== null && book.rating !== undefined && book.rating !== 0) {
		out.rating = Math.round((book.rating / 2) * 10) / 10;
	}

	if (Array.isArray(book.tags) && book.tags.length > 0) {
		out.tags = book.tags;
	}

	if (!isBlank(book.publisher)) {
		out.publisher = book.publisher;
	}

	const pub = isoDate(book.pubdate);
	if (pub) out.published = pub;

	if (Array.isArray(book.languages) && book.languages.length > 0 && !isBlank(book.languages[0])) {
		out.language = book.languages[0];
	}

	if (book.identifiers?.isbn && !isBlank(book.identifiers.isbn)) {
		out.isbn = book.identifiers.isbn;
	}

	out.calibre_uuid = book.uuid;
	out.calibre_id = calibreId;

	const ts = isoDate(book.timestamp);
	if (ts) out.date_added = ts;

	if (hasCover) {
		out.cover = `[[${coverFolder}/${book.uuid}.jpg]]`;
	}

	return out;
}
