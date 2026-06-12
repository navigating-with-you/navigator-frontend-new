import { useState, useEffect, useRef } from "react";
import { Folder } from "lucide-react";
import { toast } from "sonner";
import type { Citation } from "@/lib/api";
import { CitationPill } from "./CitationPill";
import { safeOpen } from "@/utils/safeUrl";

interface SourcesPillProps {
    sources: Citation[];
    onSourceClick?: (citation: Citation) => void;
}

export function SourcesPill({ sources, onSourceClick }: SourcesPillProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const uniqueSources: { filename: string; isWeb: boolean; domain?: string; citation: Citation }[] = [];
    const seen = new Set<string>();

    sources.forEach(src => {
        const isWeb = src.file_id === null || src.file_id === undefined;
        let domain: string | undefined;
        if (isWeb && src.heading_path) {
            try {
                domain = new URL(src.heading_path).hostname;
            } catch {
                domain = undefined;
            }
        }
        const key = isWeb ? (domain || src.filename) : src.filename;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueSources.push({ filename: src.filename, isWeb, domain, citation: src });
        }
    });

    const displayedIcons = uniqueSources.slice(0, 3);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-2.5 px-3 py-1 bg-[#eae9e4] hover:bg-[#e0dfda] dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200/40 dark:border-zinc-700/50 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer select-none"
            >
                <div className="flex items-center -space-x-1.5 mr-0.5">
                    {displayedIcons.map((src, idx) => {
                        if (src.isWeb && src.domain) {
                            return (
                                <img
                                    key={idx}
                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${src.domain}`}
                                    alt=""
                                    className="h-4 w-4 rounded-full object-contain bg-white border border-white dark:border-zinc-800 shrink-0 z-[10]"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                    }}
                                />
                            );
                        } else {
                            return (
                                <span
                                    key={idx}
                                    className="h-4 w-4 flex items-center justify-center bg-zinc-300 dark:bg-zinc-750 rounded-full border border-white dark:border-zinc-800 shrink-0 z-[10]"
                                >
                                    <Folder className="h-2.5 w-2.5 text-zinc-650 dark:text-zinc-350" />
                                </span>
                            );
                        }
                    })}
                </div>
                <span>{sources.length} {sources.length === 1 ? "Source" : "Sources"}</span>
            </button>

            {isExpanded && (
                <div className="absolute left-0 bottom-full mb-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-2 z-50 space-y-1">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 mb-1">
                        Sources Used
                    </div>
                    {sources.map((src, idx) => {
                        const isWeb = src.file_id === null || src.file_id === undefined;
                        let domain: string | undefined;
                        if (isWeb && src.heading_path) {
                            try {
                                domain = new URL(src.heading_path).hostname;
                            } catch {
                                domain = undefined;
                            }
                        }

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (onSourceClick) {
                                        onSourceClick(src);
                                    } else {
                                        if (isWeb && src.heading_path) {
                                            safeOpen(src.heading_path);
                                        } else {
                                            toast.info(`Document source: ${src.filename}`);
                                        }
                                    }
                                    setIsExpanded(false);
                                }}
                                className="flex items-center gap-2.5 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer text-xs transition-colors"
                            >
                                {isWeb && domain ? (
                                    <img
                                        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
                                        alt=""
                                        className="h-4 w-4 rounded-full object-contain shrink-0 bg-white"
                                    />
                                ) : (
                                    <Folder className="h-4 w-4 text-zinc-500 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                                        {src.filename}
                                    </p>
                                    {src.content_preview && (
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                                            {src.content_preview}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { CitationPill };
