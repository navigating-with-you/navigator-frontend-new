import React, { useState, useEffect } from "react";
import type { JSX } from "react";
import {
    Settings,
    Sun,
    Moon,
    User,
    CreditCard,
    Languages,
    Info,
    Key,
    HelpCircle,
    Building2,
    LogOut,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getUsage, type UsageData } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/utils/rbacConfig";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
import { USFlag, FrenchFlag, JapaneseFlag, SpanishFlag } from "@/utils/flagIcons";
import ChangePasswordDrawer from "@/components/layout/ChangePasswordDrawer";
import OrganizationProfileDrawer from "@/components/layout/OrganizationProfileDrawer";

function usageBarColor(pct: number): string {
    if (pct >= 90) return "#ef4444";
    if (pct >= 70) return "#f97316";
    return "#3b82f6";
}

interface UsageRowProps {
    label: string;
    used: number | undefined;
    limit: number;
}

function UsageRow({ label, used, limit }: UsageRowProps): JSX.Element {
    const pct = used != null ? Math.min((used / limit) * 100, 100) : 0;
    const color = usageBarColor(pct);
    const displayText = used != null ? `${used}/${limit}` : `—/${limit}`;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                <span>{label}</span>
                <span
                    className="font-medium tabular-nums"
                    style={{ color: used != null && pct >= 70 ? color : undefined }}
                >
                    {displayText}
                </span>
            </div>
            <div className="h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={
                        {
                            "--pct": `${pct}%`,
                            width: "var(--pct)",
                            backgroundColor: color,
                        } as React.CSSProperties
                    }
                />
            </div>
        </div>
    );
}

interface UserMenuDropdownProps {
    onProfileClick: () => void;
}

