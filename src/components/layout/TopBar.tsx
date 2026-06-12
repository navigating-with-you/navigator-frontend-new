import { PanelLeft } from "lucide-react";
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

            <div className="flex items-center gap-2">
                <span data-tour="tour-notifications">
                    <NotificationsDropdown />
                </span>
                <span data-tour="tour-user-menu">
                    <UserMenuDropdown onProfileClick={onProfileClick} />
                </span>
            </div>
        </header>
    );
}
