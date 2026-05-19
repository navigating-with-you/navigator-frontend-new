import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import {
    LayoutGrid,
    Users,
    ListTree,
    FileStack,
    Plug,
    CreditCard,
    Receipt,
    PenSquare,
    Search,
    AlertTriangle,
    ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { JSX } from "react";
import { toast } from "sonner";

type NavItemType = {
    to: string;
    label: string;
    icon: LucideIcon;
};

type ChatHistoryItem = {
    id: string;
    label: string;
};

type NavItemProps = NavItemType & {
    collapsed?: boolean;
};

type SidebarProps = {
    open: boolean;
    onSearchClick?: () => void;
};

const mainNav: NavItemType[] = [
    { to: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "employees", label: "Employees", icon: Users },
    { to: "teams", label: "Teams", icon: ListTree },
    { to: "knowledge-base", label: "Knowledge Base", icon: FileStack },
    { to: "integration", label: "Integration", icon: Plug },
    { to: "subscription", label: "Subscription", icon: CreditCard },
    { to: "billing", label: "Billing", icon: Receipt },
];

const chatNav: NavItemType[] = [
    { to: "chatnew", label: "New Chat", icon: PenSquare },
    { to: "chatsearch", label: "Search Chats", icon: Search },
];

const chatHistory: ChatHistoryItem[] = [
    { id: "h1", label: "Policy Update Information" },
    { id: "h2", label: "Annual Leave Guidelines" },
    { id: "h3", label: "IT Hardware Requisition" },
];

function ProgressCircle({ percentage, color }: { percentage: number; color: string }) {
    const strokeDasharray = `${percentage}, 100`;
    return (
        <svg className="w-5 h-5 shrink-0 -rotate-90" viewBox="0 0 36 36">
            <path
                className="text-zinc-100"
                strokeWidth="5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
                className={color}
                strokeDasharray={strokeDasharray}
                strokeWidth="5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
        </svg>
    );
}

function UsageCardContent({ navigate, compact = false }: { navigate: any; compact?: boolean }) {
    if (!compact) return (
        <div className="w-full bg-white rounded-2xl p-1 select-none">
            {/* FULL VERSION - for collapsed popover */}
            <div className="space-y-4">
                {/* Top orange banner */}
                <div className="rounded-xl bg-[#fff7ed] p-3 border border-[#ffedd5]">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-[#ea580c] shrink-0" />
                        <span className="text-sm font-semibold text-[#ea580c]">
                            Approaching usage limits
                        </span>
                    </div>
                    <div className="mt-1 ml-7 text-xs text-zinc-600">
                        Current Plan: <span className="font-semibold text-zinc-900">Core</span>
                    </div>
                </div>

                {/* Circular progress rows */}
                <div className="space-y-3 px-1 text-xs text-zinc-600 font-medium">
                    <div className="flex items-center gap-2.5">
                        <ProgressCircle percentage={84} color="text-[#ea580c]" />
                        <div>
                            Complex Tasks <span className="font-bold text-zinc-900">(84%)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="flex items-center gap-2">
                            <ProgressCircle percentage={32} color="text-blue-600" />
                            <div className="truncate">
                                Core Tasks <span className="font-bold text-zinc-900">(32%)</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ProgressCircle percentage={50} color="text-blue-600" />
                            <div className="truncate">
                                Pages <span className="font-bold text-zinc-900">(5)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => navigate("/subscription")}
                            className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                        >
                            View Plans
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Upgrade Button */}
                <Button
                    onClick={() => navigate("/subscription")}
                    className="w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] rounded-xl font-semibold shadow-md py-2.5 h-10 cursor-pointer text-xs"
                >
                    Upgrade for More Usage
                </Button>
            </div>
        </div>
    );

    // COMPACT version for expanded sidebar
    return (
        <div className="space-y-2">
            <div className="rounded-xl border border-orange-200/80 bg-orange-50/80 p-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="text-xs font-semibold text-orange-800 truncate">Usage at 84%</span>
                    </div>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Core Plan</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 bg-orange-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: '84%' }} />
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/subscription")}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0 flex items-center gap-0.5 cursor-pointer"
                    >
                        Plans <ArrowRight className="h-3 w-3" />
                    </button>
                </div>
            </div>
            <Button
                size="sm"
                onClick={() => navigate("/subscription")}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold h-8 cursor-pointer"
            >
                Upgrade for More Usage
            </Button>
        </div>
    );
}

function NavItem({
    to,
    label,
    icon: Icon,
    collapsed = false,
}: NavItemProps) {
    const testId = `nav-${label.toLowerCase().replace(/\s+/g, "-")}`;

    if (collapsed) {
        return (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <NavLink
                            to={to}
                            data-testid={testId}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-zinc-100 text-zinc-900"
                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                )
                            }
                        >
                            <Icon className="h-5 w-5" />
                        </NavLink>
                    </TooltipTrigger>

                    <TooltipContent side="right">
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <NavLink
            to={to}
            data-testid={testId}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )
            }
        >
            <div className="flex h-5 w-5 items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
            </div>
            <span>{label}</span>
        </NavLink>
    );
}