export function UserMenuDropdown({ onProfileClick }: UserMenuDropdownProps): JSX.Element {
    const { logout, user, getToken } = useKindeAuth();
    const { hasPermission } = usePermissions();
    const canViewOrgDetails = hasPermission(PERMISSIONS.ORG_VIEW);
    const canViewBilling = hasPermission(PERMISSIONS.BILLING_VIEW);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [organizationProfileOpen, setOrganizationProfileOpen] = useState(false);
    const [isWsConnected, setIsWsConnected] = useState(false);

    useEffect(() => {
        const syncWs = () => setIsWsConnected(cacheWebSocket.isConnected());
        syncWs();
        cacheWebSocket.on("ws:connected", syncWs);
        cacheWebSocket.on("ws:disconnected", syncWs);
        const pollInterval = setInterval(syncWs, 250);
        const stopPolling = setTimeout(() => clearInterval(pollInterval), 6000);
        return () => {
            clearInterval(pollInterval);
            clearTimeout(stopPolling);
            cacheWebSocket.off("ws:connected", syncWs);
            cacheWebSocket.off("ws:disconnected", syncWs);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const fetchUsage = async () => {
            try {
                const token = await getToken();
                if (token && !cancelled) {
                    const data = await getUsage(token);
                    if (!cancelled) setUsage(data);
                }
            } catch {
                // Non-critical — usage card falls back to dashes
            }
        };
        fetchUsage();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="ml-1 relative flex items-center justify-center outline-none bg-transparent p-2 rounded-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        data-testid="user-profile"
                        data-tour="profile"
                    >
                        <User className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                        <span className={cn(
                            "absolute bottom-1 right-1 block h-2 w-2 rounded-full ring-2 ring-surface-page dark:ring-zinc-900 transition-all duration-300",
                            isWsConnected ? "bg-green-500" : "bg-yellow-500"
                        )} />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={2}
                    className="w-[300px] rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 space-y-3.5 focus:outline-none"
                >
                    {canViewBilling && (
                        <div className="rounded-[10px] bg-[#60646B14] dark:bg-zinc-800/40 p-3 border border-zinc-150/60 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Overall Usage</span>
                                <Button
                                    size="sm"
                                    onClick={() => navigate("/subscription")}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-semibold px-2.5 py-0.5 h-6 cursor-pointer"
                                >
                                    Upgrade
                                </Button>
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                    <span>Plan</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                        {usage?.plan ?? "Core"}
                                    </span>
                                </div>
                                <UsageRow label="Pages" used={usage?.pages.used} limit={usage?.pages.limit ?? 500} />
                                <UsageRow label="Simple Interactions" used={usage?.simple_interactions.used} limit={usage?.simple_interactions.limit ?? 350} />
                                <UsageRow label="Complex Interactions" used={usage?.complex_interactions.used} limit={usage?.complex_interactions.limit ?? 100} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2.5 pb-1">
                            Profile
                        </div>

                        <DropdownMenuItem
                            onClick={onProfileClick}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                        >
                            <User className="h-4 w-4 text-zinc-500" />
                            <span className="font-medium">My Profile</span>
                        </DropdownMenuItem>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger
                                className="flex items-center px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 data-[state=open]:bg-[#60646B1A] dark:data-[state=open]:bg-zinc-800 cursor-pointer select-none [&_svg]:size-4 [&_svg]:shrink-0"
                            >
                                <div className="flex items-center gap-2.5 flex-1">
                                    {theme === "light" ? (
                                        <Sun className="h-4 w-4 text-zinc-500" />
                                    ) : theme === "dark" ? (
                                        <Moon className="h-4 w-4 text-zinc-500" />
                                    ) : (
                                        <Settings className="h-4 w-4 text-zinc-500" />
                                    )}
                                    <span className="font-medium">Theme</span>
                                </div>
                                <span className="text-blue-600 dark:text-blue-400 font-medium text-xs mr-0.5 capitalize">
                                    {theme}
                                </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent
                                    sideOffset={8}
                                    className="w-[150px] rounded-lg p-2.5 border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 space-y-0.5 focus:outline-none"
                                >
                                    {(["light", "dark", "system"] as const).map((t) => (
                                        <DropdownMenuItem
                                            key={t}
                                            onSelect={(e) => { e.preventDefault(); setTheme(t); }}
                                            className={cn(
                                                "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer",
                                                theme === t && "bg-[#60646B0D] dark:bg-zinc-800/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {t === "light" ? <Sun className="h-4 w-4 text-zinc-500" /> : t === "dark" ? <Moon className="h-4 w-4 text-zinc-500" /> : <Settings className="h-4 w-4 text-zinc-500" />}
                                                <span className="capitalize">{t}</span>
                                            </div>
                                            {theme === t && (
                                                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 shrink-0">
                                                    <Check className="h-2 w-2 stroke-[4] text-white" />
                                                </div>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        {canViewBilling && (
                            <DropdownMenuItem
                                onClick={() => navigate("/subscription")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <CreditCard className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">Subscription</span>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger
                                className="flex items-center px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 data-[state=open]:bg-[#60646B1A] dark:data-[state=open]:bg-zinc-800 cursor-pointer select-none [&_svg]:size-4 [&_svg]:shrink-0"
                            >
                                <div className="flex items-center gap-2.5 flex-1">
                                    <Languages className="h-4 w-4 text-zinc-500" />
                                    <span className="font-medium">Language</span>
                                </div>
                                <span className="text-blue-600 dark:text-blue-400 font-medium text-xs mr-0.5">English</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent
                                    sideOffset={8}
                                    className="w-[180px] rounded-[10px] p-[10px] border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 space-y-0.5 focus:outline-none"
                                >
                                    <DropdownMenuItem className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 bg-[#60646B0D] dark:bg-zinc-800/40 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer">
                                        <div className="flex items-center gap-3"><USFlag /><span className="font-medium">English</span></div>
                                        <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 shrink-0">
                                            <Check className="h-2 w-2 stroke-[4] text-white" />
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                                        <div className="flex items-center gap-3"><FrenchFlag /><span className="font-medium">French</span></div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                                        <div className="flex items-center gap-3"><JapaneseFlag /><span className="font-medium">Japanese</span></div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                                        <div className="flex items-center gap-3"><SpanishFlag /><span className="font-medium">Spanish</span></div>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuItem
                            onClick={() => toast.info("About Navigator details")}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                        >
                            <Info className="h-4 w-4 text-zinc-500" />
                            <span className="font-medium">About</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => setChangePasswordOpen(true)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                        >
                            <Key className="h-4 w-4 text-zinc-500" />
                            <span className="font-medium">Change Password</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => toast.info("Help center")}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                        >
                            <HelpCircle className="h-4 w-4 text-zinc-500" />
                            <span className="font-medium">Help</span>
                        </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />

                    {canViewOrgDetails && (
                        <>
                            <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2.5 pb-1">
                                    Organization
                                </div>
                                <DropdownMenuItem
                                    onClick={() => setOrganizationProfileOpen(true)}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                                >
                                    <Building2 className="h-4 w-4 text-zinc-500" />
                                    <span className="font-medium">Organization Details</span>
                                </DropdownMenuItem>
                            </div>
                            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
                        </>
                    )}

                    <DropdownMenuItem
                        onClick={() => logout()}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-red-650 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20 focus:bg-red-50/50 dark:focus:bg-red-950/20 cursor-pointer"
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span className="font-medium">Sign Out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ChangePasswordDrawer open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
            <OrganizationProfileDrawer open={organizationProfileOpen} onOpenChange={setOrganizationProfileOpen} />
        </>
    );
}
