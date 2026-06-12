import type { JSX } from "react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/api";
import { parseMarkdown } from "@/utils/markdownParser";
import { TypingDots } from "./ThinkingAccordion";
import { CitationPill, getCitationForReference } from "./CitationPill";

export function formatInline(text: string, citations?: Citation[], onCitationClick?: (citation: Citation) => void): JSX.Element {
    const parts = text.split(/(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[Source \d+\]|\[Web \d+\]|\[[^\]]+\])/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
                    return (
                        <code key={i} className="bg-zinc-100 dark:bg-zinc-800 rounded px-1 text-xs font-mono">
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatInline(part.slice(2, -2), citations, onCitationClick)}
                        </strong>
                    );
                }
                if (part.startsWith("*") && part.endsWith("*")) {
                    return <em key={i}>{formatInline(part.slice(1, -1), citations, onCitationClick)}</em>;
                }

                const citationMatch = part.match(/^\[(Source|Web) (\d+)\]$/);
                if (citationMatch) {
                    const type = citationMatch[1] as "Source" | "Web";
                    const index = parseInt(citationMatch[2], 10);
                    const citation = getCitationForReference(type, index, citations);
                    if (citation) {
                        return <CitationPill key={i} citation={citation} type={type} onSourceClick={onCitationClick} />;
                    }
                }

                const numericMatch = part.match(/^\[\^?(\d+)\]$/);
                if (numericMatch) {
                    const index = parseInt(numericMatch[1], 10);
                    if (citations && index > 0 && index <= citations.length) {
                        const citation = citations[index - 1];
                        const type = (citation.file_id !== null && citation.file_id !== undefined) ? "Source" : "Web";
                        return <CitationPill key={i} citation={citation} type={type} onSourceClick={onCitationClick} />;
                    }
                }

                const genericMatch = part.match(/^\[([^\]]+)\]$/);
                if (genericMatch) {
                    const content = genericMatch[1].trim();
                    const firstPart = content.split(",")[0].trim();

                    const foundCitation = citations?.find(c => {
                        const fname = (c.filename || "").toLowerCase();
                        const contentLower = content.toLowerCase();
                        const firstPartLower = firstPart.toLowerCase();
                        return fname === contentLower || fname === firstPartLower || contentLower.includes(fname);
                    });

                    if (foundCitation) {
                        const type = (foundCitation.file_id !== null && foundCitation.file_id !== undefined) ? "Source" : "Web";
                        return <CitationPill key={i} citation={foundCitation} type={type} onSourceClick={onCitationClick} />;
                    }
                }

                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

interface MessageContentProps {
    content: string;
    citations?: Citation[];
    isStreaming?: boolean;
    onCitationClick?: (citation: Citation) => void;
}

export function MessageContent({ content, citations, isStreaming, onCitationClick }: MessageContentProps): JSX.Element {
    if (!content && isStreaming) {
        return <TypingDots />;
    }

    const segments = parseMarkdown(content);

    const renderTextSegment = (text: string, segIdx: number) => {
        const lines = text.split("\n");
        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={`${segIdx}-${idx}`} className="h-1" />;

            if (trimmed.startsWith("### ")) {
                return (
                    <p key={`${segIdx}-${idx}`} className="font-bold text-zinc-900 dark:text-zinc-100 mt-4 first:mt-0 text-[14px] leading-snug">
                        {formatInline(trimmed.slice(4), citations, onCitationClick)}
                    </p>
                );
            }

            if (trimmed.startsWith("## ")) {
                return (
                    <p key={`${segIdx}-${idx}`} className="font-bold text-zinc-900 dark:text-zinc-100 mt-5 first:mt-0 text-[16px] leading-snug">
                        {formatInline(trimmed.slice(3), citations, onCitationClick)}
                    </p>
                );
            }

            if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
                return (
                    <p key={`${segIdx}-${idx}`} className="font-semibold text-zinc-900 dark:text-zinc-100 mt-4 first:mt-0 text-[15px] leading-snug">
                        {formatInline(trimmed.slice(2, -2), citations, onCitationClick)}
                    </p>
                );
            }

            const arrowMatch = trimmed.match(/^(→|->)\s*(.+)/);
            if (arrowMatch) {
                return (
                    <div key={`${segIdx}-${idx}`} className="flex items-start gap-2 pl-2 text-zinc-800 dark:text-zinc-200">
                        <span className="shrink-0 text-zinc-500 dark:text-zinc-400 select-none">→</span>
                        <span className="leading-relaxed">{formatInline(arrowMatch[2], citations, onCitationClick)}</span>
                    </div>
                );
            }

            const bulletMatch = line.match(/^(\s*)[*\-]\s+(.+)/);
            if (bulletMatch) {
                const indent = bulletMatch[1].length;
                return (
                    <div key={`${segIdx}-${idx}`} className={cn("flex items-start gap-2 text-zinc-800 dark:text-zinc-200", indent > 0 ? "pl-6" : "pl-2")}>
                        <span className="shrink-0 text-zinc-400 dark:text-zinc-500 select-none font-semibold">•</span>
                        <span className="leading-relaxed">{formatInline(bulletMatch[2], citations, onCitationClick)}</span>
                    </div>
                );
            }

            const numMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
            if (numMatch) {
                return (
                    <div key={`${segIdx}-${idx}`} className="flex items-start gap-2 pl-2">
                        <span className="shrink-0 text-xs font-semibold text-zinc-400 mt-0.5 w-4">{numMatch[1]}.</span>
                        <span className="text-zinc-800 dark:text-zinc-155">{formatInline(numMatch[2], citations, onCitationClick)}</span>
                    </div>
                );
            }

            return (
                <p key={`${segIdx}-${idx}`} className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {formatInline(trimmed, citations, onCitationClick)}
                </p>
            );
        });
    };

    return (
        <div className="space-y-3.5 text-sm leading-relaxed">
            {segments.map((seg, segIdx) => {
                if (seg.type === "code_block") {
                    return (
                        <pre key={segIdx} className="bg-zinc-100 dark:bg-zinc-800 rounded p-2 my-1.5 overflow-x-auto text-xs font-mono whitespace-pre">
                            {seg.code
                                .replace(/&/g, "&amp;")
                                .replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;")}
                        </pre>
                    );
                }
                if (seg.type === "table") {
                    return (
                        <div
                            key={segIdx}
                            className="overflow-x-auto my-1.5"
                            dangerouslySetInnerHTML={{ __html: seg.html }}
                        />
                    );
                }
                return <span key={segIdx} className="contents">{renderTextSegment(seg.value, segIdx)}</span>;
            })}
            {isStreaming && content && <TypingDots />}
        </div>
    );
}
