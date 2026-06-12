import { useState } from "react";
import { Folder } from "lucide-react";
import type { Citation } from "@/lib/api";

export const getCitationForReference = (
    refType: "Source" | "Web",
    index: number,
    citations?: Citation[]
): Citation | undefined => {
    if (!citations) return undefined;
    if (refType === "Source") {
        const internalCitations = citations.filter(c => c.file_id !== null && c.file_id !== undefined);
        return internalCitations[index - 1];
    } else {
        const webCitations = citations.filter(c => c.file_id === null || c.file_id === undefined);
        return webCitations[index - 1];
    }
};

interface CitationPillProps {
    citation: Citation;
    type: "Source" | "Web";
    onSourceClick?: (citation: Citation) => void;
}

export function CitationPill({ citation, type, onSourceClick }: CitationPillProps) {
    const isWeb = type === "Web";
    const [imgError, setImgError] = useState(false);

    const getDomain = (url?: string) => {
        if (!url) return null;
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    };

    const domain = getDomain(citation.heading_path);
    const faviconUrl = isWeb && domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null;

    const handleClick = () => {
        if (isWeb && citation.heading_path) {
            window.open(citation.heading_path, "_blank");
        } else if (onSourceClick) {
            onSourceClick(citation);
        }
    };

    return (
        <span
            onClick={handleClick}
            title={citation.content_preview || citation.filename}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eae9e4] hover:bg-[#e0dfda] dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200/40 dark:border-zinc-700/50 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer select-none mx-1 relative -top-[1px]"
        >
            <span className="max-w-[150px] truncate">{citation.filename}</span>
            {isWeb ? (
                faviconUrl && !imgError ? (
                    <img
                        src={faviconUrl}
                        alt=""
                        onError={() => setImgError(true)}
                        className="h-3.5 w-3.5 rounded-full object-contain shrink-0 bg-white"
                    />
                ) : (
                    <span className="h-3.5 w-3.5 rounded-full bg-zinc-300 dark:bg-zinc-650 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400">W</span>
                    </span>
                )
            ) : (
                <Folder className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            )}
        </span>
    );
}
