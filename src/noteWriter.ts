import { App, TFile, normalizePath } from "obsidian";
import type { BookRaw } from "./api";
import type { CalibrePluginSettings } from "./settings";

const BEGIN_MARKER = "<!-- calibre:begin -->";
const END_MARKER = "<!-- calibre:end -->";

export function sanitizeFilename(name: string): string {
	return name
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 100);
}

async function resolveNewFilePath(
	app: App,
	book: BookRaw,
	settings: CalibrePluginSettings
): Promise<string> {
	const title = sanitizeFilename(book.title);
	const author = book.authors?.[0] ? sanitizeFilename(book.authors[0]) : null;
	const { bookFolder, filenameFormat } = settings;

	const tryPath = (name: string) => normalizePath(`${bookFolder}/${name}.md`);

	if (filenameFormat === "author-title") {
		const base = author ? `${author} — ${title}` : title;
		if (!app.vault.getAbstractFileByPath(tryPath(base))) return tryPath(base);
		for (let n = 2; n < 100; n++) {
			const s = `${base} ${n}`;
			if (!app.vault.getAbstractFileByPath(tryPath(s))) return tryPath(s);
		}
		return tryPath(`${base}-${Date.now()}`);
	}

	// default: "title"
	if (!app.vault.getAbstractFileByPath(tryPath(title))) return tryPath(title);
	if (author) {
		const withAuthor = `${title} — ${author}`;
		if (!app.vault.getAbstractFileByPath(tryPath(withAuthor))) return tryPath(withAuthor);
	}
	for (let n = 2; n < 100; n++) {
		const s = author ? `${title} — ${author} ${n}` : `${title} ${n}`;
		if (!app.vault.getAbstractFileByPath(tryPath(s))) return tryPath(s);
	}
	return tryPath(`${title}-${Date.now()}`);
}

function serializeFrontmatter(fm: Record<string, unknown>): string {
	const lines: string[] = ["---"];
	for (const [k, v] of Object.entries(fm)) {
		if (v === null || v === undefined) {
			// Write as empty value (e.g. date_started:)
			lines.push(`${k}:`);
			continue;
		}
		if (Array.isArray(v)) {
			lines.push(`${k}:`);
			for (const item of v) {
				lines.push(`  - ${JSON.stringify(item)}`);
			}
		} else if (typeof v === "string") {
			// Wikilinks and strings containing YAML-special chars need quoting
			if (v.startsWith("[[") || v.includes(":") || v.includes("#")) {
				lines.push(`${k}: "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
			} else {
				lines.push(`${k}: ${v}`);
			}
		} else {
			lines.push(`${k}: ${v}`);
		}
	}
	lines.push("---");
	return lines.join("\n");
}

function buildManagedSection(descMd: string): string {
	if (!descMd.trim()) {
		return `${BEGIN_MARKER}\n${END_MARKER}`;
	}
	return `${BEGIN_MARKER}\n## Description\n${descMd.trim()}\n${END_MARKER}`;
}

export async function createNote(
	app: App,
	book: BookRaw,
	calibreKeys: Record<string, unknown>,
	descMd: string,
	hasCover: boolean,
	settings: CalibrePluginSettings
): Promise<TFile> {
	const filePath = await resolveNewFilePath(app, book, settings);

	// Calibre-owned keys first, then user-owned keys
	const fm: Record<string, unknown> = {
		...calibreKeys,
		status: "unread",
		date_started: null,
		date_finished: null,
	};

	const fmStr = serializeFrontmatter(fm);
	const coverEmbed = hasCover ? `![[${settings.coverFolder}/${book.uuid}.jpg]]\n\n` : "";

	const body = [
		fmStr,
		"",
		coverEmbed + buildManagedSection(descMd),
		"",
		"<!-- everything below this line is yours; it is never touched on re-import -->",
	].join("\n");

	await ensureFolder(app, settings.bookFolder);
	return app.vault.create(filePath, body);
}

export async function updateNote(
	app: App,
	file: TFile,
	calibreKeys: Record<string, unknown>,
	descMd: string,
	hasCover: boolean,
	settings: CalibrePluginSettings
): Promise<void> {
	const uuid = String(calibreKeys.calibre_uuid ?? "");

	// 1. Update Calibre-owned frontmatter keys (preserves all user-owned keys)
	await app.fileManager.processFrontMatter(file, (fm) => {
		for (const [k, v] of Object.entries(calibreKeys)) {
			fm[k] = v;
		}
		// If cover no longer available, remove the key
		if (!hasCover) {
			delete fm["cover"];
		}
	});

	// 2. Update managed body region and cover embed
	const content = await app.vault.read(file);
	const updated = updateBody(content, descMd, hasCover, uuid, settings);
	if (updated !== content) {
		await app.vault.modify(file, updated);
	}
}

function updateBody(
	content: string,
	descMd: string,
	hasCover: boolean,
	uuid: string,
	settings: CalibrePluginSettings
): string {
	const beginIdx = content.indexOf(BEGIN_MARKER);
	const endIdx = content.indexOf(END_MARKER);
	const newSection = buildManagedSection(descMd);
	const coverEmbed = `![[${settings.coverFolder}/${uuid}.jpg]]`;

	if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
		const before = content.slice(0, beginIdx);
		const after = content.slice(endIdx + END_MARKER.length);
		const beforeFixed = syncCoverEmbed(before, coverEmbed, hasCover);
		return beforeFixed + newSection + after;
	}

	// No managed region — append it
	const coverLine = hasCover ? `\n${coverEmbed}\n\n` : "\n\n";
	return content.trimEnd() + coverLine + newSection + "\n";
}

function syncCoverEmbed(before: string, coverEmbed: string, hasCover: boolean): string {
	// Match a wikilink embed at the end of the block (before the managed section)
	const embedRegex = /!\[\[.*?\]\]\n*/;
	const trimmed = before.trimEnd();
	const hasExistingEmbed = embedRegex.test(trimmed.split("\n").pop() ?? "");

	if (hasCover) {
		if (hasExistingEmbed) {
			// Replace last line embed
			const lines = trimmed.split("\n");
			lines[lines.length - 1] = coverEmbed;
			return lines.join("\n") + "\n\n";
		} else {
			return trimmed + "\n\n" + coverEmbed + "\n\n";
		}
	} else {
		if (hasExistingEmbed) {
			// Remove the embed line
			const lines = trimmed.split("\n");
			lines.pop();
			return lines.join("\n").trimEnd() + "\n\n";
		}
		return before;
	}
}

export function buildUuidMap(app: App, settings: CalibrePluginSettings): Map<string, TFile> {
	const prefix = normalizePath(settings.bookFolder) + "/";
	const map = new Map<string, TFile>();
	for (const file of app.vault.getMarkdownFiles()) {
		if (!file.path.startsWith(prefix)) continue;
		const uuid = app.metadataCache.getFileCache(file)?.frontmatter?.calibre_uuid;
		if (uuid) map.set(String(uuid), file);
	}
	return map;
}

export async function saveCover(
	app: App,
	settings: CalibrePluginSettings,
	uuid: string,
	data: ArrayBuffer
): Promise<void> {
	await ensureFolder(app, settings.coverFolder);
	const path = normalizePath(`${settings.coverFolder}/${uuid}.jpg`);
	await app.vault.adapter.writeBinary(path, data);
}

async function ensureFolder(app: App, folder: string): Promise<void> {
	const path = normalizePath(folder);
	try {
		if (!app.vault.getAbstractFileByPath(path)) {
			await app.vault.createFolder(path);
		}
	} catch {
		// Folder might have been created concurrently; ignore
	}
}
