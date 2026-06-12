import { useState, useEffect, useCallback, type JSX } from "react";
import { RefreshCw, FileText, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useNavigate } from "react-router-dom";
import { getAboutInfo, type AboutData } from "@/lib/api";

// ── Static data ───────────────────────────────────────────────────────────────

const LEGAL_LINKS = [
    { label: "Privacy Policy", path: "/privacy-policy" },
    { label: "Terms & Conditions", path: "/terms" },
    { label: "Data Usage Policy", path: "/data-usage-policy" },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function AppInfoSkeleton(): JSX.Element {
    return (
        <div className="flex flex-col md:flex-row items-start gap-6 animate-pulse">
            <div className="flex items-start gap-5 flex-1">
                <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                    <div className="h-5 w-28 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-full max-w-md bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-64 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
            </div>
            <div className="shrink-0 space-y-3 pt-1 min-w-[200px]">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-8">
                        <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
                        <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChangelogSkeleton(): JSX.Element {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-4 w-44 bg-zinc-100 dark:bg-zinc-800 rounded" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
                </div>
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AboutPage(): JSX.Element {
    const { getToken } = useKindeAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<AboutData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (refresh = false) => {
        try {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);
            setError(null);
            const token = await getToken();
            if (!token) return;
            const result = await getAboutInfo(token);
            setData(result);
        } catch (err: any) {
            console.error("Failed to load about info:", err);
            setError("Failed to load application information.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const latestChangelog = data?.changelog[0];

    return (
        <div className="p-3 sm:p-6 md:p-8 flex flex-col gap-5 w-full" data-testid="about-page">

            {/* ── Header ───────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">About</h1>
                <Button
                    variant="outline"
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                    className="gap-2 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm"
                >
                    <RefreshCw className={`h-4 w-4 text-zinc-500 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* ── App Info Card ─────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                {isLoading ? (
                    <AppInfoSkeleton />
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : (
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* Logo + name + description */}
                        <div className="flex items-start gap-5 flex-1">
                            <div className="h-16 w-16 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                <img src="/logo.svg" alt="Navigator" className="h-9 w-9" />
                            </div>
                            <div className="flex-1 pt-0.5">
                                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                    {data?.app.name}
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-lg">
                                    {data?.app.description}
                                </p>
                            </div>
                        </div>

                        {/* Version metadata */}
                        <div className="w-full md:w-auto md:border-l md:border-zinc-200 md:dark:border-zinc-800 md:pl-8 shrink-0">
                            <dl className="space-y-2.5 text-sm">
                                <div className="flex items-center justify-between gap-12">
                                    <dt className="text-zinc-400 dark:text-zinc-500 font-medium">Version</dt>
                                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{data?.app.version}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-12">
                                    <dt className="text-zinc-400 dark:text-zinc-500 font-medium">Build</dt>
                                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{data?.app.build}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-12">
                                    <dt className="text-zinc-400 dark:text-zinc-500 font-medium">Release Date</dt>
                                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{data?.app.release_date}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom row ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Legal & Policies */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Legal & Policies</h3>
                    <div className="space-y-2">
                        {LEGAL_LINKS.map((link) => (
                            <button
                                key={link.label}
                                type="button"
                                onClick={() => navigate(link.path)}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left group"
                            >
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                                    <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                </div>
                                <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    {link.label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* What's New */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">What's New</h3>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 rounded-full">
                                New
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/changelog")}
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
                        >
                            View All Updates
                            <ExternalLink className="h-3 w-3" />
                        </button>
                    </div>

                    {isLoading ? (
                        <ChangelogSkeleton />
                    ) : latestChangelog ? (
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    Ver.{latestChangelog.version}
                                </span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                    Updated on {latestChangelog.release_date}
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {latestChangelog.changes.map((change, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">No changelog available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