export default function Sidebar({
    open,
    onSearchClick,
}: SidebarProps): JSX.Element {
    const collapsed = !open;
    const navigate = useNavigate();

    if (collapsed) {
        return (
            <aside
                className="hidden lg:flex h-full w-[72px] flex-col items-center border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden shrink-0 select-none"
                data-testid="sidebar-collapsed"
            >
                {/* Logo */}
                <div className="h-[68px] w-full flex items-center justify-center shrink-0">
                    <NavLink to="/dashboard" aria-label="Go to Dashboard">
                        <img src="/logo.svg" alt="Logo" className="h-7 w-7" />
                    </NavLink>
                </div>

                {/* Main Nav + Chat - scroll area */}
                <div className="flex-1 overflow-y-auto w-full hover-scrollbar">
                    <div className="flex flex-col items-center py-2 gap-0.5 w-full">
                        {/* Main Nav */}
                        {mainNav.map((item) => (
                            <TooltipProvider key={item.to} delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <NavLink
                                            to={item.to}
                                            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                                            className={({ isActive }) =>
                                                cn(
                                                    "mx-auto flex items-center justify-center h-10 w-10 rounded-xl transition-all",
                                                    isActive
                                                        ? "bg-white text-zinc-900 shadow-sm"
                                                        : "text-zinc-500 hover:bg-white hover:text-zinc-800"
                                                )
                                            }
                                        >
                                            <item.icon className="h-[18px] w-[18px]" />
                                        </NavLink>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="text-xs">
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}

                        {/* Divider */}
                        <div className="w-8 border-t border-zinc-200 my-2" />

                        {/* Chat Label */}
                        <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Chat</span>

                        {/* Chat Nav */}
                        {chatNav.map((item) => (
                            <TooltipProvider key={item.to} delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {item.to === "chatsearch" ? (
                                            <button
                                                type="button"
                                                onClick={onSearchClick}
                                                className="mx-auto flex items-center justify-center h-10 w-10 rounded-xl transition-all text-zinc-500 hover:bg-white hover:text-zinc-800 cursor-pointer"
                                            >
                                                <item.icon className="h-[18px] w-[18px]" />
                                            </button>
                                        ) : (
                                            <NavLink
                                                to={item.to}
                                                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                                                className={({ isActive }) =>
                                                    cn(
                                                        "mx-auto flex items-center justify-center h-10 w-10 rounded-xl transition-all",
                                                        isActive
                                                            ? "bg-white text-zinc-900 shadow-sm"
                                                            : "text-zinc-500 hover:bg-white hover:text-zinc-800"
                                                    )
                                                }
                                            >
                                                <item.icon className="h-[18px] w-[18px]" />
                                            </NavLink>
                                        )}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="text-xs">
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>

                {/* Bottom: usage alert */}
                <div className="w-full flex items-center justify-center py-3 border-t border-zinc-200 shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
                                aria-label="Usage limits alert"
                            >
                                <AlertTriangle className="h-[18px] w-[18px]" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="end" sideOffset={16} className="w-72 p-2.5 rounded-2xl border border-zinc-100 shadow-2xl bg-white">
                            <UsageCardContent navigate={navigate} />
                        </PopoverContent>
                    </Popover>
                </div>
            </aside>
        );
    }


    return (
        <aside
            className="fixed inset-y-0 left-0 z-40 flex h-full w-[260px] flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xl lg:static lg:shadow-none transition-transform duration-300 shrink-0 select-none"
            data-testid="sidebar"
        >
            {/* Logo */}
            <NavLink to="/dashboard" className="flex items-center gap-2.5 px-5 py-5 shrink-0">
                <img
                    src="/logo.svg"
                    alt="Logo"
                    className="h-6 w-6 shrink-0"
                />

                <span className="text-xl font-semibold tracking-tight text-blue-600">
                    Navigator
                </span>
            </NavLink>

            {/* Main Nav */}
            <nav className="flex flex-col gap-1 px-2 pb-2 shrink-0">
                {mainNav.map((item) => (
                    <NavItem
                        key={item.to}
                        {...item}
                    />
                ))}
            </nav>

            <div className="my-2 border-t border-zinc-100 shrink-0" />

            {/* Chat Section */}
            <div className="px-5 pb-1 pt-1 text-sm font-medium text-zinc-500 shrink-0">
                Chat
            </div>

            <nav className="flex flex-col gap-1 px-2 shrink-0">
                {chatNav.map((item) => {
                    if (item.to === "chatsearch") {
                        return (
                            <button
                                key={item.to}
                                type="button"
                                onClick={onSearchClick}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer text-left w-full"
                            >
                                <div className="flex h-5 w-5 items-center justify-center shrink-0">
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <span>{item.label}</span>
                            </button>
                        );
                    }
                    return (
                        <NavItem
                            key={item.to}
                            {...item}
                        />
                    );
                })}
            </nav>

            <div className="my-2 border-t border-zinc-100 shrink-0" />

            {/* Chat History */}
            <div className="px-5 pb-1 text-sm font-medium text-zinc-500 shrink-0">
                Chat History
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-1 hover-scrollbar min-h-0">
                {chatHistory.map((h) => (
                    <button
                        key={h.id}
                        type="button"
                        onClick={() => toast.success(`Loaded chat: "${h.label}"`)}
                        data-testid={`chat-history-${h.id}`}
                        className="rounded-md px-3 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer shrink-0 truncate"
                    >
                        {h.label}
                    </button>
                ))}
            </div>

            {/* Usage Card & Upgrade */}
            <div className="shrink-0 mt-2 px-3 pb-4 border-t border-zinc-100 pt-3 bg-white">
                <UsageCardContent navigate={navigate} compact />
            </div>
        </aside>
    );
}