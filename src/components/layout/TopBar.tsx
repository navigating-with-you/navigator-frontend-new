import {
    PanelLeft,
    Bell,
    Settings,
    Sun,
    Moon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";


type TopBarProps = {
    onToggleSidebar: () => void;
};

export default function TopBar({
    onToggleSidebar,
}: TopBarProps): JSX.Element {
    const { logout, user, isLoading } = useKindeAuth();
    const [profile, setProfile] = useState<any>(null);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();


    useEffect(() => {
        const stored = localStorage.getItem("navigator_user_profile");
        if (stored) {
            try {
                setProfile(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse stored profile", e);
            }
        }
    }, [user]);

    const fullName = profile?.display_name || (user?.givenName ? `${user.givenName} ${user.familyName || ""}`.trim() : (isLoading ? "Loading..." : "User"));
    const initials = fullName
        ? fullName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
        : "U";

    return (
        <header
            className="flex h-[68px] w-full items-center justify-between border-b border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 px-5 shrink-0"
            data-testid="topbar"
        >
            <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                data-testid="toggle-sidebar-btn"
                aria-label="Toggle sidebar"
            >
                <PanelLeft className="h-5 w-5 text-zinc-700" />
            </Button>

            <div className="flex items-center gap-3" data-tour="topbar-actions">
                {/* Theme Toggle */}
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-colors"
                                data-testid="theme-toggle-btn"
                                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                                data-tour="theme-toggle"
                            >
                                {theme === "light" ? (
                                    <Moon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                                ) : (
                                    <Sun className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            {theme === "light" ? "Dark mode" : "Light mode"}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="relative rounded-full p-2 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                            data-testid="notification-btn"
                            aria-label="Notifications"
                            data-tour="notifications"
                        >
                            <Bell className="h-5 w-5 text-zinc-700" />
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-2 rounded-xl border border-zinc-100 shadow-xl bg-white mt-2">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 mb-1">
                            <span className="text-sm font-semibold text-zinc-900">Notifications</span>
                            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">2 New</span>
                        </div>
                        <div className="space-y-1">
                            <div className="p-2.5 rounded-lg hover:bg-zinc-50 transition-colors">
                                <p className="text-xs font-semibold text-zinc-900">Usage Limit Alert</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Your complex tasks usage reached 84% of your plan limit.</p>
                                <span className="text-[10px] text-zinc-400 mt-1 block">10m ago</span>
                            </div>
                            <div className="p-2.5 rounded-lg hover:bg-zinc-50 transition-colors">
                                <p className="text-xs font-semibold text-zinc-900">Knowledge Base Updated</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Oliver Roberts uploaded 3 new policy documents.</p>
                                <span className="text-[10px] text-zinc-400 mt-1 block">2h ago</span>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings */}
                <button
                    type="button"
                    onClick={() => navigate("/billing")}
                    className="rounded-full p-2 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200 cursor-pointer"
                    data-testid="settings-btn"
                    aria-label="Settings"
                    data-tour="settings"
                >
                    <Settings className="h-5 w-5 text-zinc-700" />
                </button>

                {/* User Profile with Dropdown Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="ml-1 flex items-center gap-2.5 outline-none hover:opacity-85 transition-opacity rounded-full p-0.5 cursor-pointer"
                            data-testid="user-profile"
                            data-tour="profile"
                        >
                            <Avatar className="h-9 w-9">
                                {user?.picture ? (
                                    <AvatarImage
                                        src={user.picture}
                                        alt={fullName}
                                    />
                                ) : null}

                                <AvatarFallback className="bg-zinc-100 text-zinc-800 font-semibold text-sm">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="hidden sm:inline text-sm font-medium text-zinc-900 pr-1.5 max-w-[120px] lg:max-w-[180px] truncate text-left">
                                            {fullName}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs bg-zinc-900 text-white">
                                        {fullName}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl p-1.5 border border-zinc-100 shadow-lg bg-white">
                        <DropdownMenuLabel className="font-normal px-2.5 py-2">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-zinc-900">
                                    {fullName}
                                </p>
                                <p className="text-xs leading-none text-zinc-500 truncate">
                                    {user?.email || ""}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-zinc-100 my-1.5" />

                        <DropdownMenuItem 
                            onClick={() => logout()}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50/50 rounded-lg cursor-pointer px-2.5 py-2 text-sm"
                        >
                            <svg 
                                className="mr-2 h-4 w-4 inline-block" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}