import { useState, useEffect, useCallback, useRef, type JSX } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Pencil, MessageSquare, X, Search, Loader2, Clock } from "lucide-react";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listConversations, type Conversation } from "@/lib/api";
import OnboardingPage from "@/pages/OnboardingPage";

/** Group conversations into time buckets */
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

    return groups.filter(g => g.items.length > 0);
}

export default function AppLayout(): JSX.Element {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
    const [searchOpen, setSearchOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoadingConvs, setIsLoadingConvs] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { getToken, isAuthenticated } = useKindeAuth();

    const [profile, setProfile] = useState<any>(() => {
        const stored = sessionStorage.getItem("navigator_user_profile");
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(!profile);

    useEffect(() => {
        const handleSync = () => {
            const stored = sessionStorage.getItem("navigator_user_profile");
            if (stored) {
                setProfile(JSON.parse(stored));
                setIsLoadingProfile(false);
            }
        };
        window.addEventListener("navigator_user_synced", handleSync);
        
        // If we already have a profile, turn off loading
        if (profile) {
            setIsLoadingProfile(false);
        }

        // Set a timeout fallback of 5 seconds to stop loading if sync takes too long
        const timer = setTimeout(() => {
            setIsLoadingProfile(false);
        }, 5000);

        return () => {
            window.removeEventListener("navigator_user_synced", handleSync);
            clearTimeout(timer);
        };
    }, [profile]);

    // Keep stable references to avoid re-triggering effects on KindeAuth updates
    const authRef = useRef({ getToken, isAuthenticated });
    useEffect(() => {
        authRef.current = { getToken, isAuthenticated };
    }, [getToken, isAuthenticated]);

    // ── Fetch conversations for the search modal ────────────────────────────────
    const fetchConversations = useCallback(async (showLoading = true) => {
        const { getToken: currentGetToken, isAuthenticated: currentIsAuthenticated } = authRef.current;
        if (!currentIsAuthenticated) return;
        try {
            if (showLoading) {
                setIsLoadingConvs(true);
            }
            const token = await currentGetToken();
            if (!token) return;
            const data = await listConversations(token, 100, 0);
            setConversations(data.conversations || []);
        } catch (err) {
            // Silent fail — not critical for layout rendering
            console.warn("Could not load conversations for search:", err);
            setConversations([]);
        } finally {
            if (showLoading) {
                setIsLoadingConvs(false);
            }
        }
    }, []);

    // Load conversations when search opens, and refresh after new conversation events
    useEffect(() => {
        if (searchOpen) fetchConversations(true);
    }, [searchOpen, fetchConversations]);

    useEffect(() => {
        const handleNewConv = () => fetchConversations(false);
        window.addEventListener("navigator_conversation_created", handleNewConv);
        return () => window.removeEventListener("navigator_conversation_created", handleNewConv);
    }, [fetchConversations]);

    // ── Keyboard shortcut ──────────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
            if (e.key === "Escape" && searchOpen) {
                setSearchOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchOpen]);

    // ── Tour controls ──────────────────────────────────────────────────────────
    useEffect(() => {
        const handleOpen = () => setSearchOpen(true);
        const handleClose = () => setSearchOpen(false);
        window.addEventListener("navigator_open_search", handleOpen);
        window.addEventListener("navigator_close_search", handleClose);
        return () => {
            window.removeEventListener("navigator_open_search", handleOpen);
            window.removeEventListener("navigator_close_search", handleClose);
        };
    }, []);

    // ── Navigate into a conversation ───────────────────────────────────────────
    const handleSelectConversation = (conv: Conversation) => {
        setSearchOpen(false);
        setSearchQuery("");
        navigate(`/chat/${conv.id}`);
    };

    // ── Responsive sidebar ─────────────────────────────────────────────────────
    useEffect(() => {
        const handleResize = () => {
            setSidebarOpen(window.innerWidth >= 1024);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (window.innerWidth < 1024) setSidebarOpen(false);
    }, [location]);

    // ── Derived: filtered + grouped conversations ──────────────────────────────
    const filtered = conversations.filter(c =>
        !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const groups = groupByTime(filtered);
    const hasResults = filtered.length > 0;

    if (isLoadingProfile) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-zinc-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!profile?.organization_id) {
        return (
            <OnboardingPage 
                onComplete={(newOrgId) => {
                    const updated = { ...profile, organization_id: newOrgId };
                    setProfile(updated);
                    sessionStorage.setItem("navigator_user_profile", JSON.stringify(updated));
                    window.dispatchEvent(new Event("navigator_conversation_created"));
                    navigate("/dashboard", { replace: true });
                }} 
            />
        );
    }

    return (
        <div
            className="flex h-dvh w-full overflow-hidden bg-[#FEFFFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative select-none"
            data-testid="app-layout"
        >
            {/* Sidebar mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
                />
            )}

            <Sidebar 
                open={sidebarOpen} 
                onSearchClick={() => setSearchOpen(true)}
            />

            <div className="flex flex-1 flex-col overflow-hidden w-full min-w-0">
                <TopBar
                    onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
                />

                <main
                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full flex flex-col min-h-0 min-w-0"
                    data-testid="main-content"
                >
                    <Outlet />
                </main>
            </div>

            {/* ── Global Search Modal ── */}
            {searchOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-955/20 dark:bg-zinc-955/40 backdrop-blur-md transition-opacity duration-300"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    data-testid="global-search-modal"
                >
                    <div
                        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4"
                        onClick={(e) => e.stopPropagation()}
                        data-tour="search-modal"
                    >
                        {/* Search Input Header */}
                        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
                            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 py-1"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search Items Body */}
                        <div className="p-2 space-y-1 overflow-y-auto max-h-[420px]">
                            {/* New Chat trigger — always visible */}
                            <button
                                onClick={() => {
                                    setSearchOpen(false);
                                    setSearchQuery("");
                                    navigate("/chat");
                                    window.dispatchEvent(new Event("navigator_load_history"));
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl transition-colors font-semibold"
                            >
                                <Pencil className="h-4 w-4 text-zinc-400" />
                                <span>New Chat</span>
                            </button>

                            {/* Loading state */}
                            {isLoadingConvs && (
                                <div className="flex items-center justify-center py-8 gap-2 text-zinc-400 text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Loading conversations...</span>
                                </div>
                            )}

                            {/* Empty state — no conversations at all */}
                            {!isLoadingConvs && conversations.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <MessageSquare className="h-8 w-8 text-zinc-200 mb-3" />
                                    <p className="text-sm font-medium text-zinc-400">No conversations yet</p>
                                    <p className="text-xs text-zinc-400 mt-1">Start a new chat to get going</p>
                                </div>
                            )}

                            {/* No results for query */}
                            {!isLoadingConvs && conversations.length > 0 && !hasResults && searchQuery && (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Search className="h-7 w-7 text-zinc-200 mb-3" />
                                    <p className="text-sm font-medium text-zinc-400">
                                        No results for <span className="text-zinc-600">"{searchQuery}"</span>
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">Try a different search term</p>
                                </div>
                            )}

                            {/* Grouped results */}
                            {!isLoadingConvs && groups.map((group) => (
                                <div key={group.label} className="pt-2 select-none">
                                    <div className="flex items-center gap-1.5 px-3 pb-1.5">
                                        <Clock className="h-3 w-3 text-zinc-400" />
                                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                            {group.label}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {group.items.map((conv) => (
                                            <button
                                                key={conv.id}
                                                onClick={() => handleSelectConversation(conv)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl transition-colors"
                                            >
                                                <MessageSquare className="h-4 w-4 text-zinc-400 shrink-0" />
                                                <span className="flex-1 truncate font-medium">{conv.title}</span>
                                                {conv.message_count > 0 && (
                                                    <span className="text-[10px] text-zinc-400 shrink-0">
                                                        {conv.message_count} msg{conv.message_count !== 1 ? "s" : ""}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">
                                {conversations.length > 0
                                    ? `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`
                                    : "No history"}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                                <kbd className="px-1 py-0.5 bg-zinc-100 rounded text-[9px] font-mono">Esc</kbd> to close
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}