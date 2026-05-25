import { NavLink, useNavigate, useParams } from "react-router-dom";
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
    MessageSquare,
    Loader2,
    Trash2,
    Pencil,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import type { JSX } from "react";
import { toast } from "sonner";
import { useEffect, useState, useCallback, useRef } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listConversations, deleteConversation, updateConversation, type Conversation } from "@/lib/api";

type NavItemType = {
    to: string;
    label: string;
    icon: LucideIcon;
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
    { to: "chat", label: "New Chat", icon: PenSquare },
    { to: "chatsearch", label: "Search Chats", icon: Search },
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

function groupByTime(conversations: Conversation[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

    const groups: { label: string; items: Conversation[] }[] = [
        { label: "Today", items: [] },
        { label: "Yesterday", items: [] },
        { label: "Previous 7 Days", items: [] },
        { label: "Previous 30 Days", items: [] },
        { label: "Older", items: [] },
    ];

    for (const conv of conversations) {
        const date = new Date(conv.updated_at || conv.created_at);
        if (date >= today) {
            groups[0].items.push(conv);
        } else if (date >= yesterday) {
            groups[1].items.push(conv);
        } else if (date >= sevenDaysAgo) {
            groups[2].items.push(conv);
        } else if (date >= thirtyDaysAgo) {
            groups[3].items.push(conv);
        } else {
            groups[4].items.push(conv);
        }
    }

    // Sort each group by date (newest first)
    groups.forEach(group => {
        group.items.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.updated_at || b.created_at).getTime();
            return dateB - dateA; // Newest first
        });
    });

    return groups.filter(g => g.items.length > 0);
}

