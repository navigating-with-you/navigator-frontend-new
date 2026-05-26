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
    Receipt,
    LogOut,
    ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WebSocketStatus } from "@/components/WebSocketStatus";
import { toast } from "sonner";

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
        const stored = sessionStorage.getItem("navigator_user_profile");
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
                {/* Real-Time WebSocket Status Indicator */}
                <WebSocketStatus />

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
                            className="ml-1 flex items-center justify-center outline-none bg-[#60646B1A] dark:bg-zinc-800/40 p-1 rounded-full cursor-pointer hover:opacity-85 transition-all"
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
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align="end"
                        sideOffset={2}
                        className="w-[300px] rounded-[10px] p-[10px] border border-zinc-200/60 dark:border-zinc-800 shadow-lg bg-[#FEFFFA] dark:bg-zinc-900 space-y-3.5 focus:outline-none"
                    >
                        {/* Overall Usage Card Container */}
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
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                    <span>Plan</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Core</span>
                                </div>
                                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                    <span>Pages</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">180/500</span>
                                </div>
                                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                    <span>Simple Interactions</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">127/350</span>
                                </div>
                                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                                    <span>Complex Interactions</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">63/100</span>
                                </div>
                            </div>
                        </div>

                        {/* Profile Section */}
                        <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2.5 pb-1">
                                Profile
                            </div>
                            
                            <DropdownMenuItem
                                onClick={() => navigate("/profile")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <User className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">My Profile</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => navigate("/subscription")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <CreditCard className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">Subscription</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => toast.info("Language settings coming soon")}
                                className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Languages className="h-4 w-4 text-zinc-500" />
                                    <span className="font-medium">Language</span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => toast.info("About Navigator details")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <Info className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">About</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => toast.info("Password change flow coming soon")}
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
                        <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2.5 pb-1">
                                Organization
                            </div>

                            <DropdownMenuItem
                                onClick={() => toast.info("Organization Details")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <Building2 className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">Organization Details</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => navigate("/billing")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <CreditCard className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">Payment Method</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => navigate("/billing")}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-[#60646B1A] dark:hover:bg-zinc-800 focus:bg-[#60646B1A] dark:focus:bg-zinc-800 cursor-pointer"
                            >
                                <Receipt className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium">Billing</span>
                            </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />

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
    );
}