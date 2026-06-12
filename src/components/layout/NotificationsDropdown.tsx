import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Check, Trash2, UserPlus, UserMinus, FileUp, FileMinus, Shield } from "lucide-react";
import { toast } from "sonner";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useUserProfile } from "@/contexts/UserContext";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    type NotificationItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cacheWebSocket } from "@/utils/cacheWebSocket";

function formatActualTime(dateString: string): string {
    try {
        let formattedString = dateString;
        const hasTimezone = dateString.endsWith("Z") ||
                            /\+\d{2}:?\d{2}$/.test(dateString) ||
                            /-\d{2}:?\d{2}$/.test(dateString);
        if (!hasTimezone) {
            formattedString = `${dateString}Z`;
        }
        const date = new Date(formattedString);
        const now = new Date();
        const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
        const timeStr = date.toLocaleTimeString([], timeOptions);
        if (date.toDateString() === now.toDateString()) return `Today, ${timeStr}`;
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;
        const dateOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        return `${date.toLocaleDateString([], dateOptions)}, ${timeStr}`;
    } catch {
        return "";
    }
}

function getNotificationConfig(type: string) {
    switch (type) {
        case "team_added":    return { icon: UserPlus,  iconColor: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",     borderColor: "border-l-blue-500" };
        case "team_removed":  return { icon: UserMinus, iconColor: "text-orange-650 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40", borderColor: "border-l-orange-500" };
        case "role_updated":  return { icon: Shield,    iconColor: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40", borderColor: "border-l-purple-500" };
        case "file_uploaded": return { icon: FileUp,    iconColor: "text-green-650 dark:text-green-400 bg-green-50 dark:bg-green-950/40",   borderColor: "border-l-green-500" };
        case "file_removed":  return { icon: FileMinus, iconColor: "text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/40",           borderColor: "border-l-red-500" };
        default:              return { icon: Bell,      iconColor: "text-zinc-650 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800",           borderColor: "border-l-zinc-300 dark:border-l-zinc-700" };
    }
}

export function NotificationsDropdown() {
    const { getToken } = useKindeAuth();
    const { userProfile: profile } = useUserProfile();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    // Stable ref so fetchNotifications never needs getToken or profile in its deps.
    const getTokenRef = useRef(getToken);
    useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

    const profileIdRef = useRef(profile?.id);
    useEffect(() => { profileIdRef.current = profile?.id; }, [profile?.id]);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = await getTokenRef.current();
            if (token) {
                const res = await getNotifications(token);
                setNotifications(res.notifications || []);
                setUnreadCount(res.unread_count || 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, []); // truly stable — deps accessed via refs

    useEffect(() => {
        fetchNotifications();

        let pollingInterval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (!pollingInterval) pollingInterval = setInterval(fetchNotifications, 30000);
        };
        const stopPolling = () => {
            if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
        };
        const handleNotificationCreated = (event: any) => {
            if (profileIdRef.current && event.resource_id === profileIdRef.current) {
                fetchNotifications();
            }
        };

        // Poll only when WebSocket is disconnected; stop when it reconnects.
        cacheWebSocket.on("ws:connected", stopPolling);
        cacheWebSocket.on("ws:disconnected", startPolling);
        cacheWebSocket.on("notification:created", handleNotificationCreated);

        if (!cacheWebSocket.isConnected()) startPolling();

        return () => {
            stopPolling();
            cacheWebSocket.off("ws:connected", stopPolling);
            cacheWebSocket.off("ws:disconnected", startPolling);
            cacheWebSocket.off("notification:created", handleNotificationCreated);
        };
    }, []); // mount only — all state accessed via stable refs or stable callbacks

    const handleMarkAsRead = async (notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        try {
            const token = await getToken();
            if (token) await markNotificationRead(notificationId, token);
        } catch {
            fetchNotifications();
        }
    };

    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        try {
            const token = await getToken();
            if (token) {
                await markAllNotificationsRead(token);
                toast.success("All notifications marked as read");
            }
        } catch {
            fetchNotifications();
        }
    };

    const handleDeleteNotification = async (notificationId: string, isUnread: boolean) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (isUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        try {
            const token = await getToken();
            if (token) await deleteNotification(notificationId, token);
        } catch {
            fetchNotifications();
        }
    };

    const handleClearAll = async () => {
        setNotifications([]);
        setUnreadCount(0);
        try {
            const token = await getToken();
            if (token) {
                await clearAllNotifications(token);
                toast.success("All notifications cleared");
            }
        } catch {
            fetchNotifications();
        }
    };

    return (
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
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
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
                                <button
                                    key={notif.id}
                                    type="button"
                                    onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                                    aria-label={notif.is_read ? notif.title : `Mark as read: ${notif.title}`}
                                    className={cn(
                                        "w-full text-left group/item flex gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer relative pr-7 mb-1.5 last:mb-0 border border-transparent",
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
                                </button>
                            );
                        })
                    )}
                </div>

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
    );
}
