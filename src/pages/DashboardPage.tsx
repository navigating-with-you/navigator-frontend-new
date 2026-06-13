import { useState, useRef, useEffect, useCallback, type JSX } from "react";
import {
    Users,
    FileText,
    BarChart3,
    CreditCard,
    RefreshCw,
    ChevronDown,
    UserPlus,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listEmployees, getRootContents, getNotifications, getDailyInteractions } from "@/lib/api";
import { useSubscriptionSummary } from "@/hooks/useSubscription";

// ─── TYPES & DATA ──────────────────────────────────────────────────────────

type DataPoint = {
    date: string;
    simple: number;
    complex: number;
    extraction: number;
};

function buildChartBuckets(
    raw: Array<{ date: string; simple: number; complex: number; extraction: number }>
): Record<string, DataPoint[]> {
    const toLabel = (iso: string) =>
        new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);

    const toDataPoint = (r: { date: string; simple: number; complex: number; extraction: number }): DataPoint => ({
        date: toLabel(r.date),
        simple: r.simple,
        complex: r.complex,
        extraction: r.extraction,
    });

    const thisMonthData = raw
        .filter((r) => {
            const d = new Date(r.date + "T00:00:00");
            return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
        })
        .map(toDataPoint);

    const lastMonthData = raw
        .filter((r) => {
            const d = new Date(r.date + "T00:00:00");
            return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
        })
        .map(toDataPoint);

    const last7Data = raw.slice(-7).map(toDataPoint);

    return {
        "this-month": thisMonthData,
        "last-month": lastMonthData,
        "last-7-days": last7Data,
    };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    // Normalize UTC timestamp without Z offset to prevent local timezone parsing offset
    let normalized = dateStr;
    if (dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+") && !dateStr.match(/-\d{2}:\d{2}$/)) {
        normalized = dateStr + "Z";
    }
    const date = new Date(normalized);
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// ─── CHART COMPONENT ────────────────────────────────────────────────────────

