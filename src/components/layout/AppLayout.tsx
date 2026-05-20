import { useState, useEffect, type JSX } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Pencil, MessageSquare, X } from "lucide-react";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout(): JSX.Element {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
    const [searchOpen, setSearchOpen] = useState<boolean>(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Keyboard shortcut to toggle search modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSelectHistoryItem = (label: string) => {
        setSearchOpen(false);
        localStorage.setItem("navigator_pending_history_load", label);
        navigate("/chatnew");
        window.dispatchEvent(new Event("navigator_load_history"));
    };

    // Responsive initial states and resize listeners
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        // Initialize
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Auto-close sidebar on mobile navigation
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, [location]);

    return (
        <div
            className="flex h-dvh w-full overflow-hidden bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative select-none"
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
                    onToggleSidebar={() =>
                        setSidebarOpen((prev) => !prev)
                    }
                />

                <main
                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full flex flex-col min-h-0 min-w-0"
                    data-testid="main-content"
                >
                    <Outlet />
                </main>
            </div>

            {/* Global Search Modal Overlay */}
            {searchOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-955/20 dark:bg-zinc-955/40 backdrop-blur-md transition-opacity duration-300"
                    onClick={() => setSearchOpen(false)}
                    data-testid="global-search-modal"
                >
                    <div 
                        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input Header */}
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
                            <input
                                type="text"
                                placeholder="Search chats.."
                                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 py-1"
                                autoFocus
                            />
                            <button 
                                onClick={() => setSearchOpen(false)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search Items Body */}
                        <div className="p-2 space-y-1 overflow-y-auto max-h-[380px]">
                            {/* New Chat trigger */}
                            <button 
                                onClick={() => {
                                    setSearchOpen(false);
                                    localStorage.setItem("navigator_pending_history_load", "new-chat");
                                    navigate("/chatnew");
                                    window.dispatchEvent(new Event("navigator_load_history"));
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl transition-colors font-semibold"
                            >
                                <Pencil className="h-4 w-4 text-zinc-400" />
                                <span>New Chat</span>
                            </button>

                            {/* Yesterday section */}
                            <div className="pt-2 select-none">
                                <div className="px-3 pb-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Yesterday</div>
                                <div className="space-y-0.5">
                                    {["Privacy Policy", "HR Policy Update", "Work Regularization"].map((label) => (
                                        <button
                                            key={label}
                                            onClick={() => handleSelectHistoryItem(label)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl transition-colors font-medium"
                                        >
                                            <MessageSquare className="h-4 w-4 text-zinc-400" />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Previous 7 Days section */}
                            <div className="pt-2 select-none">
                                <div className="px-3 pb-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Previous 7 Days</div>
                                <div className="space-y-0.5">
                                    {["Holiday List", "Project Requirements"].map((label) => (
                                        <button
                                            key={label}
                                            onClick={() => handleSelectHistoryItem(label)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl transition-colors font-medium"
                                        >
                                            <MessageSquare className="h-4 w-4 text-zinc-400" />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}