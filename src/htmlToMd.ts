export function htmlToMd(html: string): string {
	if (!html || html.trim() === "") return "";
	const doc = new DOMParser().parseFromString(html, "text/html");
	return walkNode(doc.body).replace(/\n{3,}/g, "\n\n").trim();
}

function walkNode(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return node.textContent ?? "";
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return "";

	const el = node as HTMLElement;
	const tag = el.tagName.toLowerCase();
	const inner = () => Array.from(el.childNodes).map(walkNode).join("");

	switch (tag) {
		case "p":
			return "\n\n" + inner() + "\n\n";
		case "br":
			return "\n";
		case "b":
		case "strong":
			return "**" + inner() + "**";
		case "em":
		case "i":
			return "*" + inner() + "*";
		case "h1":
			return "\n\n# " + inner() + "\n\n";
		case "h2":
			return "\n\n## " + inner() + "\n\n";
		case "h3":
			return "\n\n### " + inner() + "\n\n";
		case "h4":
			return "\n\n#### " + inner() + "\n\n";
		case "h5":
			return "\n\n##### " + inner() + "\n\n";
		case "h6":
			return "\n\n###### " + inner() + "\n\n";
		case "ul":
			return (
				"\n" +
				Array.from(el.children)
					.map((li) => "- " + walkNode(li).trim())
					.join("\n") +
				"\n"
			);
		case "ol":
			return (
				"\n" +
				Array.from(el.children)
					.map((li, i) => `${i + 1}. ` + walkNode(li).trim())
					.join("\n") +
				"\n"
			);
		case "li":
			return inner();
		case "a": {
			const href = el.getAttribute("href") ?? "";
			const text = inner().trim();
			return href ? `[${text}](${href})` : text;
		}
		case "blockquote":
			return (
				"\n" +
				inner()
					.trim()
					.split("\n")
					.map((l) => "> " + l)
					.join("\n") +
				"\n"
			);
		case "hr":
			return "\n\n---\n\n";
		case "code":
			return "`" + el.textContent + "`";
		case "pre":
			return "\n\n```\n" + el.textContent + "\n```\n\n";
		default:
			return inner();
	}
}