function InteractionChart({ data }: { data: DataPoint[] }): JSX.Element {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width: w, height: h } = entries[0].contentRect;
            if (w > 0 && h > 0) setDimensions({ width: w, height: h });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const { width, height } = dimensions;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const dataMax = data.length > 0
        ? Math.max(...data.map(d => Math.max(d.simple, d.complex, d.extraction)))
        : 0;
    const yMax = Math.max(Math.ceil(dataMax * 1.25), 10);
    const yStep = Math.ceil(yMax / 5);
    const yTicks = Array.from({ length: 6 }, (_, i) => Math.min(i * yStep, yMax));

    const xOf = (idx: number) =>
        paddingLeft + (idx * chartWidth) / Math.max(data.length - 1, 1);
    const yOf = (val: number) =>
        paddingTop + chartHeight - (val / yMax) * chartHeight;

    const toPoints = (key: keyof DataPoint) =>
        data.map((d, i) => `${xOf(i)},${yOf(d[key] as number)}`).join(" ");

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * width;
        const pct = (svgX - paddingLeft) / chartWidth;
        const idx = Math.round(pct * (data.length - 1));
        if (idx >= 0 && idx < data.length) setHoveredIdx(idx);
    };

    const hd = hoveredIdx !== null ? data[hoveredIdx] : null;

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[220px]">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full overflow-visible select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIdx(null)}
            >
                {/* Grid lines */}
                {yTicks.map((tick, i) => (
                    <line
                        key={i}
                        x1={paddingLeft} y1={yOf(tick)}
                        x2={width - paddingRight} y2={yOf(tick)}
                        className="stroke-zinc-100 dark:stroke-zinc-800/80 stroke-1"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* Y labels */}
                {yTicks.map((tick, i) => (
                    <text
                        key={i}
                        x={paddingLeft - 12} y={yOf(tick) + 4}
                        fontSize="10" fontWeight="500" fill="currentColor"
                        className="text-zinc-500 dark:text-zinc-400"
                        style={{ textAnchor: "end" }}
                    >
                        {tick}
                    </text>
                ))}

                {/* X labels */}
                {data.map((d, i) => (
                    <text
                        key={i}
                        x={xOf(i)} y={height - 15}
                        fontSize="10" fontWeight="500" fill="currentColor"
                        className="text-zinc-500 dark:text-zinc-400"
                        style={{ textAnchor: "middle" }}
                    >
                        {d.date}
                    </text>
                ))}

                {/* Extraction line (green) — drawn first so it sits below chat lines */}
                <polyline fill="none" stroke="#16a34a" strokeWidth="2"
                    strokeDasharray="5 3" points={toPoints("extraction")} />

                {/* Simple line (blue) */}
                <polyline fill="none" stroke="#2563eb" strokeWidth="2"
                    points={toPoints("simple")} />

                {/* Complex line (orange) */}
                <polyline fill="none" stroke="#ea580c" strokeWidth="2"
                    points={toPoints("complex")} />

                {/* Hover crosshair + dots */}
                {hd !== null && hoveredIdx !== null && (
                    <g>
                        <line
                            x1={xOf(hoveredIdx)} y1={paddingTop}
                            x2={xOf(hoveredIdx)} y2={height - paddingBottom}
                            className="stroke-zinc-400 dark:stroke-zinc-600 stroke-1"
                            strokeDasharray="3 3"
                        />
                        {(["simple", "complex", "extraction"] as const).map((key) => {
                            const color = key === "simple" ? "#2563eb" : key === "complex" ? "#ea580c" : "#16a34a";
                            return (
                                <circle
                                    key={key}
                                    cx={xOf(hoveredIdx)}
                                    cy={yOf(hd[key])}
                                    r="5"
                                    fill="white"
                                    stroke={color}
                                    strokeWidth="2"
                                    className="dark:fill-zinc-900"
                                />
                            );
                        })}
                    </g>
                )}
            </svg>

            {/* Tooltip */}
            {hd !== null && hoveredIdx !== null && (
                <div
                    className="absolute bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xl pointer-events-none z-20 min-w-[190px]"
                    style={{
                        left: `${(xOf(hoveredIdx) / width) * 100}%`,
                        top: `${(yOf(Math.max(hd.simple, hd.complex, hd.extraction)) / height) * 100 - 4}%`,
                        transform: "translate(-50%, -100%)",
                    }}
                >
                    <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">{hd.date}</p>
                    <div className="space-y-1.5 text-xs">
                        {([
                            { key: "simple" as const, label: "Simple", color: "#2563eb", credits: 0.5 },
                            { key: "complex" as const, label: "Complex", color: "#ea580c", credits: 1.0 },
                            { key: "extraction" as const, label: "Extraction", color: "#16a34a", credits: 0.5 },
                        ]).map(({ key, label, color, credits }) => (
                            <div key={key} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                                    <span className="text-zinc-600 dark:text-zinc-400">{label}:</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{hd[key]}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500 ml-1">({credits}cr)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── SHARED EMPTY STATE ──────────────────────────────────────────────────────

function NoActivitiesState(): JSX.Element {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <Activity className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No activity yet</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Actions like file uploads and team changes will appear here.</p>
        </div>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
    const { getToken, isAuthenticated } = useKindeAuth();
    const { summary: subscriptionSummary, refetch: refetchSubscription } = useSubscriptionSummary();

    // Live states with dummy fallbacks
    const [employeesCount, setEmployeesCount] = useState<number>(0);
    const [kbSizeBytes, setKbSizeBytes] = useState<number>(0); // 0 bytes
    const [usageLimit, setUsageLimit] = useState<number>(0);
    const [plan] = useState<string>("Core Plan");
    const [credits, setCredits] = useState<number>(50);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [chartData, setChartData] = useState<Record<string, DataPoint[]>>({
        "this-month": [],
        "last-month": [],
        "last-7-days": [],
    });

    const [isRefreshed, setIsRefreshed] = useState(false);
    const [timeframe, setTimeframe] = useState<string>("this-month");
    const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
    const [allActivities, setAllActivities] = useState<any[]>([]);

    // Update usage from subscription when it loads
    useEffect(() => {
        if (subscriptionSummary) {
            const creditsPercentage = subscriptionSummary.credits.percentage;
            const pagesPercentage = subscriptionSummary.pages.percentage;
            const simplePercentage = subscriptionSummary.simple_interactions.percentage;
            const complexPercentage = subscriptionSummary.complex_interactions.percentage;
            const extractionPercentage = subscriptionSummary.extraction_interactions?.percentage ?? 0;

            // Use the highest usage percentage across all metrics
            const overallPct = Math.max(creditsPercentage, pagesPercentage, simplePercentage, complexPercentage, extractionPercentage);
            setUsageLimit(overallPct);
            setCredits(subscriptionSummary.credits.used);
        }
    }, [subscriptionSummary]);

    const fetchLiveStats = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) return;

            // Parallel fetches — subscription included so nothing waits in series
            const [empData, rootData, notifData, dailyRaw] = await Promise.all([
                listEmployees(token).catch(() => ({ employees: [] })),
                getRootContents(token).catch(() => ({ folders: [], files: [] })),
                getNotifications(token).catch(() => ({ notifications: [] })),
                getDailyInteractions(token, 60).catch(() => [] as Array<{ date: string; simple: number; complex: number; extraction: number }>),
            ]);
            refetchSubscription().catch(() => undefined);

            if (Array.isArray(dailyRaw) && dailyRaw.length > 0) {
                setChartData(buildChartBuckets(dailyRaw));
            }

            // 1. Calculate proper employees count (members only, no invites)
            const activeEmployees = empData?.employees || (Array.isArray(empData) ? empData : []);
            setEmployeesCount(activeEmployees.length);

            // 2. Calculate proper KB/MB/GB folder sizes recursively
            const foldersBytes = (rootData.folders || []).reduce((acc: number, f: any) => acc + (f.total_size || 0), 0);
            const filesBytes = (rootData.files || []).reduce((acc: number, f: any) => acc + (f.file_size || 0), 0);
            const totalBytes = foldersBytes + filesBytes;
            setKbSizeBytes(totalBytes);

            // 3. Map notifications to recent activities
            const rawNotifs = notifData?.notifications || [];
            const mapped = rawNotifs.slice(0, 20).map((n: any) => {
                let icon = Activity;
                let iconColor = "text-zinc-600 bg-zinc-50 dark:bg-zinc-800/40 border-zinc-150 dark:border-zinc-800";

                switch (n.type) {
                    case "team_added":
                        icon = UserPlus;
                        iconColor = "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30";
                        break;
                    case "team_removed":
                        icon = Activity; // Fallback
                        iconColor = "text-orange-600 bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30";
                        break;
                    case "file_uploaded":
                        icon = FileText;
                        iconColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30";
                        break;
                    case "file_removed":
                        icon = FileText;
                        iconColor = "text-red-650 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30";
                        break;
                    case "role_updated":
                        icon = Activity;
                        iconColor = "text-purple-650 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30";
                        break;
                }

                return {
                    id: n.id,
                    title: n.title || "Log item created",
                    subtitle: n.message || "",
                    time: formatRelativeTime(n.created_at),
                    icon,
                    iconColor
                };
            });
            setAllActivities(mapped);
            setRecentActivities(mapped.slice(0, 5));
        } catch (e) {
            console.warn("Failed to retrieve live stats for dashboard:", e);
        }
    }, [getToken, refetchSubscription]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Fetch stats immediately on mount
        fetchLiveStats();

        // Set up polling to refresh stats every 45 seconds
        const interval = setInterval(() => {
            fetchLiveStats();
        }, 45 * 1000); // 45 seconds

        // Cleanup interval on unmount or when auth changes
        return () => clearInterval(interval);
    }, [isAuthenticated, fetchLiveStats]);

    // Refresh dashboard when user switches back to the window
    useEffect(() => {
        const handleFocus = () => {
            if (isAuthenticated) {
                fetchLiveStats();
            }
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [isAuthenticated, fetchLiveStats]);

    const handleRefresh = async () => {
        setIsRefreshed(true);
        await fetchLiveStats();
        setTimeout(() => {
            setIsRefreshed(false);
            toast.success("Dashboard successfully refreshed!");
        }, 800);
    };

    const getTimelineLabel = () => {
        switch (timeframe) {
            case "last-month": return "Last Month";
            case "last-7-days": return "Last 7 Days";
            default: return "This Month";
        }
    };

    return (
        <div className="p-3 sm:p-6 md:p-8 pb-8 flex flex-col w-full bg-transparent animate-fade-in" data-testid="dashboard-page">
            {/* Header - Fixed */}
            <div className="shrink-0 flex flex-col gap-1">
                    <div className="flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Dashboard
                            </h1>
                        </div>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRefresh}
                                disabled={isRefreshed}
                                aria-label="Refresh dashboard"
                                className="rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshed ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Overview of your organization's members, files usage, subscription limits, and recent activity logs.
                    </p>
                </div>

                {/* Statistics Row */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full shrink-0">
                    {/* Total Employees */}
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-page dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
                        <div className="space-y-2.5">
                            <p className="text-xs font-medium text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Total Employees</p>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {new Intl.NumberFormat().format(employeesCount)}
                            </h3>
                            <p className="text-[11px] font-medium text-zinc-450 dark:text-zinc-500">
                                Active members only
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-sm shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>

                    {/* Total Files Size (dynamic KB/MB/GB label) */}
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-page dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
                        <div className="space-y-2.5">
                            <p className="text-xs font-medium text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Total Files Size</p>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {formatSize(kbSizeBytes)}
                            </h3>
                            <p className="text-[11px] font-medium text-zinc-450 dark:text-zinc-500">
                                Across all folders & files
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-sm shrink-0">
                            <FileText className="h-5 w-5" />
                        </div>
                    </div>

                    {/* Usage Limit */}
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-page dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
                        <div className="space-y-2.5 flex-1 pr-3">
                            <p className="text-xs font-medium text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Usage Limit</p>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{Math.round(usageLimit)}%</h3>

                            <div className="space-y-1.5 pt-1">
                                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.round(usageLimit)}%`,
                                            backgroundColor: usageLimit >= 90 ? '#ef4444' : usageLimit >= 70 ? '#f97316' : '#3b82f6',
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-0.5">
                                    {[
                                        { label: "Credits", pct: subscriptionSummary?.credits.percentage ?? 0 },
                                        { label: "Pages", pct: subscriptionSummary?.pages.percentage ?? 0 },
                                        { label: "AI", pct: Math.max(
                                            subscriptionSummary?.simple_interactions.percentage ?? 0,
                                            subscriptionSummary?.complex_interactions.percentage ?? 0,
                                            subscriptionSummary?.extraction_interactions?.percentage ?? 0,
                                        )},
                                    ].map(({ label, pct }) => (
                                        <span key={label} className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                                            {label}{" "}
                                            <span className="font-bold text-zinc-500 dark:text-zinc-400">{pct}%</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-sm shrink-0">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                    </div>

                    {/* Subscription */}
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-page dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
                        <div className="space-y-2.5">
                            <p className="text-xs font-medium text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Subscription</p>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">{plan}</h3>
                            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                Credits used:{' '}
                                <span className="text-zinc-700 dark:text-zinc-300 font-bold">
                                    {credits} / {subscriptionSummary?.credits.total ?? 50}
                                </span>
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-sm shrink-0">
                            <CreditCard className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Bottom Grid Layout (Chart + Recent Activities) */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                    {/* Interaction Usage Line Chart Card */}
                    <div className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-page dark:bg-zinc-900/80 p-5 shadow-sm flex flex-col gap-4 h-[480px] lg:h-[580px]">
                        <div className="flex items-center justify-between w-full pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
                            <div className="space-y-0.5">
                                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Interaction Usage</h2>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Monthly billing overage metrics</p>
                            </div>

                            {/* Interactive dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-surface-page dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors h-8">
                                        <span>{getTimelineLabel()}</span>
                                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-lg p-1.5 shadow-md">
                                    <DropdownMenuItem
                                        onClick={() => setTimeframe("this-month")}
                                        className="px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        This Month
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setTimeframe("last-month")}
                                        className="px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        Last Month
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setTimeframe("last-7-days")}
                                        className="px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        Last 7 Days
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Chart Canvas */}
                        <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
                            <div className="w-full h-full min-h-[220px]">
                                <InteractionChart data={chartData[timeframe]} />
                            </div>
                        </div>

                        {/* Chart Legend + Footer */}
                        <div className="flex flex-wrap items-center justify-center gap-4 py-1.5 text-xs font-medium border-t border-zinc-100 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 block shrink-0" />
                                <span className="text-zinc-500 dark:text-zinc-400">Simple</span>
                                <span className="text-zinc-400 dark:text-zinc-600 text-[10px]">(0.5cr)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-orange-600 block shrink-0" />
                                <span className="text-zinc-500 dark:text-zinc-400">Complex</span>
                                <span className="text-zinc-400 dark:text-zinc-600 text-[10px]">(1.0cr)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-green-600 block shrink-0" style={{ backgroundImage: "repeating-linear-gradient(90deg,#16a34a 0,#16a34a 4px,transparent 4px,transparent 7px)" }} />
                                <span className="text-zinc-500 dark:text-zinc-400">Extraction</span>
                                <span className="text-zinc-400 dark:text-zinc-600 text-[10px]">(0.5cr)</span>
                            </div>
                            <span className="text-zinc-300 dark:text-zinc-700">·</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Interactions / Day</span>
                        </div>
                    </div>

                    {/* Recent Activities Card */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-page dark:bg-zinc-900/80 p-5 shadow-sm flex flex-col gap-4 h-[480px] lg:h-[580px]">
                        <div className="flex items-center justify-between w-full pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
                            <div className="space-y-0.5">
                                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Recent Activities</h2>
                                <p className="text-[11px] text-zinc-400 font-medium">Activity updates across categories</p>
                            </div>

                            {allActivities.length > 5 && (
                                <button
                                    onClick={() => setIsActivitiesModalOpen(true)}
                                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all cursor-pointer"
                                >
                                    View All ({allActivities.length})
                                </button>
                            )}
                        </div>

                        {/* Activities List */}
                        {recentActivities.length === 0 ? (
                            <NoActivitiesState />
                        ) : (
                            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-1 min-h-0 hover-scrollbar">
                                {recentActivities.map((act) => {
                                    const IconComp = act.icon;
                                    return (
                                        <div
                                            key={act.id}
                                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-100/50 dark:hover:border-zinc-800/40"
                                        >
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${act.iconColor}`}>
                                                <IconComp className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-normal break-all">
                                                    {act.title}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium min-w-0">
                                                    <span className="break-all">{act.subtitle}</span>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                                                    <span className="shrink-0">{act.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* View All Activities Popup Modal */}
                <Dialog open={isActivitiesModalOpen} onOpenChange={setIsActivitiesModalOpen}>
                    <DialogContent className="max-w-xl bg-surface-page dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col max-h-[85vh]">
                        <DialogHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
                            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                Recent Activities
                            </DialogTitle>
                            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                                A complete log of category actions and file operations.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Scrollable list inside modal */}
                        {allActivities.length === 0 ? (
                            <NoActivitiesState />
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3 no-scrollbar min-h-0">
                                {allActivities.map((act) => {
                                    const IconComp = act.icon;
                                    return (
                                        <div
                                            key={act.id}
                                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-100/50 dark:hover:border-zinc-800/40 min-w-0"
                                        >
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${act.iconColor}`}>
                                                <IconComp className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-normal break-all">
                                                    {act.title}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium min-w-0">
                                                    <span className="break-all">{act.subtitle}</span>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                                                    <span className="shrink-0">{act.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            );
}
