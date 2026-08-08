export interface Highlight {
	chapterLabel: string;
	chapterTitle: string;
	type: string;
	progress?: string;
	quote?: string;
	note?: string;
}

export interface AnnotationsData {
	highlights: Highlight[];
}

export interface SplitComments {
	descriptionHtml: string;
	annotations: AnnotationsData | null;
}

/**
 * Calibre's Kobo "fetch annotations" feature appends a fixed-format
 * `<div class="user_annotations">` block to the book's `comments` HTML,
 * preceded by `<hr class="annotations_divider"/>` markers. This splits
 * that block out so description and highlights can be rendered separately.
 */
export function splitCommentsHtml(html: string): SplitComments {
	if (!html || html.trim() === "") return { descriptionHtml: "", annotations: null };

	const doc = new DOMParser().parseFromString(html, "text/html");
	const annotationsDiv = doc.body.querySelector("div.user_annotations");
	if (!annotationsDiv) {
		return { descriptionHtml: html, annotations: null };
	}

	const annotations = parseAnnotationsDiv(annotationsDiv);
	annotationsDiv.remove();
	doc.body.querySelectorAll("hr.annotations_divider").forEach((hr) => hr.remove());

	return { descriptionHtml: doc.body.innerHTML, annotations };
}

function textOf(node: Node | null | undefined): string {
	return (node?.textContent ?? "").trim();
}

interface RawField {
	key: string;
	value: string;
}

function extractFields(span: Element): RawField[] {
	const fields: RawField[] = [];
	const children = Array.from(span.childNodes);

	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (node.nodeType !== Node.ELEMENT_NODE || (node as Element).tagName !== "B") continue;

		const label = textOf(node);
		if (!label) continue;

		if (label.endsWith(":")) {
			const next = children[i + 1];
			const value = next?.nodeType === Node.TEXT_NODE ? textOf(next) : "";
			fields.push({ key: label.slice(0, -1).trim(), value });
		} else {
			// Bare label (no colon) marks the annotation type, e.g. "Highlight" / "Note" / "Bookmark"
			fields.push({ key: "__type", value: label });
		}
	}

	return fields;
}

function parseAnnotationsDiv(div: Element): AnnotationsData {
	const data: AnnotationsData = { highlights: [] };
	const spans = Array.from(div.children).filter((c) => c.tagName === "SPAN");

	for (const span of spans) {
		const fields = extractFields(span);
		const map = new Map(fields.map((f) => [f.key, f.value]));

		// The reading-progress span ("Book last read" / "Percentage read") has no
		// chapter field and is skipped here rather than rendered as a highlight.
		const chapterField = fields.find((f) => f.key.startsWith("Chapter") && f.key !== "Chapter progress");
		if (!chapterField) continue;

		data.highlights.push({
			chapterLabel: chapterField.key,
			chapterTitle: chapterField.value,
			type: map.get("__type") ?? "Highlight",
			progress: map.get("Chapter progress"),
			quote: map.get("Highlight") || undefined,
			note: map.get("Note") || undefined,
		});
	}

	return data;
}

function blockquote(text: string): string {
	return text
		.split("\n")
		.map((l) => "> " + l)
		.join("\n");
}

export function annotationsToMd(data: AnnotationsData): string {
	if (data.highlights.length === 0) return "";

	const parts: string[] = [];

	let lastChapter: string | null = null;
	for (const h of data.highlights) {
		if (h.chapterLabel !== lastChapter) {
			parts.push(`### ${h.chapterLabel} — ${h.chapterTitle}`);
			lastChapter = h.chapterLabel;
		}
		if (h.quote) parts.push(blockquote(h.quote));
		if (h.note) parts.push(`**Note:** ${h.note}`);
	}

	return parts.join("\n\n");
}
