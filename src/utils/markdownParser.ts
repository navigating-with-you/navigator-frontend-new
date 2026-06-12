export type MarkdownSegment =
    | { type: "text"; value: string }
    | { type: "code_block"; code: string; lang: string }
    | { type: "table"; html: string };

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function parseMarkdown(text: string): MarkdownSegment[] {
    const segments: MarkdownSegment[] = [];

    const codeBlockRe = /```([\w]*)\n([\s\S]*?)```/g;
    const tableRe = /(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)+)/g;

    interface Region {
        start: number;
        end: number;
        segment: MarkdownSegment;
    }
    const regions: Region[] = [];

    let m: RegExpExecArray | null;

    codeBlockRe.lastIndex = 0;
    while ((m = codeBlockRe.exec(text)) !== null) {
        const lang = m[1] || "";
        const code = m[2];
        regions.push({ start: m.index, end: m.index + m[0].length, segment: { type: "code_block", code, lang } });
    }

    tableRe.lastIndex = 0;
    while ((m = tableRe.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        const overlaps = regions.some(r => start < r.end && end > r.start);
        if (overlaps) continue;

        const block = m[0];
        const rows = block.trim().split("\n").filter(r => !/^\|[-| :]+\|$/.test(r));
        const cells = (r: string) => r.split("|").slice(1, -1).map(c => c.trim());
        const [hdr, ...body] = rows;
        if (!hdr) continue;

        const headerCells = cells(hdr)
            .map(h => `<th class="border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-left bg-zinc-100 dark:bg-zinc-800">${escapeHtml(h)}</th>`)
            .join("");
        const bodyRows = body
            .map(r => `<tr>${cells(r).map(c => `<td class="border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5">${escapeHtml(c)}</td>`).join("")}</tr>`)
            .join("");
        const html = `<table class="text-xs border-collapse my-1.5 w-full"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;

        regions.push({ start, end, segment: { type: "table", html } });
    }

    regions.sort((a, b) => a.start - b.start);

    let cursor = 0;
    for (const region of regions) {
        if (region.start > cursor) {
            segments.push({ type: "text", value: text.slice(cursor, region.start) });
        }
        segments.push(region.segment);
        cursor = region.end;
    }

    if (cursor < text.length) {
        segments.push({ type: "text", value: text.slice(cursor) });
    }

    return segments;
}
