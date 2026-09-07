import { isMarkdownVideoUrl } from "@/lib/post-content";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function escapeMarkdown(text: string) {
  return text.replace(/\u00a0/g, " ");
}

function inlineMarkdownToHtml(input: string): string {
  const re =
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let html = "";
  let lastIndex = 0;

  for (const match of input.matchAll(re)) {
    html += escapeHtml(input.slice(lastIndex, match.index));

    if (match[2]) {
      const alt = match[1] ?? "";
      const url = match[2];
      html += isMarkdownVideoUrl(url)
        ? `<video src="${escapeAttr(url)}" controls playsinline preload="metadata" class="post-markdown__video"></video>`
        : `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}">`;
    } else if (match[4]) {
      html += `<a href="${escapeAttr(match[4])}">${escapeHtml(match[3] ?? "")}</a>`;
    } else if (match[5]) {
      html += `<strong>${escapeHtml(match[5])}</strong>`;
    } else if (match[6]) {
      html += `<em>${escapeHtml(match[6])}</em>`;
    }

    lastIndex = (match.index ?? 0) + match[0].length;
  }

  return html + escapeHtml(input.slice(lastIndex));
}

function blockToHtml(block: string): string {
  const lines = block.split("\n");

  if (lines.every((line) => /^[-*]\s/.test(line))) {
    const items = lines
      .map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^[-*]\s/, ""))}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  if (lines.every((line) => /^\d+\.\s/.test(line))) {
    const items = lines
      .map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^\d+\.\s/, ""))}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }

  if (lines.every((line) => /^>\s?/.test(line))) {
    const body = lines.map((line) => inlineMarkdownToHtml(line.replace(/^>\s?/, ""))).join("<br>");
    return `<blockquote>${body}</blockquote>`;
  }

  if (/^###\s/.test(block)) {
    return `<h3>${inlineMarkdownToHtml(block.replace(/^###\s/, "").replace(/\n/g, " "))}</h3>`;
  }
  if (/^##\s/.test(block)) {
    return `<h2>${inlineMarkdownToHtml(block.replace(/^##\s/, "").replace(/\n/g, " "))}</h2>`;
  }
  if (/^#\s/.test(block)) {
    return `<h1>${inlineMarkdownToHtml(block.replace(/^#\s/, "").replace(/\n/g, " "))}</h1>`;
  }

  return `<p>${lines.map((line) => inlineMarkdownToHtml(line)).join("<br>")}</p>`;
}

export function markdownToEditorHtml(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return "";
  return trimmed.split(/\n{2,}/).map(blockToHtml).join("");
}

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdown(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName;
  const inner = Array.from(el.childNodes).map(serializeInline).join("");

  if (tag === "BR") return "\n";
  if (tag === "STRONG" || tag === "B") return inner ? `**${inner}**` : "";
  if (tag === "EM" || tag === "I") return inner ? `*${inner}*` : "";
  if (tag === "A") {
    const href = el.getAttribute("href")?.trim();
    if (!href) return inner;
    return `[${inner || href}](${href})`;
  }
  if (tag === "IMG") {
    const src = el.getAttribute("src")?.trim();
    if (!src) return inner;
    return `![${el.getAttribute("alt") ?? ""}](${src})`;
  }
  if (tag === "VIDEO") {
    const src = el.getAttribute("src")?.trim();
    if (!src) return inner;
    return `![${el.getAttribute("aria-label") || "영상"}](${src})`;
  }

  return inner;
}

function serializeBlock(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdown(node.textContent ?? "").trim();
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName;

  if (tag === "BR") return "";
  if (tag === "IMG" || tag === "VIDEO") return serializeInline(el);

  if (tag === "H1") return `# ${serializeInline(el).trim()}`;
  if (tag === "H2") return `## ${serializeInline(el).trim()}`;
  if (tag === "H3") return `### ${serializeInline(el).trim()}`;

  if (tag === "UL") {
    return Array.from(el.children)
      .filter((child) => child.tagName === "LI")
      .map((item) => `- ${serializeInline(item).trim()}`)
      .join("\n");
  }

  if (tag === "OL") {
    return Array.from(el.children)
      .filter((child) => child.tagName === "LI")
      .map((item, index) => `${index + 1}. ${serializeInline(item).trim()}`)
      .join("\n");
  }

  if (tag === "BLOCKQUOTE") {
    const body = serializeInline(el)
      .split("\n")
      .map((line) => `> ${line.trim()}`)
      .join("\n");
    return body;
  }

  const hasBlockChild = Array.from(el.childNodes).some(
    (child) =>
      child.nodeType === Node.ELEMENT_NODE &&
      /^(P|DIV|H1|H2|H3|UL|OL|BLOCKQUOTE|IMG|VIDEO)$/.test((child as HTMLElement).tagName),
  );

  if (hasBlockChild) {
    return serializeChildren(el);
  }

  return serializeInline(el).trim();
}

function serializeChildren(root: HTMLElement): string {
  return Array.from(root.childNodes)
    .map(serializeBlock)
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
}

export function editorHtmlToMarkdown(html: string): string {
  const host = document.createElement("div");
  host.innerHTML = html;
  return serializeChildren(host).replace(/\n{3,}/g, "\n\n").trim();
}

export function isEditorContentEmpty(root: HTMLElement): boolean {
  const text = (root.innerText ?? "").replace(/\u00a0/g, " ").trim();
  return !text && !root.querySelector("img, video");
}
