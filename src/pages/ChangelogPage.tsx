import { useState, useEffect, useCallback, type JSX } from "react";
import { ArrowLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useNavigate } from "react-router-dom";
import { getAboutInfo, type ChangelogEntry } from "@/lib/api";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ReleaseSkeleton(): JSX.Element {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 animate-pulse space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
            <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
            <div className="space-y-2 pt-1">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                        <div
                            className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded"
                            style={{ width: `${55 + (i % 4) * 12}%` }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Release card ──────────────────────────────────────────────────────────────

interface ReleaseCardProps {
    entry: ChangelogEntry;
    isLatest: boolean;
}

function ReleaseCard({ entry, isLatest }: ReleaseCardProps): JSX.Element {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-[#004FFF] text-white text-xs font-bold px-3 py-1 rounded-full">
                    <Tag className="h-3 w-3" />
                    v{entry.version}
                </div>
                {isLatest && (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 rounded-full">
                        Latest
                    </span>
                )}
                <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                    Released {entry.release_date}
                </span>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-100 dark:border-zinc-800" />

            {/* Changes list */}
            <ul className="space-y-2.5">
                {entry.changes.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                        {change}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChangelogPage(): JSX.Element {
    const { getToken } = useKindeAuth();
    const navigate = useNavigate();
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [latestVersion, setLatestVersion] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();
            if (!token) return;
            const data = await getAboutInfo(token);
            setEntries(data.changelog);
            setLatestVersion(data.latest_version);
        } catch (err: any) {
            console.error("Failed to load changelog:", err);
            setError("Failed to load changelog. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="p-3 sm:p-6 md:p-8 flex flex-col gap-5 w-full max-w-3xl mx-auto">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/about")}
                    className="gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 -ml-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    About
                </Button>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Changelog</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    All releases and improvements to Navigator
                </p>
            </div>

            {/* ── Release list ────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                {isLoading ? (
                    <>
                        <ReleaseSkeleton />
                        <ReleaseSkeleton />
                    </>
                ) : error ? (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                        <p className="text-sm text-red-500">{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">
                            Retry
                        </Button>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">No releases found.</p>
                    </div>
                ) : (
                    entries.map((entry) => (
                        <ReleaseCard
                            key={entry.version}
                            entry={entry}
                            isLatest={entry.version === latestVersion}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
