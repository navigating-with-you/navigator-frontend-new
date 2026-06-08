import { useState, useRef, useEffect, type JSX } from "react";
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
import { listEmployees, getRootContents, getUsage, getNotifications } from "@/lib/api";

// ─── TYPES & DATA ──────────────────────────────────────────────────────────

type DataPoint = {
    date: string;
    simple: number;
    complex: number;
};

// Data sets for interactive filtering
const dataSets: Record<string, DataPoint[]> = {
    "this-month": [
        { date: "Jun 1", simple: 3.1, complex: 2.1 },
        { date: "Jun 2", simple: 5.2, complex: 4.3 },
        { date: "Jun 3", simple: 3.3, complex: 3.7 },
        { date: "Jun 4", simple: 4.2, complex: 14.04 }, // Highlighted in tooltip mockup
        { date: "Jun 5", simple: 2.1, complex: 2.6 },
        { date: "Jun 6", simple: 1.8, complex: 3.6 },
        { date: "Jun 7", simple: 1.1, complex: 2.8 },
        { date: "Jun 8", simple: 3.5, complex: 4.3 },
        { date: "Jun 9", simple: 4.1, complex: 3.1 },
        { date: "Jun 10", simple: 3.5, complex: 3.8 },
        { date: "Jun 11", simple: 5.0, complex: 4.0 },
        { date: "Jun 12", simple: 4.8, complex: 3.5 },
    ],
    "last-month": [
        { date: "May 1", simple: 2.5, complex: 1.8 },
        { date: "May 2", simple: 4.1, complex: 3.2 },
        { date: "May 3", simple: 5.0, complex: 4.5 },
        { date: "May 4", simple: 3.8, complex: 8.4 },
        { date: "May 5", simple: 2.9, complex: 3.0 },
        { date: "May 6", simple: 1.5, complex: 2.2 },
        { date: "May 7", simple: 2.1, complex: 1.9 },
        { date: "May 8", simple: 4.0, complex: 5.1 },
        { date: "May 9", simple: 3.6, complex: 2.9 },
        { date: "May 10", simple: 4.8, complex: 4.2 },
        { date: "May 11", simple: 3.9, complex: 3.1 },
        { date: "May 12", simple: 4.2, complex: 3.8 },
    ],
    "last-7-days": [
        { date: "Jun 6", simple: 1.8, complex: 3.6 },
        { date: "Jun 7", simple: 1.1, complex: 2.8 },
        { date: "Jun 8", simple: 3.5, complex: 4.3 },
        { date: "Jun 9", simple: 4.1, complex: 3.1 },
        { date: "Jun 10", simple: 3.5, complex: 3.8 },
        { date: "Jun 11", simple: 5.0, complex: 4.0 },
        { date: "Jun 12", simple: 4.8, complex: 3.5 },
    ]
};


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
            const w = entries[0].contentRect.width;
            const h = entries[0].contentRect.height;
            if (w > 0 && h > 0) {
                setDimensions({ width: w, height: h });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Chart Dimensions
    const width = dimensions.width;
    const height = dimensions.height;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Y Axis labels
    const yMax = 15;
    const yTicks = [0, 3, 6, 9, 12, 15];

    const getTickValue = (tick: number) => `$${tick}`;

    // Calculate coordinates
    const getCoords = (d: DataPoint, idx: number) => {
        const divisor = data.length > 1 ? data.length - 1 : 1;
        const x = paddingLeft + (idx * chartWidth) / divisor;
        const y = paddingTop + chartHeight - (d.complex / yMax) * chartHeight;
        const ySimple = paddingTop + chartHeight - (d.simple / yMax) * chartHeight;
        return { x, y, ySimple };
    };

    // Build Paths
    const simplePoints = data.map((d, i) => {
        const { x, ySimple } = getCoords(d, i);
        return `${x},${ySimple}`;
    }).join(" ");

    const complexPoints = data.map((d, i) => {
        const { x, y } = getCoords(d, i);
        return `${x},${y}`;
    }).join(" ");

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!containerRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const physicalMouseX = e.clientX - rect.left;

        // Convert screen coordinates to SVG viewBox coordinates (width = 600)
        const viewBoxMouseX = (physicalMouseX / rect.width) * width;
        const percentageX = (viewBoxMouseX - paddingLeft) / chartWidth;
        const index = Math.round(percentageX * (data.length - 1));

        if (index >= 0 && index < data.length) {
            setHoveredIdx(index);
        }
    };

    const handleMouseLeave = () => {
        setHoveredIdx(null);
    };

    const hoveredData = hoveredIdx !== null && hoveredIdx < data.length ? data[hoveredIdx] : null;
    const hoveredCoords = hoveredData && hoveredIdx !== null ? getCoords(hoveredData, hoveredIdx) : null;

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[220px]">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full overflow-visible select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Horizontal Grid Lines */}
                {yTicks.map((tick, i) => {
                    const y = paddingTop + chartHeight - (tick / yMax) * chartHeight;
                    return (
                        <line
                            key={i}
                            x1={paddingLeft}
                            y1={y}
                            x2={width - paddingRight}
                            y2={y}
                            className="stroke-zinc-100 dark:stroke-zinc-800/80 stroke-1"
                            strokeDasharray="4 4"
                        />
                    );
                })}

                {/* Y Axis Labels */}
                {yTicks.map((tick, i) => {
                    const y = paddingTop + chartHeight - (tick / yMax) * chartHeight;
                    return (
                        <text
                            key={i}
                            x={paddingLeft - 12}
                            y={y + 4}
                            className="text-[10px] font-medium text-white text-right"
                            style={{ textAnchor: 'end' }}
                        >
                            {getTickValue(tick)}
                        </text>
                    );
                })}

                {/* X Axis Labels */}
                {data.map((d, i) => {
                    const divisor = data.length > 1 ? data.length - 1 : 1;
                    const x = paddingLeft + (i * chartWidth) / divisor;
                    return (
                        <text
                            key={i}
                            x={x}
                            y={height - 15}
                            className="text-[10px] font-medium text-white text-center"
                            style={{ textAnchor: 'middle' }}
                        >
                            {d.date}
                        </text>
                    );
                })}

                {/* Simple Interaction Line (Blue) */}
                <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    points={simplePoints}
                    className="transition-all duration-300"
                />

                {/* Complex Interaction Line (Orange) */}
                <polyline
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    points={complexPoints}
                    className="transition-all duration-300"
                />

                {/* Interactive Hover Indicators */}
                {hoveredCoords && hoveredData && (
                    <g>
                        <line
                            x1={hoveredCoords.x}
                            y1={paddingTop}
                            x2={hoveredCoords.x}
                            y2={height - paddingBottom}
                            className="stroke-zinc-400 dark:stroke-zinc-600 stroke-1"
                            strokeDasharray="3 3"
                        />
                        <circle
                            cx={hoveredCoords.x}
                            cy={hoveredCoords.ySimple}
                            r="6"
                            className="fill-white dark:fill-zinc-900 stroke-[#2563eb] stroke-2"
                        />
                        <circle
                            cx={hoveredCoords.x}
                            cy={hoveredCoords.y}
                            r="6"
                            className="fill-white dark:fill-zinc-900 stroke-[#ea580c] stroke-2"
                        />
                    </g>
                )}
            </svg>

            {/* Custom Interactive Tooltip */}
            {hoveredCoords && hoveredData && (
                <div
                    className="absolute bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl p-3 shadow-xl pointer-events-none transition-all duration-150 z-20"
                    style={{
                        left: `${(hoveredCoords.x / width) * 100}%`,
                        top: `${((hoveredCoords.ySimple + hoveredCoords.y) / 2 / height) * 100 - 15}%`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-5 text-zinc-500 dark:text-zinc-400 font-semibold mb-1">
                            <span>{hoveredData.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            <span className="text-zinc-600 dark:text-zinc-400">Simple Interactions:</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">${hoveredData.simple}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-orange-600" />
                            <span className="text-zinc-600 dark:text-zinc-400">Complex Interactions:</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">${hoveredData.complex}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
    const { getToken, isAuthenticated } = useKindeAuth();

    // Live states with dummy fallbacks
    const [employeesCount, setEmployeesCount] = useState<number>(0);
    const [kbSizeBytes, setKbSizeBytes] = useState<number>(0); // 0 bytes
    const [usageLimit, setUsageLimit] = useState<number>(0);
    const [plan, setPlan] = useState<string>("Core Plan");
    const [recentActivities, setRecentActivities] = useState<any[]>([]);

    const [isRefreshed, setIsRefreshed] = useState(false);
    const [timeframe, setTimeframe] = useState<string>("this-month");
    const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);

    const fetchLiveStats = async () => {
        try {
            const token = await getToken();
            if (!token) return;

            // Parallel fetches
            const [empData, rootData, usageData, notifData] = await Promise.all([
                listEmployees(token).catch(() => ({ employees: [] })),
                getRootContents(token).catch(() => ({ folders: [], files: [] })),
                getUsage(token).catch(() => null),
                getNotifications(token).catch(() => ({ notifications: [] }))
            ]);

            // 1. Calculate proper employees count (members only, no invites)
            const activeEmployees = empData?.employees || (Array.isArray(empData) ? empData : []);
            setEmployeesCount(activeEmployees.length);

            // 2. Calculate proper KB/MB/GB folder sizes recursively
            const foldersBytes = (rootData.folders || []).reduce((acc: number, f: any) => acc + (f.total_size || 0), 0);
            const filesBytes = (rootData.files || []).reduce((acc: number, f: any) => acc + (f.file_size || 0), 0);
            const totalBytes = foldersBytes + filesBytes;
            setKbSizeBytes(totalBytes);

            // 3. Overall Usage & Subscription
            if (usageData) {
                setPlan(`${usageData.plan} Plan`);
                const pagesPct = usageData.pages.limit ? (usageData.pages.used / usageData.pages.limit) * 100 : 0;
                const simplePct = usageData.simple_interactions.limit ? (usageData.simple_interactions.used / usageData.simple_interactions.limit) * 100 : 0;
                const complexPct = usageData.complex_interactions.limit ? (usageData.complex_interactions.used / usageData.complex_interactions.limit) * 100 : 0;
                const overallPct = Math.round(Math.max(pagesPct, simplePct, complexPct));
                setUsageLimit(overallPct || 0);
            }

            // 4. Map notifications to recent activities
            const rawNotifs = notifData?.notifications || [];
            const mapped = rawNotifs.slice(0, 10).map((n: any) => {
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
            setRecentActivities(mapped);
        } catch (e) {
            console.warn("Failed to retrieve live stats for dashboard:", e);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchLiveStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

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
        <div className="p-3 sm:p-6 md:p-8 pb-8 flex flex-col w-full bg-transparent select-none animate-fade-in" data-testid="dashboard-page">
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
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshed}
                            className="gap-2 rounded-lg border-[#E7E7E0] bg-[#FEFFFA] hover:bg-[#F5F5F0] dark:border-zinc-700 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
                        >
                            <RefreshCw className={`h-4 w-4 text-zinc-500 dark:text-zinc-400 ${isRefreshed ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">{isRefreshed ? "Refreshing..." : "Refresh"}</span>
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
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
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
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
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
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
                    <div className="space-y-2.5 flex-1 pr-3">
                        <p className="text-xs font-medium text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Usage Limit</p>
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{usageLimit}%</h3>

                        <div className="space-y-1 pt-1">
                            <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                    style={{ width: `${usageLimit}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium">Overall Usage</p>
                        </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-sm shrink-0">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                </div>

                {/* Subscription */}
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:shadow">
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Subscription</p>
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">{plan}</h3>
                        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                            Renews on <span className="text-zinc-700 dark:text-zinc-300 font-bold">10 July 2026</span>
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
                <div className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-sm flex flex-col gap-4 h-[480px] lg:h-[580px]">
                    <div className="flex items-center justify-between w-full pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <div className="space-y-0.5">
                            <h2 className="text-base font-bold text-white">Interaction Usage</h2>
                            <p className="text-[11px] text-white font-medium">Monthly billing overage metrics</p>
                        </div>

                        {/* Interactive dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors h-8">
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

                    {/* Chart Legend */}
                    <div className="flex items-center gap-4 text-xs font-medium self-end px-2">
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-blue-600 block shrink-0" />
                            <span className="text-white">Simple Interaction</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-orange-600 block shrink-0" />
                            <span className="text-white">Complex Interaction</span>
                        </div>
                    </div>

                    {/* Chart Canvas */}
                    <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
                        <div className="w-full h-full min-h-[220px]">
                            <InteractionChart data={dataSets[timeframe]} />
                        </div>
                    </div>

                    {/* Chart Footer Indicator */}
                    <div className="flex items-center justify-center gap-1 py-1 bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/60 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white">
                            Dollar / Monthly
                        </p>
                    </div>
                </div>

                {/* Recent Activities Card */}
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-sm flex flex-col gap-4 h-[480px] lg:h-[580px]">
                    <div className="flex items-center justify-between w-full pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <div className="space-y-0.5">
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Recent Activities</h2>
                            <p className="text-[11px] text-zinc-400 font-medium">Activity updates across the team</p>
                        </div>

                        <button
                            onClick={() => setIsActivitiesModalOpen(true)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all cursor-pointer"
                        >
                            View All
                        </button>
                    </div>

                    {/* Activities List */}
                    {recentActivities.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                            <svg
                                className="w-14 h-14 text-zinc-300 dark:text-zinc-700 mb-3"
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M10 4C7.79086 4 6 5.79086 6 8V40C6 42.2091 7.79086 44 10 44H38C40.2091 44 42 42.2091 42 40V16L30 4H10Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M30 4V16H42L30 4Z"
                                    fill="currentColor"
                                    fillOpacity="0.2"
                                />
                                <rect x="14" y="24" width="20" height="4" rx="2" fill="#FEFFFA" className="dark:fill-zinc-900" />
                                <rect x="14" y="32" width="12" height="4" rx="2" fill="#FEFFFA" className="dark:fill-zinc-900" />
                            </svg>
                            <h3 className="text-sm font-semibold text-zinc-750 dark:text-zinc-300">
                                No Data Found
                            </h3>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                No interactions available yet.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-400 dark:hover:scrollbar-thumb-zinc-600">
                            {recentActivities.map((act) => {
                                const IconComp = act.icon;
                                return (
                                    <div
                                        key={act.id}
                                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-100/50 dark:hover:border-zinc-800/40"
                                    >
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-xs ${act.iconColor}`}>
                                            <IconComp className="h-4.5 w-4.5" />
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
                <DialogContent className="max-w-xl bg-[#FEFFFA] dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col max-h-[85vh] select-none">
                    <DialogHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
                        <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Recent Activities
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                            A complete log of team actions and file operations.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scrollable list inside modal */}
                    {recentActivities.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                            <svg
                                className="w-14 h-14 text-zinc-300 dark:text-zinc-700 mb-3"
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M10 4C7.79086 4 6 5.79086 6 8V40C6 42.2091 7.79086 44 10 44H38C40.2091 44 42 42.2091 42 40V16L30 4H10Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M30 4V16H42L30 4Z"
                                    fill="currentColor"
                                    fillOpacity="0.2"
                                />
                                <rect x="14" y="24" width="20" height="4" rx="2" fill="#FEFFFA" className="dark:fill-zinc-900" />
                                <rect x="14" y="32" width="12" height="4" rx="2" fill="#FEFFFA" className="dark:fill-zinc-900" />
                            </svg>
                            <h3 className="text-sm font-semibold text-zinc-750 dark:text-zinc-300">
                                No Data Found
                            </h3>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                No interactions available yet.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3 no-scrollbar min-h-0">
                            {recentActivities.map((act) => {
                                const IconComp = act.icon;
                                return (
                                    <div
                                        key={act.id}
                                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-zinc-100/50 dark:hover:border-zinc-800/40 min-w-0"
                                    >
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-xs ${act.iconColor}`}>
                                            <IconComp className="h-4.5 w-4.5" />
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
