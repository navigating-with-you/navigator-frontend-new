import { PanelLeft, Settings } from "lucide-react";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenuDropdown } from "./UserMenuDropdown";

type TopBarProps = {
    onToggleSidebar: () => void;
    onProfileClick: () => void;
};

export default function TopBar({ onToggleSidebar, onProfileClick }: TopBarProps): JSX.Element {
    return (
        <header
            className="flex h-[68px] w-full items-center justify-between border-b border-zinc-200 bg-surface-page dark:bg-zinc-900 dark:border-zinc-800 px-5 shrink-0"
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
                <NotificationsDropdown />

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

                <UserMenuDropdown onProfileClick={onProfileClick} />
            </div>
        </header>
    );
}
