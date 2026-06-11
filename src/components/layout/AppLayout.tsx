import { useState, useEffect, useCallback, useRef, type JSX, lazy, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Pencil, MessageSquare, X, Search, Loader2, Clock } from "lucide-react";

const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listConversations, type Conversation } from "@/lib/api";
import OnboardingPage from "@/pages/OnboardingPage";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/contexts/UserContext";

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

function OnboardingSkeleton({ loadingTime }: { loadingTime: number }) {
    return (
        <div className="min-h-screen w-full flex flex-col bg-[#FEFFFA] dark:bg-zinc-950 transition-colors duration-300 relative select-none">
            {/* Header / Top Bar Skeleton */}
            <header className="w-full border-b border-zinc-100 dark:border-zinc-800/80 bg-[#FEFFFA] dark:bg-zinc-950 px-4 sm:px-6 md:px-12 py-4 shrink-0">
                <div className="w-full max-w-7xl mx-auto flex items-center justify-between animate-pulse">
                    {/* Logo placeholder */}
                    <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                    
                    {/* Controls & Profile placeholder */}
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                            <div className="hidden sm:block h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Container Skeleton */}
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10 md:py-12 flex-1 flex flex-col justify-start">
                <div className="w-full space-y-8 animate-pulse">
                    {/* Warning banner when loading is slow */}
                    {loadingTime >= 8 && (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5 font-medium shadow-sm transition-all duration-305">
                            <Clock className="h-4 w-4 shrink-0 text-amber-500 animate-spin" />
                            <span>This is taking longer than expected. Please wait while we establish a secure connection...</span>
                        </div>
                    )}

                    {/* Progress Indicator Skeleton */}
                    <div className="w-full">
                        <div className="w-full bg-zinc-150 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-3">
                            <div className="bg-zinc-250 dark:bg-zinc-700 h-full w-[100%] rounded-full" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        </div>
                    </div>

                    {/* Heading Section */}
                    <div className="space-y-3">
                        <div className="h-8 w-72 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                        <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                    </div>

                    {/* Logo Upload Section Skeleton */}
                    <div className="space-y-2">
                        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900">
                            <div className="h-24 w-24 rounded-2xl bg-zinc-150 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0" />
                            <div className="space-y-3 text-center sm:text-left flex-1">
                                <div className="h-3 w-64 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto sm:mx-0" />
                                <div className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto sm:mx-0" />
                            </div>
                        </div>
                    </div>

                    {/* Fields Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Array.from({ length: 8 }).map((_, idx) => (
                            <div key={idx} className="space-y-2 animate-pulse">
                                <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-11 w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg" />
                            </div>
                        ))}
                    </div>

                    {/* Navigation Row Skeleton */}
                    <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="h-11 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function AppLayout(): JSX.Element {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
    const [searchOpen, setSearchOpen] = useState<boolean>(false);
    const [profileOpen, setProfileOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoadingConvs, setIsLoadingConvs] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { getToken, isAuthenticated, logout } = useKindeAuth();

    const { userProfile: profile, updateUserProfile } = useUserProfile();
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [loadingTime, setLoadingTime] = useState<number>(0);
    const [hasError, setHasError] = useState<boolean>(false);
    const [retryCount, setRetryCount] = useState<number>(0);

    useEffect(() => {
        if (profile) {
            setIsLoadingProfile(false);
            setHasError(false);
            setRetryCount(0);
        }
    }, [profile]);

    useEffect(() => {
        const handleSyncFailed = () => {
            setIsLoadingProfile(false);
            setHasError(true);
            setRetryCount((prev) => prev + 1);
        };
        window.addEventListener("navigator_user_sync_failed", handleSyncFailed);
        return () => window.removeEventListener("navigator_user_sync_failed", handleSyncFailed);
    }, []);

    // Timer logic to track loading duration and trip the error after 15s timeout
    useEffect(() => {
        let interval: any;
        if (isLoadingProfile && !profile) {
            interval = setInterval(() => {
                setLoadingTime((t) => {
                    const nextTime = t + 1;
                    if (nextTime >= 15) {
                        setHasError(true);
                        setIsLoadingProfile(false);
                        setRetryCount((prev) => prev + 1);
                        clearInterval(interval);
                    }
                    return nextTime;
                });
            }, 1000);
        } else {
            setLoadingTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoadingProfile, profile]);

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

    // 1. Loading state (waiting for profile sync to finish)
    if (isLoadingProfile && !profile) {
        return <OnboardingSkeleton loadingTime={loadingTime} />;
    }

    // 2. Error state (loading completed/failed/timed out but profile is still null)
    if (hasError || (!isLoadingProfile && !profile)) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#FEFFFA] dark:bg-zinc-950 px-4 text-center select-none animate-fade-in">
                <div className="max-w-md space-y-6">
                    <div className="flex justify-center">
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 rounded-full text-red-500">
                            <svg className="h-10 w-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-display">We couldn't connect to the server</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            We had trouble retrieving your organization details. Please check your internet connection or server status and try again.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                        <button
                            onClick={() => {
                                setHasError(false);
                                setIsLoadingProfile(true);
                                setLoadingTime(0);
                                window.dispatchEvent(new Event("navigator_retry_sync"));
                            }}
                            className="h-10 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                            Retry Connection
                        </button>
                        <button
                            onClick={() => logout()}
                            className="h-10 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                    {retryCount >= 2 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 animate-fade-in">
                            Connection still failing? Try again later or contact our{" "}
                            <a href="mailto:support@navigator.ai" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                                Support Team
                            </a>.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (!profile.organization_id) {
        return (
            <OnboardingPage 
                onComplete={(newOrgId) => {
                    updateUserProfile({ organization_id: newOrgId });
                    window.dispatchEvent(new Event("navigator_conversation_created"));
                    navigate("/dashboard", { replace: true });
                }} 
            />
        );
    }

    return (
        <div className="w-full bg-[#FEFFFA] dark:bg-zinc-950 flex justify-center">
            <div
                className="flex h-dvh w-full overflow-hidden bg-[#FEFFFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative select-none"
                data-testid="app-layout"
            >
            {/* Sidebar mobile overlay backdrop */}
            <div
                onClick={() => setSidebarOpen(false)}
                className={cn(
                    "fixed inset-0 bg-zinc-950/45 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300",
                    sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />

            <Sidebar 
                open={sidebarOpen} 
                onClose={() => setSidebarOpen(false)}
                onSearchClick={() => setSearchOpen(true)}
            />

            <div className="flex flex-1 flex-col overflow-hidden w-full min-w-0">
                <TopBar
                    onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
                    onProfileClick={() => setProfileOpen(true)}
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
            
            {/* Profile Drawer Overlay */}
            {profileOpen && (
                <Suspense fallback={null}>
                    <ProfilePage onClose={() => setProfileOpen(false)} />
                </Suspense>
            )}
            </div>
        </div>
    );
}