/** Compact chat history list for the expanded sidebar */
function ChatHistoryList({ onConversationDeleted }: { onConversationDeleted?: () => void }) {
    const { getToken, isAuthenticated } = useKindeAuth();
    const navigate = useNavigate();
    const { id: activeId } = useParams<{ id: string }>();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    // Keep stable references to avoid re-triggering effects on KindeAuth updates
    const authRef = useRef({ getToken, isAuthenticated });
    useEffect(() => {
        authRef.current = { getToken, isAuthenticated };
    }, [getToken, isAuthenticated]);

    const fetchConversations = useCallback(async (showLoading = true) => {
        const { getToken: currentGetToken, isAuthenticated: currentIsAuthenticated } = authRef.current;
        if (!currentIsAuthenticated) return;
        try {
            if (showLoading) {
                setIsLoading(true);
            }
            const token = await currentGetToken();
            if (!token) return;
            const data = await listConversations(token, 40, 0);
            setConversations(data.conversations || []);
        } catch (err: any) {
            // Silently fail — user may not have any conversations or backend may be unavailable
            console.warn("Could not load chat history:", err.message);
            setConversations([]);
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations(true);
        }
    }, [isAuthenticated, fetchConversations]);

    // Listen for new messages so history updates after a chat
    useEffect(() => {
        const handleNewConversation = () => fetchConversations(false);
        window.addEventListener("navigator_conversation_created", handleNewConversation);
        return () => window.removeEventListener("navigator_conversation_created", handleNewConversation);
    }, [fetchConversations]);

    const handleOpenConversation = (conv: Conversation) => {
        navigate(`/chat/${conv.id}`);
    };

    const handleDeleteClick = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        setConversationToDelete(conv);
    };

    const handleConfirmDelete = async () => {
        if (!conversationToDelete) return;
        const convId = conversationToDelete.id;
        try {
            setDeletingId(convId);
            const token = await getToken();
            if (!token) return;
            await deleteConversation(convId, token);
            setConversations(prev => prev.filter(c => c.id !== convId));
            toast.success("Conversation deleted");
            
            // Dispatch custom event to notify active views of the deletion
            window.dispatchEvent(new CustomEvent("navigator_conversation_deleted", { detail: { id: convId } }));
            
            onConversationDeleted?.();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete conversation");
        } finally {
            setDeletingId(null);
            setConversationToDelete(null);
        }
    };

    const handleStartRename = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditTitle(conv.title);
    };

    const handleSaveRename = async (convId: string) => {
        if (!editTitle.slice().trim()) {
            setEditingId(null);
            return;
        }

        const conv = conversations.find(c => c.id === convId);
        if (conv && conv.title === editTitle.trim()) {
            setEditingId(null);
            return;
        }

        try {
            const token = await getToken();
            if (!token) return;

            // Optimistic UI update
            setConversations(prev =>
                prev.map(c => (c.id === convId ? { ...c, title: editTitle.trim() } : c))
            );
            setEditingId(null);

            await updateConversation(convId, { title: editTitle.trim() }, token);
            toast.success("Conversation renamed");

            // Dispatch event to notify other components (e.g. search modal)
            window.dispatchEvent(new Event("navigator_conversation_created"));
        } catch (err: any) {
            toast.error(err.message || "Failed to rename conversation");
            // Revert back on error
            if (conv) {
                setConversations(prev =>
                    prev.map(c => (c.id === convId ? { ...c, title: conv.title } : c))
                );
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="px-3 py-3 text-xs text-zinc-400 text-center">
                No conversations yet
            </div>
        );
    }

    const groups = groupByTime(conversations);

    return (
        <div className="space-y-4 select-none">
            {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                    <div className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                        {group.label}
                    </div>
                    {group.items.map((conv) => {
                        const isActive = activeId === conv.id;
                        const isEditing = editingId === conv.id;
                        return (
                            <div
                                key={conv.id}
                                onClick={() => !isEditing && handleOpenConversation(conv)}
                                data-testid={`chat-history-${conv.id}`}
                                className={cn(
                                    "group w-full flex items-center gap-2 py-2 pr-2 text-left text-sm transition-all cursor-pointer shrink-0 relative border-l-2 pl-3",
                                    isActive
                                        ? "bg-blue-50/60 text-blue-600 dark:bg-blue-950/15 dark:text-blue-400 font-semibold border-blue-600 dark:border-blue-500 rounded-r-lg"
                                        : "text-zinc-655 hover:bg-zinc-100/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 border-transparent rounded-lg"
                                )}
                            >
                                <MessageSquare
                                    className={cn(
                                        "h-3.5 w-3.5 shrink-0 transition-colors",
                                        isActive
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400"
                                    )}
                                />
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleSaveRename(conv.id);
                                            } else if (e.key === "Escape") {
                                                setEditingId(null);
                                            }
                                        }}
                                        onBlur={() => handleSaveRename(conv.id)}
                                        className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <>
                                        <span className="flex-1 truncate text-xs">{conv.title}</span>
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 ml-auto transition-opacity duration-150">
                                            <button
                                                type="button"
                                                onClick={(e) => handleStartRename(e, conv)}
                                                className="p-0.5 rounded text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                                aria-label="Rename conversation"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteClick(e, conv)}
                                                disabled={deletingId === conv.id}
                                                className="p-0.5 rounded text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                                aria-label="Delete conversation"
                                            >
                                                {deletingId === conv.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}

            <Dialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
                <DialogContent className="sm:max-w-[420px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Delete Chat</DialogTitle>
                        <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Are you sure you want to delete this conversation? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConversationToDelete(null)}
                            disabled={deletingId !== null}
                            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-750 dark:text-zinc-300 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={deletingId !== null}
                            className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer border-none flex items-center justify-center min-w-[76px]"
                        >
                            {deletingId !== null ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
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
                        <div className="w-8 border-t border-zinc-200 my-2" />                        {/* Chat Label */}
                        <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest mb-1 select-none">Chat</span>

                        {/* Chat Nav */}
                        {chatNav.map((item) => (
                            <TooltipProvider key={item.to} delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {item.to === "chatsearch" ? (
                                            <button
                                                type="button"
                                                onClick={onSearchClick}
                                                data-testid="nav-search-chats"
                                                className="mx-auto flex items-center justify-center h-10 w-10 rounded-xl transition-all text-zinc-550 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                                            >
                                                <item.icon className="h-[18px] w-[18px]" />
                                            </button>
                                        ) : (
                                            <NavLink
                                                to={item.to}
                                                end
                                                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                                                className={({ isActive }) =>
                                                    cn(
                                                        "mx-auto flex items-center justify-center h-10 w-10 rounded-xl transition-all",
                                                        isActive
                                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                                                            : "text-zinc-550 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100"
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
            <NavLink to="/dashboard" className="flex items-center px-5 py-4 shrink-0">
                <img
                    src="/navigator-logo.svg"
                    alt="Navigator"
                    className="h-7 w-auto object-contain block dark:brightness-110"
                />
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
            <div className="px-5 pb-1 pt-1 text-[11px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest shrink-0 select-none">
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
                                data-testid="nav-search-chats"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer text-left w-full"
                            >
                                <div className="flex h-5 w-5 items-center justify-center shrink-0">
                                    <item.icon className="h-[18px] w-[18px] text-zinc-500 dark:text-zinc-400" />
                                </div>
                                <span>{item.label}</span>
                            </button>
                        );
                    }
                    // For "New Chat" link, add 'end' prop to only highlight on exact /chat match
                    if (item.to === "chat") {
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end
                                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
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
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <span>{item.label}</span>
                            </NavLink>
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

            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-1 hover-scrollbar min-h-0">
                <ChatHistoryList />
            </div>

            {/* Usage Card & Upgrade */}
            <div className="shrink-0 mt-2 px-3 pb-4 border-t border-zinc-100 pt-3 bg-white">
                <UsageCardContent navigate={navigate} compact />
            </div>
        </aside>
    );
}