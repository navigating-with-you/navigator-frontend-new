import {
    PanelLeft,
    Bell,
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
    X,
    UserPlus,
    UserMinus,
    FileUp,
    FileMinus,
    Shield,
    Check,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
import { toast } from "sonner";
import ChangePasswordDrawer from "@/components/layout/ChangePasswordDrawer";
import OrganizationProfileDrawer from "@/components/layout/OrganizationProfileDrawer";


import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getUsage, type UsageData, getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications, type NotificationItem } from "@/lib/api";
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


// ── UsageRow ─────────────────────────────────────────────────────────────────
// A single row in the Overall Usage card with a variable-width progress bar.
// The bar width is driven by a CSS custom property `--pct` so it animates
// smoothly when the data arrives and stays fully declarative.

function usageBarColor(pct: number): string {
    if (pct >= 90) return "#ef4444"; // red-500
    if (pct >= 70) return "#f97316"; // orange-500
    return "#3b82f6";               // blue-500
}

function formatActualTime(dateString: string): string {
    try {
        // Parse naive UTC datetimes as UTC by appending 'Z' if no timezone offset is present
        let formattedString = dateString;
        const hasTimezone = dateString.endsWith("Z") || 
                            /\+\d{2}:?\d{2}$/.test(dateString) || 
                            /-\d{2}:?\d{2}$/.test(dateString);
        if (!hasTimezone) {
            formattedString = `${dateString}Z`;
        }
        const date = new Date(formattedString);
        const now = new Date();
        
        const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const timeStr = date.toLocaleTimeString([], timeOptions);
        
        // Today
        if (date.toDateString() === now.toDateString()) {
            return `Today, ${timeStr}`;
        }
        
        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${timeStr}`;
        }
        
        // Month Day
        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const dateStr = date.toLocaleDateString([], dateOptions);
        return `${dateStr}, ${timeStr}`;
    } catch (e) {
        return "";
    }
}

function getNotificationConfig(type: string) {
    switch (type) {
        case "team_added":
            return {
                icon: UserPlus,
                iconColor: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
                borderColor: "border-l-blue-500",
            };
        case "team_removed":
            return {
                icon: UserMinus,
                iconColor: "text-orange-650 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40",
                borderColor: "border-l-orange-500",
            };
        case "role_updated":
            return {
                icon: Shield,
                iconColor: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
                borderColor: "border-l-purple-500",
            };
        case "file_uploaded":
            return {
                icon: FileUp,
                iconColor: "text-green-650 dark:text-green-400 bg-green-50 dark:bg-green-950/40",
                borderColor: "border-l-green-500",
            };
        case "file_removed":
            return {
                icon: FileMinus,
                iconColor: "text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/40",
                borderColor: "border-l-red-500",
            };
        default:
            return {
                icon: Bell,
                iconColor: "text-zinc-650 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800",
                borderColor: "border-l-zinc-300 dark:border-l-zinc-700",
            };
    }
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
            {/* Variable-width progress bar */}
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

const USFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="us-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#us-mask)">
            <rect width="20" height="20" fill="#FCFCFC"/>
            {/* Stripes */}
            <path d="M0 1.538h20M0 4.615h20M0 7.692h20M0 10.769h20M0 13.846h20M0 16.923h20" stroke="#E31D23" strokeWidth="1.54"/>
            {/* Canton */}
            <rect width="10.77" height="10.77" fill="#0A3161"/>
            {/* Stylized stars */}
            <circle cx="2.2" cy="2.2" r="0.5" fill="#FCFCFC"/>
            <circle cx="5.0" cy="2.2" r="0.5" fill="#FCFCFC"/>
            <circle cx="7.8" cy="2.2" r="0.5" fill="#FCFCFC"/>
            <circle cx="3.6" cy="5.0" r="0.5" fill="#FCFCFC"/>
            <circle cx="6.4" cy="5.0" r="0.5" fill="#FCFCFC"/>
            <circle cx="2.2" cy="7.8" r="0.5" fill="#FCFCFC"/>
            <circle cx="5.0" cy="7.8" r="0.5" fill="#FCFCFC"/>
            <circle cx="7.8" cy="7.8" r="0.5" fill="#FCFCFC"/>
        </g>
    </svg>
);

const FrenchFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0 border border-zinc-200/60 dark:border-zinc-800" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="fr-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#fr-mask)">
            <rect x="0" width="6.67" height="20" fill="#002395"/>
            <rect x="6.67" width="6.67" height="20" fill="#FCFCFC"/>
            <rect x="13.34" width="6.67" height="20" fill="#ED2939"/>
        </g>
    </svg>
);

const JapaneseFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0 border border-zinc-200/60 dark:border-zinc-800" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="jp-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#jp-mask)">
            <rect width="20" height="20" fill="#FCFCFC"/>
            <circle cx="10" cy="10" r="4.5" fill="#BC002D"/>
        </g>
    </svg>
);

const SpanishFlag = () => (
    <svg className="w-[18px] h-[18px] rounded-full shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="es-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
            <circle cx="10" cy="10" r="10" fill="#FCFCFC"/>
        </mask>
        <g mask="url(#es-mask)">
            <rect y="0" width="20" height="5" fill="#C60B1E"/>
            <rect y="5" width="20" height="10" fill="#FBE122"/>
            <rect y="15" width="20" height="5" fill="#C60B1E"/>
        </g>
    </svg>
);


type TopBarProps = {
    onToggleSidebar: () => void;
    onProfileClick: () => void;
};

export default function TopBar({
    onToggleSidebar,
    onProfileClick,
}: TopBarProps): JSX.Element {
    const { logout, user, getToken } = useKindeAuth();
    const { hasPermission } = usePermissions();
    const canViewOrgDetails = hasPermission(PERMISSIONS.ORG_VIEW);
    const canViewBilling = hasPermission(PERMISSIONS.BILLING_VIEW);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [organizationProfileOpen, setOrganizationProfileOpen] = useState(false);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [isWsConnected, setIsWsConnected] = useState(false);

    useEffect(() => {
        setIsWsConnected(cacheWebSocket.isConnected());

        const handleConnect = () => setIsWsConnected(true);
        const handleDisconnect = () => setIsWsConnected(false);

        cacheWebSocket.on("ws:connected", handleConnect);
        cacheWebSocket.on("ws:disconnected", handleDisconnect);

        return () => {
            cacheWebSocket.off("ws:connected", handleConnect);
            cacheWebSocket.off("ws:disconnected", handleDisconnect);
        };
    }, []);


    useEffect(() => {
        const loadProfile = () => {
            const stored = sessionStorage.getItem("navigator_user_profile");
            if (stored) {
                try {
                    setProfile(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse stored profile", e);
                }
            }
        };
        loadProfile();

        // Listen for profile changes from ProfilePage or AuthInitializer sync
        window.addEventListener("storage", loadProfile);
        window.addEventListener("navigator_user_synced", loadProfile);
        return () => {
            window.removeEventListener("storage", loadProfile);
            window.removeEventListener("navigator_user_synced", loadProfile);
        };
    }, [user]);

    // Fetch live usage stats whenever the dropdown user changes
    useEffect(() => {
        let cancelled = false;
        const fetchUsage = async () => {
            try {
                const token = await getToken();
                if (token && !cancelled) {
                    const data = await getUsage(token);
                    if (!cancelled) setUsage(data);
                }
            } catch (e) {
                // Non-critical — usage card will fall back to dashes
                console.warn("Failed to fetch usage stats", e);
            }
        };
        fetchUsage();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const fetchNotifications = async () => {
        try {
            const token = await getToken();
            if (token) {
                const res = await getNotifications(token);
                setNotifications(res.notifications || []);
                setUnreadCount(res.unread_count || 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s as fallback

        const handleNotificationCreated = (event: any) => {
            if (profile?.id && event.resource_id === profile.id) {
                console.log("[WebSocket] Received real-time notification push, fetching...");
                fetchNotifications();
            }
        };

        cacheWebSocket.on("notification:created", handleNotificationCreated);

        return () => {
            clearInterval(interval);
            cacheWebSocket.off("notification:created", handleNotificationCreated);
        };
    }, [user, profile?.id]);

    const handleMarkAsRead = async (notificationId: string) => {
        // Optimistic UI update to instantly clear bubble
        setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const token = await getToken();
            if (token) {
                await markNotificationRead(notificationId, token);
            }
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
            fetchNotifications();
        }
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic UI update to instantly clear bubble
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            const token = await getToken();
            if (token) {
                await markAllNotificationsRead(token);
                toast.success("All notifications marked as read");
            }
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            fetchNotifications();
        }
    };

    const handleDeleteNotification = async (notificationId: string, isUnread: boolean) => {
        // Optimistic UI update to instantly clear item
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (isUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        try {
            const token = await getToken();
            if (token) {
                await deleteNotification(notificationId, token);
            }
        } catch (err) {
            console.error("Failed to delete notification:", err);
            fetchNotifications();
        }
    };

    const handleClearAll = async () => {
        // Optimistic UI update to instantly clear list
        setNotifications([]);
        setUnreadCount(0);

        try {
            const token = await getToken();
            if (token) {
                await clearAllNotifications(token);
                toast.success("All notifications cleared");
            }
        } catch (err) {
            console.error("Failed to clear notifications:", err);
            fetchNotifications();
        }
    };

    return (
        <>
        <header
            className="flex h-[68px] w-full items-center justify-between border-b border-zinc-200 bg-[#FEFFFA] dark:bg-zinc-900 dark:border-zinc-800 px-5 shrink-0"
            data-testid="topbar"
        >
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    data-testid="toggle-sidebar-btn"
                    aria-label="Toggle sidebar"
                >
                    <PanelLeft className="h-5 w-5 text-zinc-700" />
                </Button>
            </div>

            <div className="flex items-center gap-3" data-tour="topbar-actions">

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="relative rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-colors"
                            data-testid="notification-btn"
                            aria-label="Notifications"
                            data-tour="notifications"
                        >
                            <Bell className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                            {unreadCount > 0 && (
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 sm:w-96 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-900 mt-2">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Notifications</span>
                            <span className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">
                                {unreadCount > 0 ? `${unreadCount} New` : "No New"}
                            </span>
                        </div>
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                                    No notifications
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    const config = getNotificationConfig(notif.type);
                                    const IconComponent = config.icon;
                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                                            className={cn(
                                                "group/item flex gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer relative pr-7 mb-1.5 last:mb-0 border border-transparent",
                                                notif.is_read
                                                    ? "bg-[#FEFFFA]/60 dark:bg-transparent"
                                                    : "bg-blue-50/20 dark:bg-blue-950/5 border-zinc-100/50 dark:border-zinc-800/50"
                                            )}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteNotification(notif.id, !notif.is_read);
                                                }}
                                                className="absolute right-1.5 top-2.5 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                                aria-label="Dismiss notification"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>

                                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800/60", config.iconColor)}>
                                                <IconComponent className="h-4 w-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <p className={cn(
                                                        "text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate",
                                                        !notif.is_read && "text-blue-600 dark:text-blue-400"
                                                    )}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.is_read && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal break-all">
                                                    {notif.message}
                                                </p>
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 block font-medium">
                                                    {formatActualTime(notif.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Actions */}
                        {(unreadCount > 0 || notifications.length > 0) && (
                            <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                                {unreadCount > 0 ? (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold cursor-pointer flex items-center gap-1 hover:underline transition-all"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        Mark all as read
                                    </button>
                                ) : (
                                    <span />
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 font-semibold cursor-pointer flex items-center gap-1 hover:underline transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Clear all
                                    </button>
                                )}
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings */}
                <button
                    type="button"
                    onClick={onProfileClick}
                    className="hidden sm:block rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-colors cursor-pointer"
                    data-testid="settings-btn"
                    aria-label="Settings"
                    data-tour="settings"
                >
                    <Settings className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                </button>

                {/* User Profile with Dropdown Menu */}
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
                                "absolute bottom-1 right-1 block h-2 w-2 rounded-full ring-2 ring-[#FEFFFA] dark:ring-zinc-900 transition-all duration-300",
                                isWsConnected ? "bg-green-500" : "bg-yellow-500"
                            )} />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        sideOffset={2}
                        className="w-[300px] rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-[#FEFFFA] dark:bg-zinc-900 space-y-3.5 focus:outline-none"
                    >

                        {/* Overall Usage Card Container */}
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
                                    {/* Plan row */}
                                    <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                        <span>Plan</span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {usage?.plan ?? "Core"}
                                        </span>
                                    </div>
                                    {/* Pages */}
                                    <UsageRow
                                        label="Pages"
                                        used={usage?.pages.used}
                                        limit={usage?.pages.limit ?? 500}
                                    />
                                    {/* Simple Interactions */}
                                    <UsageRow
                                        label="Simple Interactions"
                                        used={usage?.simple_interactions.used}
                                        limit={usage?.simple_interactions.limit ?? 350}
                                    />
                                    {/* Complex Interactions */}
                                    <UsageRow
                                        label="Complex Interactions"
                                        used={usage?.complex_interactions.used}
                                        limit={usage?.complex_interactions.limit ?? 100}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Profile Section */}
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

                            {/* Theme Submenu */}
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
                                        className="w-[150px] rounded-lg p-2.5 border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-[#FEFFFA] dark:bg-zinc-900 space-y-0.5 focus:outline-none"
                                    >
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTheme("light");
                                            }}
                                            className={cn(
                                                "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer",
                                                theme === "light" && "bg-[#60646B0D] dark:bg-zinc-800/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Sun className="h-4 w-4 text-zinc-500" />
                                                <span>Light</span>
                                            </div>
                                            {theme === "light" && (
                                                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 shrink-0">
                                                    <Check className="h-2 w-2 stroke-[4] text-white" />
                                                </div>
                                            )}
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTheme("dark");
                                            }}
                                            className={cn(
                                                "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer",
                                                theme === "dark" && "bg-[#60646B0D] dark:bg-zinc-800/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Moon className="h-4 w-4 text-zinc-500" />
                                                <span>Dark</span>
                                            </div>
                                            {theme === "dark" && (
                                                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 shrink-0">
                                                    <Check className="h-2 w-2 stroke-[4] text-white" />
                                                </div>
                                            )}
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTheme("system");
                                            }}
                                            className={cn(
                                                "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer",
                                                theme === "system" && "bg-[#60646B0D] dark:bg-zinc-800/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Settings className="h-4 w-4 text-zinc-500" />
                                                <span>System</span>
                                            </div>
                                            {theme === "system" && (
                                                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 shrink-0">
                                                    <Check className="h-2 w-2 stroke-[4] text-white" />
                                                </div>
                                            )}
                                        </DropdownMenuItem>
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

                            {/* Language Submenu */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger
                                    className="flex items-center px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 data-[state=open]:bg-[#60646B1A] dark:data-[state=open]:bg-zinc-800 cursor-pointer select-none [&_svg]:size-4 [&_svg]:shrink-0"
                                >
                                    <div className="flex items-center gap-2.5 flex-1">
                                        <Languages className="h-4 w-4 text-zinc-500" />
                                        <span className="font-medium">Language</span>
                                    </div>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium text-xs mr-0.5">
                                        English
                                    </span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent
                                        sideOffset={8}
                                        className="w-[180px] rounded-[10px] p-[10px] border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-[#FEFFFA] dark:bg-zinc-900 space-y-0.5 focus:outline-none"
                                    >
                                        <DropdownMenuItem className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 bg-[#60646B0D] dark:bg-zinc-800/40 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <USFlag />
                                                <span className="font-medium">English</span>
                                            </div>
                                            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 shrink-0">
                                                <Check className="h-2 w-2 stroke-[4] text-white" />
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem disabled className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                                            <div className="flex items-center gap-3">
                                                <FrenchFlag />
                                                <span className="font-medium">French</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem disabled className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                                            <div className="flex items-center gap-3">
                                                <JapaneseFlag />
                                                <span className="font-medium">Japanese</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem disabled className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                                            <div className="flex items-center gap-3">
                                                <SpanishFlag />
                                                <span className="font-medium">Spanish</span>
                                            </div>
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

                        {/* Organization Section */}
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

                        {/* Sign Out */}
                        <DropdownMenuItem
                            onClick={() => logout()}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-red-650 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20 focus:bg-red-50/50 dark:focus:bg-red-950/20 cursor-pointer"
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span className="font-medium">Sign Out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
        <ChangePasswordDrawer
            open={changePasswordOpen}
            onOpenChange={setChangePasswordOpen}
        />
        <OrganizationProfileDrawer
            open={organizationProfileOpen}
            onOpenChange={setOrganizationProfileOpen}
        />
    </>);
}